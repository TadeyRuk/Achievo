#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol, token};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BillState {
    pub organizer: Address,
    pub token: Address,
    pub description: Symbol,
    pub total_amount: i128,
    pub share_per_person: i128,
    pub participants: Map<Address, bool>,
}

#[contract]
pub struct SplitBillContract;

#[contractimpl]
impl SplitBillContract {
    // Initialize the bill
    pub fn init(
        env: Env,
        organizer: Address,
        token: Address,
        description: Symbol,
        total_amount: i128,
        participants_vec: soroban_sdk::Vec<Address>,
    ) {
        organizer.require_auth();

        let count = participants_vec.len() as i128;
        if count == 0 {
            panic!("Must have at least one participant");
        }
        if total_amount <= 0 {
            panic!("Total amount must be positive");
        }

        let share = total_amount / count;

        let mut participants = Map::new(&env);
        for p in participants_vec.iter() {
            participants.set(p, false);
        }

        let state = BillState {
            organizer,
            token,
            description,
            total_amount,
            share_per_person: share,
            participants,
        };

        env.storage().instance().set(&symbol_short!("state"), &state);

        // Emit an event
        env.events().publish(
            (symbol_short!("bill"), symbol_short!("created")),
            (state.organizer, state.description, state.total_amount),
        );
    }

    // Pay a participant's share
    pub fn pay_share(env: Env, payer: Address) {
        payer.require_auth();

        let mut state: BillState = env.storage().instance().get(&symbol_short!("state")).expect("Contract not initialized");

        if !state.participants.contains_key(payer.clone()) {
            panic!("Payer is not a participant in this bill");
        }

        if state.participants.get(payer.clone()).unwrap() {
            panic!("Payer has already paid");
        }

        // Transfer tokens from payer to the contract
        let token_client = token::Client::new(&env, &state.token);
        token_client.transfer(&payer, &env.current_contract_address(), &state.share_per_person);

        // Mark as paid
        state.participants.set(payer.clone(), true);
        env.storage().instance().set(&symbol_short!("state"), &state);

        // Emit a payment event
        env.events().publish(
            (symbol_short!("bill"), symbol_short!("paid")),
            (payer, state.share_per_person),
        );
    }

    // Claim funds (only organizer, once everyone has paid or at any time)
    pub fn claim(env: Env) {
        let state: BillState = env.storage().instance().get(&symbol_short!("state")).expect("Contract not initialized");
        state.organizer.require_auth();

        let token_client = token::Client::new(&env, &state.token);
        let contract_balance = token_client.balance(&env.current_contract_address());
        
        if contract_balance == 0 {
            panic!("No funds to claim");
        }

        // Transfer funds from contract to the organizer
        token_client.transfer(&env.current_contract_address(), &state.organizer, &contract_balance);

        // Emit a claim event
        env.events().publish(
            (symbol_short!("bill"), symbol_short!("claimed")),
            (state.organizer, contract_balance),
        );
    }

    // Get current state of the bill
    pub fn get_state(env: Env) -> BillState {
        env.storage().instance().get(&symbol_short!("state")).expect("Contract not initialized")
    }
}
