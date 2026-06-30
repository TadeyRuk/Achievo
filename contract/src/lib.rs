#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, token};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TreasuryState {
    pub admin: Address,
    pub token: Address,
    pub total_disbursed: i128,
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
    pub fn send_reward(env: Env, recipient: Address, amount: i128) {
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
}

#[cfg(test)]
mod test;
