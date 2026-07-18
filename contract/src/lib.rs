#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
    token,
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

/// Hard ceiling on any single reward payout, in stroops (20 XLM).
const MAX_REWARD_PER_TX: i128 = 200_000_000;

/// Max treasury disbursement per UTC day, in stroops (100 XLM).
const MAX_DAILY_TREASURY: i128 = 1_000_000_000;

/// Max payout to one recipient per UTC day, in stroops (20 XLM).
const MAX_DAILY_PER_RECIPIENT: i128 = 200_000_000;

/// Bounded on-chain history ring (oldest dropped). Events remain the long-term log.
const MAX_HISTORY_LEN: u32 = 500;

const SECONDS_PER_DAY: u64 = 86_400;

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

#[contract]
pub struct RewardTreasuryContract;

#[contractimpl]
impl RewardTreasuryContract {
    /// One-time setup. Admin funds this contract address externally after calling initialize.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&symbol_short!("state")) {
            panic!("{:?}", Error::AlreadyInitialized);
        }
        admin.require_auth();

        let state = TreasuryState {
            admin,
            token,
            total_disbursed: 0,
        };
        env.storage().instance().set(&symbol_short!("state"), &state);
        bump_instance(&env);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("init")),
            (state.admin,),
        );
    }

    /// Admin-only: send an XLM reward from the treasury to a student wallet.
    /// Enforces per-tx, per-recipient daily, and treasury daily caps.
    pub fn send_reward(env: Env, recipient: Address, amount: i128, activity: Symbol) {
        let mut state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .unwrap_or_else(|| panic!("{:?}", Error::NotInitialized));

        state.admin.require_auth();

        if amount <= 0 {
            panic!("{:?}", Error::NonPositiveAmount);
        }
        if amount > MAX_REWARD_PER_TX {
            panic!("{:?}", Error::ExceedsPerTxCap);
        }

        let treasury_key = CapKey::TreasuryDay;
        let mut treasury_day = load_bucket(&env, &treasury_key);
        if treasury_day.amount + amount > MAX_DAILY_TREASURY {
            panic!("{:?}", Error::DailyTreasuryCap);
        }

        let recipient_key = CapKey::RecipientDay(recipient.clone());
        let mut recipient_day = load_bucket(&env, &recipient_key);
        if recipient_day.amount + amount > MAX_DAILY_PER_RECIPIENT {
            panic!("{:?}", Error::DailyRecipientCap);
        }

        let token_client = token::Client::new(&env, &state.token);
        let balance = token_client.balance(&env.current_contract_address());
        if balance < amount {
            panic!("{:?}", Error::InsufficientBalance);
        }

        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        state.total_disbursed += amount;
        env.storage().instance().set(&symbol_short!("state"), &state);
        bump_instance(&env);

        treasury_day.amount += amount;
        store_bucket(&env, &treasury_key, &treasury_day);

        recipient_day.amount += amount;
        store_bucket(&env, &recipient_key, &recipient_day);

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
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env));
        history.push_back(record);
        while history.len() > MAX_HISTORY_LEN {
            history.pop_front();
        }
        env.storage()
            .persistent()
            .set(&symbol_short!("history"), &history);
        env.storage()
            .persistent()
            .extend_ttl(&symbol_short!("history"), 100, 535_679); // ~31 days

        env.events().publish(
            (symbol_short!("reward"), symbol_short!("sent")),
            (recipient, amount, activity),
        );
    }

    /// View: current XLM balance held in this contract (in stroops).
    pub fn get_balance(env: Env) -> i128 {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .unwrap_or_else(|| panic!("{:?}", Error::NotInitialized));
        let token_client = token::Client::new(&env, &state.token);
        token_client.balance(&env.current_contract_address())
    }

    /// View: total XLM disbursed so far (in stroops).
    pub fn get_disbursed(env: Env) -> i128 {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .unwrap_or_else(|| panic!("{:?}", Error::NotInitialized));
        state.total_disbursed
    }

    /// View: admin address.
    pub fn get_admin(env: Env) -> Address {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .unwrap_or_else(|| panic!("{:?}", Error::NotInitialized));
        state.admin
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
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// View: number of reward records stored.
    pub fn get_history_len(env: Env) -> u32 {
        let history: Vec<RewardRecord> = env
            .storage()
            .persistent()
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env));
        history.len()
    }

    /// View: a single reward record by index (0-based, insertion order).
    pub fn get_reward(env: Env, index: u32) -> RewardRecord {
        let history: Vec<RewardRecord> = env
            .storage()
            .persistent()
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env));
        if index >= history.len() {
            panic!("{:?}", Error::RewardIndexOutOfRange);
        }
        history.get(index).unwrap()
    }
}

#[cfg(test)]
mod test;
