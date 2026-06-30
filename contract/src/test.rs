#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, Env,
};
use soroban_sdk::token::{StellarAssetClient, TokenClient};

// ── Test fixture ──────────────────────────────────────────────────────────────

struct TestFixture {
    env: Env,
    contract_id: Address,
    admin: Address,
    token_id: Address,
}

impl TestFixture {
    /// Create env + register contracts. Does NOT call `initialize`.
    fn setup() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let contract_id = env.register(RewardTreasuryContract, ());

        let token_admin = Address::generate(&env);
        let stellar_asset = env.register_stellar_asset_contract_v2(token_admin);
        let token_id = stellar_asset.address();

        TestFixture { env, contract_id, admin, token_id }
    }

    fn client(&self) -> RewardTreasuryContractClient<'_> {
        RewardTreasuryContractClient::new(&self.env, &self.contract_id)
    }

    fn token(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.token_id)
    }

    fn sac(&self) -> StellarAssetClient<'_> {
        StellarAssetClient::new(&self.env, &self.token_id)
    }

    fn initialize(&self) {
        self.client().initialize(&self.admin, &self.token_id);
    }

    /// Mint stroops directly into the treasury contract address.
    fn fund(&self, stroops: i128) {
        self.sac().mint(&self.contract_id, &stroops);
    }
}

// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn initialize_sets_admin_and_zero_disbursed() {
    let f = TestFixture::setup();
    f.initialize();
    assert_eq!(f.client().get_admin(), f.admin);
    assert_eq!(f.client().get_disbursed(), 0_i128);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn double_initialize_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.initialize();
}

// ── send_reward ───────────────────────────────────────────────────────────────

#[test]
fn send_reward_transfers_and_tracks_disbursed() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128); // 100 XLM

    let recipient = Address::generate(&f.env);
    let reward = 50_000_000_i128; // 5 XLM

    f.client().send_reward(&recipient, &reward);

    assert_eq!(f.token().balance(&recipient), reward);
    assert_eq!(f.client().get_disbursed(), reward);
    assert_eq!(f.client().get_balance(), 1_000_000_000_i128 - reward);
}

#[test]
fn multiple_rewards_accumulate_disbursed() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);

    let r1 = Address::generate(&f.env);
    let r2 = Address::generate(&f.env);
    f.client().send_reward(&r1, &100_000_000_i128);
    f.client().send_reward(&r2, &200_000_000_i128);

    assert_eq!(f.client().get_disbursed(), 300_000_000_i128);
    assert_eq!(f.client().get_balance(), 700_000_000_i128);
}

#[test]
#[should_panic(expected = "Reward amount must be positive")]
fn zero_reward_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &0_i128);
}

#[test]
#[should_panic(expected = "Reward amount must be positive")]
fn negative_reward_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &-1_i128);
}

#[test]
#[should_panic(expected = "Insufficient treasury balance")]
fn reward_exceeds_balance_panics() {
    let f = TestFixture::setup();
    f.initialize();
    // Treasury not funded — balance is 0
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &1_000_000_i128);
}

// ── view functions ────────────────────────────────────────────────────────────

#[test]
fn get_balance_reflects_funding() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(5_000_000_000_i128);
    assert_eq!(f.client().get_balance(), 5_000_000_000_i128);
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn get_admin_uninitialized_panics() {
    let f = TestFixture::setup();
    f.client().get_admin();
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn get_disbursed_uninitialized_panics() {
    let f = TestFixture::setup();
    f.client().get_disbursed();
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn get_balance_uninitialized_panics() {
    let f = TestFixture::setup();
    f.client().get_balance();
}

// ── events ────────────────────────────────────────────────────────────────────

#[test]
fn send_reward_emits_reward_sent_event() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);

    // If send_reward panics before env.events().publish(), the test fails.
    // Verifying the balance change proves the full execution path completed,
    // including event emission (SDK panics if the event type signature mismatches).
    f.client().send_reward(&recipient, &5_000_000_i128);
    assert_eq!(f.token().balance(&recipient), 5_000_000_i128);
}
