#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, xdr::ToXdr, Address,
    Bytes, BytesN, Env, Symbol, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NonPositiveAmount = 3,
    ExceedsPerTxCap = 4,
    DailyTreasuryCap = 5,
    DailyRecipientCap = 6,
    InsufficientBalance = 7,
    RewardIndexOutOfRange = 8,
    AttestorNotSet = 9,
    VoucherExpired = 10,
    ClaimAlreadyUsed = 11,
    InvalidSignature = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryState {
    pub admin: Address,
    pub token: Address,
    pub total_disbursed: i128,
}

/// A single durable reward record kept in contract storage — the read-only,
/// on-chain ledger of every payout this treasury has made. The transaction
/// hash itself is NOT stored here (a contract cannot observe its own tx hash
/// during execution); the frontend attaches it by matching this record's
/// (ledger, recipient, amount) against the "reward.sent" event log.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardRecord {
    pub recipient: Address,
    pub amount: i128,
    pub activity: Symbol,
    pub ledger: u32,
    pub timestamp: u64,
}

/// Day-bucketed spend counter (UTC day = timestamp / 86400).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DailyBucket {
    pub day: u64,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum CapKey {
    TreasuryDay,
    RecipientDay(Address),
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    State,
    Attestor,
    History,
    Claim(BytesN<32>),
}

/// Hard ceiling on any single reward payout, in stroops (20 XLM).
const MAX_REWARD_PER_TX: i128 = 200_000_000;

/// Max treasury disbursement per UTC day, in stroops (100 XLM).
const MAX_DAILY_TREASURY: i128 = 1_000_000_000;

/// Max payout to one recipient per UTC day, in stroops (20 XLM).
const MAX_DAILY_PER_RECIPIENT: i128 = 200_000_000;

/// Bounded on-chain history ring (oldest dropped). Events remain the long-term log.
const MAX_HISTORY_LEN: u32 = 500;

const SECONDS_PER_DAY: u64 = 86_400;

/// Domain-separated voucher prefix shared with the TypeScript attestor.
const VOUCHER_PREFIX: &[u8] = b"achievo-voucher-v1|";

fn bump_instance(env: &Env) {
    env.storage().instance().extend_ttl(100, 535_679);
}

fn current_day(env: &Env) -> u64 {
    env.ledger().timestamp() / SECONDS_PER_DAY
}

fn load_bucket(env: &Env, key: &CapKey) -> DailyBucket {
    let day = current_day(env);
    let stored: Option<DailyBucket> = match key {
        CapKey::TreasuryDay => env.storage().instance().get(key),
        CapKey::RecipientDay(_) => env.storage().persistent().get(key),
    };
    match stored {
        Some(b) if b.day == day => b,
        _ => DailyBucket { day, amount: 0 },
    }
}

fn store_bucket(env: &Env, key: &CapKey, bucket: &DailyBucket) {
    match key {
        CapKey::TreasuryDay => {
            env.storage().instance().set(key, bucket);
        }
        CapKey::RecipientDay(_) => {
            env.storage().persistent().set(key, bucket);
            env.storage()
                .persistent()
                .extend_ttl(key, 100, 535_679); // ~31 days
        }
    }
}

fn load_state(env: &Env) -> TreasuryState {
    env.storage()
        .instance()
        .get(&DataKey::State)
        .unwrap_or_else(|| panic!("{:?}", Error::NotInitialized))
}

fn append_u64_be(msg: &mut Bytes, value: u64) {
    msg.extend_from_slice(&value.to_be_bytes());
}

fn append_i128_be(msg: &mut Bytes, value: i128) {
    msg.extend_from_slice(&value.to_be_bytes());
}

/// Canonical voucher bytes signed by the attestor (must match API minting).
///
/// Format (binary):
/// `achievo-voucher-v1|` + contract_xdr + `|` + recipient_xdr + `|` + amount_be16
/// + `|` + activity_symbol_xdr + `|` + claim_id32 + `|` + expiry_be8
pub(crate) fn voucher_message(
    env: &Env,
    contract: &Address,
    recipient: &Address,
    amount: i128,
    activity: &Symbol,
    claim_id: &BytesN<32>,
    expiry: u64,
) -> Bytes {
    let mut msg = Bytes::new(env);
    msg.extend_from_slice(VOUCHER_PREFIX);
    msg.append(&contract.to_xdr(env));
    msg.extend_from_slice(b"|");
    msg.append(&recipient.to_xdr(env));
    msg.extend_from_slice(b"|");
    append_i128_be(&mut msg, amount);
    msg.extend_from_slice(b"|");
    msg.append(&activity.to_xdr(env));
    msg.extend_from_slice(b"|");
    msg.append(&claim_id.clone().into());
    msg.extend_from_slice(b"|");
    append_u64_be(&mut msg, expiry);
    msg
}

fn disburse(env: &Env, recipient: Address, amount: i128, activity: Symbol) {
    let mut state = load_state(env);

    if amount <= 0 {
        panic!("{:?}", Error::NonPositiveAmount);
    }
    if amount > MAX_REWARD_PER_TX {
        panic!("{:?}", Error::ExceedsPerTxCap);
    }

    let treasury_key = CapKey::TreasuryDay;
    let mut treasury_day = load_bucket(env, &treasury_key);
    if treasury_day.amount + amount > MAX_DAILY_TREASURY {
        panic!("{:?}", Error::DailyTreasuryCap);
    }

    let recipient_key = CapKey::RecipientDay(recipient.clone());
    let mut recipient_day = load_bucket(env, &recipient_key);
    if recipient_day.amount + amount > MAX_DAILY_PER_RECIPIENT {
        panic!("{:?}", Error::DailyRecipientCap);
    }

    let token_client = token::Client::new(env, &state.token);
    let balance = token_client.balance(&env.current_contract_address());
    if balance < amount {
        panic!("{:?}", Error::InsufficientBalance);
    }

    token_client.transfer(&env.current_contract_address(), &recipient, &amount);

    state.total_disbursed += amount;
    env.storage().instance().set(&DataKey::State, &state);
    bump_instance(env);

    treasury_day.amount += amount;
    store_bucket(env, &treasury_key, &treasury_day);

    recipient_day.amount += amount;
    store_bucket(env, &recipient_key, &recipient_day);

    let record = RewardRecord {
        recipient: recipient.clone(),
        amount,
        activity: activity.clone(),
        ledger: env.ledger().sequence(),
        timestamp: env.ledger().timestamp(),
    };
    let mut history: Vec<RewardRecord> = env
        .storage()
        .persistent()
        .get(&DataKey::History)
        .unwrap_or_else(|| Vec::new(env));
    history.push_back(record);
    while history.len() > MAX_HISTORY_LEN {
        history.pop_front();
    }
    env.storage()
        .persistent()
        .set(&DataKey::History, &history);
    env.storage()
        .persistent()
        .extend_ttl(&DataKey::History, 100, 535_679); // ~31 days

    env.events().publish(
        (symbol_short!("reward"), symbol_short!("sent")),
        (recipient, amount, activity),
    );
}

#[contract]
pub struct RewardTreasuryContract;

#[contractimpl]
impl RewardTreasuryContract {
    /// One-time setup. Admin funds this contract address externally after calling initialize.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::State) {
            panic!("{:?}", Error::AlreadyInitialized);
        }
        admin.require_auth();

        let state = TreasuryState {
            admin: admin.clone(),
            token,
            total_disbursed: 0,
        };
        env.storage().instance().set(&DataKey::State, &state);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("init")),
            (admin,),
        );
    }

    /// Admin-only: set the ed25519 attestor public key used to verify claim vouchers.
    pub fn set_attestor(env: Env, attestor: BytesN<32>) {
        let state = load_state(&env);
        state.admin.require_auth();
        env.storage().instance().set(&DataKey::Attestor, &attestor);
        bump_instance(&env);
        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("attest")),
            (attestor,),
        );
    }

    /// View: current attestor pubkey (panics if unset).
    pub fn get_attestor(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::Attestor)
            .unwrap_or_else(|| panic!("{:?}", Error::AttestorNotSet))
    }

    /// Admin-only ops path: send an XLM reward without a voucher.
    /// Product payouts must use `claim_reward` instead.
    pub fn send_reward(env: Env, recipient: Address, amount: i128, activity: Symbol) {
        let state = load_state(&env);
        state.admin.require_auth();
        disburse(&env, recipient, amount, activity);
    }

    /// Product path: pay against an attestor-signed voucher (one-time claim_id).
    /// Anyone may submit the transaction (server relay pays fees); authorization is the signature.
    pub fn claim_reward(
        env: Env,
        recipient: Address,
        amount: i128,
        activity: Symbol,
        claim_id: BytesN<32>,
        expiry: u64,
        signature: BytesN<64>,
    ) {
        let _state = load_state(&env);
        let attestor: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::Attestor)
            .unwrap_or_else(|| panic!("{:?}", Error::AttestorNotSet));

        if env.ledger().timestamp() > expiry {
            panic!("{:?}", Error::VoucherExpired);
        }

        let claim_key = DataKey::Claim(claim_id.clone());
        if env.storage().persistent().has(&claim_key) {
            panic!("{:?}", Error::ClaimAlreadyUsed);
        }

        let contract = env.current_contract_address();
        let message =
            voucher_message(&env, &contract, &recipient, amount, &activity, &claim_id, expiry);
        // Panics on invalid signature — surface as host failure / InvalidSignature intent.
        env.crypto()
            .ed25519_verify(&attestor, &message, &signature);

        env.storage().persistent().set(&claim_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&claim_key, 100, 535_679);

        disburse(&env, recipient, amount, activity);
    }

    /// View: current XLM balance held in this contract (in stroops).
    pub fn get_balance(env: Env) -> i128 {
        let state = load_state(&env);
        let token_client = token::Client::new(&env, &state.token);
        token_client.balance(&env.current_contract_address())
    }

    /// View: total XLM disbursed so far (in stroops).
    pub fn get_disbursed(env: Env) -> i128 {
        load_state(&env).total_disbursed
    }

    /// View: admin address.
    pub fn get_admin(env: Env) -> Address {
        load_state(&env).admin
    }

    /// View: UTC day index used for daily caps.
    pub fn get_day(env: Env) -> u64 {
        current_day(&env)
    }

    /// View: treasury disbursed today (stroops), after day-bucket reset.
    pub fn get_daily_disbursed(env: Env) -> i128 {
        load_bucket(&env, &CapKey::TreasuryDay).amount
    }

    /// View: amount paid to a recipient today (stroops).
    pub fn get_recipient_daily(env: Env, recipient: Address) -> i128 {
        load_bucket(&env, &CapKey::RecipientDay(recipient)).amount
    }

    /// Read-only ledger: every reward ever paid out by this treasury, oldest first.
    pub fn get_history(env: Env) -> Vec<RewardRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::History)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// View: number of reward records stored.
    pub fn get_history_len(env: Env) -> u32 {
        let history: Vec<RewardRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::History)
            .unwrap_or_else(|| Vec::new(&env));
        history.len()
    }

    /// View: a single reward record by index (0-based, insertion order).
    pub fn get_reward(env: Env, index: u32) -> RewardRecord {
        let history: Vec<RewardRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::History)
            .unwrap_or_else(|| Vec::new(&env));
        if index >= history.len() {
            panic!("{:?}", Error::RewardIndexOutOfRange);
        }
        history.get(index).unwrap()
    }
}

#[cfg(test)]
mod test;
