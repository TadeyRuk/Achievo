#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec, token};

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

#[contract]
pub struct RewardTreasuryContract;

#[contractimpl]
impl RewardTreasuryContract {
    /// One-time setup. Admin funds this contract address externally after calling initialize.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&symbol_short!("state")) {
            panic!("Contract already initialized");
        }
        admin.require_auth();

        let state = TreasuryState {
            admin,
            token,
            total_disbursed: 0,
        };
        env.storage().instance().set(&symbol_short!("state"), &state);

        env.events().publish(
            (symbol_short!("treasury"), symbol_short!("init")),
            (state.admin,),
        );
    }

    /// Admin-only: send an XLM reward from the treasury to a student wallet.
    /// Records the payout in the durable on-chain history (see `get_history`)
    /// in addition to transferring funds and emitting the "reward.sent" event.
    pub fn send_reward(env: Env, recipient: Address, amount: i128, activity: Symbol) {
        let mut state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .expect("Contract not initialized");

        state.admin.require_auth();

        if amount <= 0 {
            panic!("Reward amount must be positive");
        }

        let token_client = token::Client::new(&env, &state.token);
        let balance = token_client.balance(&env.current_contract_address());
        if balance < amount {
            panic!("Insufficient treasury balance");
        }

        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        state.total_disbursed += amount;
        env.storage().instance().set(&symbol_short!("state"), &state);

        let record = RewardRecord {
            recipient: recipient.clone(),
            amount,
            activity,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
        };
        let mut history: Vec<RewardRecord> = env
            .storage()
            .persistent()
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env));
        history.push_back(record);
        env.storage().persistent().set(&symbol_short!("history"), &history);
        env.storage().persistent().extend_ttl(&symbol_short!("history"), 100, 535_679); // ~31 days

        env.events().publish(
            (symbol_short!("reward"), symbol_short!("sent")),
            (recipient, amount),
        );
    }

    /// View: current XLM balance held in this contract (in stroops).
    pub fn get_balance(env: Env) -> i128 {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .expect("Contract not initialized");
        let token_client = token::Client::new(&env, &state.token);
        token_client.balance(&env.current_contract_address())
    }

    /// View: total XLM disbursed so far (in stroops).
    pub fn get_disbursed(env: Env) -> i128 {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .expect("Contract not initialized");
        state.total_disbursed
    }

    /// View: admin address (frontend uses this to check if connected wallet is admin).
    pub fn get_admin(env: Env) -> Address {
        let state: TreasuryState = env
            .storage()
            .instance()
            .get(&symbol_short!("state"))
            .expect("Contract not initialized");
        state.admin
    }

    /// Read-only ledger: every reward ever paid out by this treasury, oldest
    /// first. Empty vec (not a panic) if the contract is initialized but has
    /// never paid a reward. No auth required — this is a public view.
    pub fn get_history(env: Env) -> Vec<RewardRecord> {
        env.storage()
            .persistent()
            .get(&symbol_short!("history"))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// View: number of reward records stored (avoids fetching the full vec
    /// just to check length).
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
            panic!("Reward index out of range");
        }
        history.get(index).unwrap()
    }
}

#[cfg(test)]
mod test;
