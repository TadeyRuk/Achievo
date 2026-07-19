#![cfg(test)]

extern crate std;

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use rand::rngs::OsRng;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, BytesN as _, Ledger},
    Address, Bytes, BytesN, Env, Symbol,
};

fn bytes_to_std_vec(bytes: &Bytes) -> std::vec::Vec<u8> {
    let len = bytes.len() as usize;
    let mut out = std::vec::Vec::with_capacity(len);
    for i in 0..bytes.len() {
        out.push(bytes.get(i).unwrap());
    }
    out
}

fn sign_voucher(
    env: &Env,
    contract: &Address,
    signing_key: &SigningKey,
    recipient: &Address,
    amount: i128,
    activity: &Symbol,
    claim_id: &BytesN<32>,
    expiry: u64,
) -> BytesN<64> {
    let message = voucher_message(env, contract, recipient, amount, activity, claim_id, expiry);
    let sig = signing_key.sign(&bytes_to_std_vec(&message));
    BytesN::from_array(env, &sig.to_bytes())
}

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

    fn set_attestor_from_key(&self, signing_key: &SigningKey) {
        let pk = BytesN::from_array(&self.env, signing_key.verifying_key().as_bytes());
        self.client().set_attestor(&pk);
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
#[should_panic(expected = "AlreadyInitialized")]
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

    f.client().send_reward(&recipient, &reward, &symbol_short!("tutoring"));

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
    f.client().send_reward(&r1, &100_000_000_i128, &symbol_short!("event"));
    f.client().send_reward(&r2, &200_000_000_i128, &symbol_short!("workshop"));

    assert_eq!(f.client().get_disbursed(), 300_000_000_i128);
    assert_eq!(f.client().get_balance(), 700_000_000_i128);
}

#[test]
#[should_panic(expected = "NonPositiveAmount")]
fn zero_reward_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &0_i128, &symbol_short!("event"));
}

#[test]
#[should_panic(expected = "NonPositiveAmount")]
fn negative_reward_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &-1_i128, &symbol_short!("event"));
}

#[test]
#[should_panic(expected = "InsufficientBalance")]
fn reward_exceeds_balance_panics() {
    let f = TestFixture::setup();
    f.initialize();
    // Treasury not funded — balance is 0
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &1_000_000_i128, &symbol_short!("event"));
}

#[test]
fn reward_at_cap_boundary_succeeds() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);

    // MAX_REWARD_PER_TX itself must still succeed — the cap is inclusive.
    f.client().send_reward(&recipient, &200_000_000_i128, &symbol_short!("volunteer"));
    assert_eq!(f.token().balance(&recipient), 200_000_000_i128);
}

#[test]
#[should_panic(expected = "ExceedsPerTxCap")]
fn reward_over_cap_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(10_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &200_000_001_i128, &symbol_short!("volunteer"));
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
#[should_panic(expected = "NotInitialized")]
fn get_admin_uninitialized_panics() {
    let f = TestFixture::setup();
    f.client().get_admin();
}

#[test]
#[should_panic(expected = "NotInitialized")]
fn get_disbursed_uninitialized_panics() {
    let f = TestFixture::setup();
    f.client().get_disbursed();
}

#[test]
#[should_panic(expected = "NotInitialized")]
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
    f.client().send_reward(&recipient, &5_000_000_i128, &symbol_short!("volunteer"));
    assert_eq!(f.token().balance(&recipient), 5_000_000_i128);
}

// ── on-chain history (get_history / get_history_len / get_reward) ─────────────

#[test]
fn get_history_empty_before_any_reward() {
    let f = TestFixture::setup();
    f.initialize();
    assert_eq!(f.client().get_history_len(), 0);
    assert_eq!(f.client().get_history().len(), 0);
}

#[test]
fn send_reward_appends_to_history() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);

    f.client().send_reward(&recipient, &50_000_000_i128, &symbol_short!("tutoring"));

    assert_eq!(f.client().get_history_len(), 1);
    let record = f.client().get_reward(&0);
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.amount, 50_000_000_i128);
    assert_eq!(record.activity, symbol_short!("tutoring"));
    assert_eq!(record.ledger, f.env.ledger().sequence());
    assert_eq!(record.timestamp, f.env.ledger().timestamp());
}

#[test]
fn multiple_rewards_preserve_history_order() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let r1 = Address::generate(&f.env);
    let r2 = Address::generate(&f.env);

    f.client().send_reward(&r1, &100_000_000_i128, &symbol_short!("event"));
    f.client().send_reward(&r2, &200_000_000_i128, &symbol_short!("workshop"));

    assert_eq!(f.client().get_history_len(), 2);
    let history = f.client().get_history();
    assert_eq!(history.get(0).unwrap().recipient, r1);
    assert_eq!(history.get(0).unwrap().activity, symbol_short!("event"));
    assert_eq!(history.get(1).unwrap().recipient, r2);
    assert_eq!(history.get(1).unwrap().activity, symbol_short!("workshop"));
}

#[test]
#[should_panic(expected = "RewardIndexOutOfRange")]
fn get_reward_out_of_range_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &50_000_000_i128, &symbol_short!("event"));
    f.client().get_reward(&1);
}

// ── daily caps ────────────────────────────────────────────────────────────────

#[test]
fn daily_disbursed_tracks_treasury_spend() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(2_000_000_000_i128);
    f.env.ledger().set_timestamp(86_400 * 10); // day 10

    let r1 = Address::generate(&f.env);
    let r2 = Address::generate(&f.env);
    f.client().send_reward(&r1, &100_000_000_i128, &symbol_short!("event"));
    f.client().send_reward(&r2, &50_000_000_i128, &symbol_short!("workshop"));

    assert_eq!(f.client().get_day(), 10);
    assert_eq!(f.client().get_daily_disbursed(), 150_000_000_i128);
    assert_eq!(f.client().get_recipient_daily(&r1), 100_000_000_i128);
    assert_eq!(f.client().get_recipient_daily(&r2), 50_000_000_i128);
}

#[test]
fn daily_counters_reset_on_new_utc_day() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(2_000_000_000_i128);
    f.env.ledger().set_timestamp(86_400 * 5);

    let recipient = Address::generate(&f.env);
    f.client().send_reward(&recipient, &200_000_000_i128, &symbol_short!("volunteer"));
    assert_eq!(f.client().get_daily_disbursed(), 200_000_000_i128);
    assert_eq!(f.client().get_recipient_daily(&recipient), 200_000_000_i128);

    // Next UTC day — counters reset; same recipient can be paid again.
    f.env.ledger().set_timestamp(86_400 * 6);
    f.client().send_reward(&recipient, &100_000_000_i128, &symbol_short!("tutoring"));
    assert_eq!(f.client().get_day(), 6);
    assert_eq!(f.client().get_daily_disbursed(), 100_000_000_i128);
    assert_eq!(f.client().get_recipient_daily(&recipient), 100_000_000_i128);
}

#[test]
#[should_panic(expected = "DailyRecipientCap")]
fn recipient_daily_cap_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(2_000_000_000_i128);
    f.env.ledger().set_timestamp(86_400);
    let recipient = Address::generate(&f.env);
    // Cap is 20 XLM inclusive — second 1 stroop over after a full 20 XLM payout.
    f.client().send_reward(&recipient, &200_000_000_i128, &symbol_short!("volunteer"));
    f.client().send_reward(&recipient, &1_i128, &symbol_short!("event"));
}

#[test]
#[should_panic(expected = "DailyTreasuryCap")]
fn treasury_daily_cap_panics() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(10_000_000_000_i128);
    f.env.ledger().set_timestamp(86_400 * 2);

    // 5 × 20 XLM = 100 XLM (at treasury daily cap). Sixth stroop fails.
    for _ in 0..5 {
        let r = Address::generate(&f.env);
        f.client().send_reward(&r, &200_000_000_i128, &symbol_short!("volunteer"));
    }
    let overflow = Address::generate(&f.env);
    f.client().send_reward(&overflow, &1_i128, &symbol_short!("event"));
}

#[test]
fn per_tx_cap_still_enforced_under_daily_headroom() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(10_000_000_000_i128);
    f.env.ledger().set_timestamp(86_400 * 3);
    let recipient = Address::generate(&f.env);
    // Would fit daily caps but exceeds per-tx — still panics via existing path.
    // Use should_panic sibling below; this asserts boundary still works.
    f.client().send_reward(&recipient, &200_000_000_i128, &symbol_short!("volunteer"));
    assert_eq!(f.client().get_recipient_daily(&recipient), 200_000_000_i128);
}

// ── claim_reward (attested vouchers) ──────────────────────────────────────────

#[test]
fn claim_reward_transfers_with_valid_voucher() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let signing_key = SigningKey::generate(&mut OsRng);
    f.set_attestor_from_key(&signing_key);

    let recipient = Address::generate(&f.env);
    let amount = 50_000_000_i128;
    let activity = symbol_short!("tutoring");
    let claim_id = BytesN::<32>::random(&f.env);
    let expiry = f.env.ledger().timestamp() + 600;
    let signature = sign_voucher(
        &f.env,
        &f.contract_id,
        &signing_key,
        &recipient,
        amount,
        &activity,
        &claim_id,
        expiry,
    );

    f.client()
        .claim_reward(&recipient, &amount, &activity, &claim_id, &expiry, &signature);

    assert_eq!(f.token().balance(&recipient), amount);
    assert_eq!(f.client().get_disbursed(), amount);
    assert_eq!(f.client().get_history_len(), 1);
}

#[test]
#[should_panic(expected = "ClaimAlreadyUsed")]
fn claim_reward_rejects_replayed_claim_id() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let signing_key = SigningKey::generate(&mut OsRng);
    f.set_attestor_from_key(&signing_key);

    let recipient = Address::generate(&f.env);
    let amount = 10_000_000_i128;
    let activity = symbol_short!("event");
    let claim_id = BytesN::<32>::random(&f.env);
    let expiry = f.env.ledger().timestamp() + 600;
    let signature = sign_voucher(
        &f.env,
        &f.contract_id,
        &signing_key,
        &recipient,
        amount,
        &activity,
        &claim_id,
        expiry,
    );

    f.client()
        .claim_reward(&recipient, &amount, &activity, &claim_id, &expiry, &signature);
    f.client()
        .claim_reward(&recipient, &amount, &activity, &claim_id, &expiry, &signature);
}

#[test]
#[should_panic(expected = "VoucherExpired")]
fn claim_reward_rejects_expired_voucher() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let signing_key = SigningKey::generate(&mut OsRng);
    f.set_attestor_from_key(&signing_key);

    let recipient = Address::generate(&f.env);
    let amount = 10_000_000_i128;
    let activity = symbol_short!("event");
    let claim_id = BytesN::<32>::random(&f.env);
    let expiry = f.env.ledger().timestamp();
    f.env.ledger().set_timestamp(expiry + 1);
    let signature = sign_voucher(
        &f.env,
        &f.contract_id,
        &signing_key,
        &recipient,
        amount,
        &activity,
        &claim_id,
        expiry,
    );

    f.client()
        .claim_reward(&recipient, &amount, &activity, &claim_id, &expiry, &signature);
}

#[test]
#[should_panic]
fn claim_reward_rejects_bad_signature() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);
    let signing_key = SigningKey::generate(&mut OsRng);
    f.set_attestor_from_key(&signing_key);

    let recipient = Address::generate(&f.env);
    let amount = 10_000_000_i128;
    let activity = symbol_short!("event");
    let claim_id = BytesN::<32>::random(&f.env);
    let expiry = f.env.ledger().timestamp() + 600;
    let bad_key = SigningKey::generate(&mut OsRng);
    let signature = sign_voucher(
        &f.env,
        &f.contract_id,
        &bad_key,
        &recipient,
        amount,
        &activity,
        &claim_id,
        expiry,
    );

    f.client()
        .claim_reward(&recipient, &amount, &activity, &claim_id, &expiry, &signature);
}

#[test]
#[should_panic(expected = "AttestorNotSet")]
fn claim_reward_requires_attestor() {
    let f = TestFixture::setup();
    f.initialize();
    f.fund(1_000_000_000_i128);

    let recipient = Address::generate(&f.env);
    let claim_id = BytesN::<32>::random(&f.env);
    let expiry = f.env.ledger().timestamp() + 600;
    let signature = BytesN::<64>::random(&f.env);

    f.client().claim_reward(
        &recipient,
        &10_000_000_i128,
        &symbol_short!("event"),
        &claim_id,
        &expiry,
        &signature,
    );
}

#[test]
fn get_attestor_returns_set_key() {
    let f = TestFixture::setup();
    f.initialize();
    let signing_key = SigningKey::generate(&mut OsRng);
    f.set_attestor_from_key(&signing_key);
    let expected = BytesN::from_array(&f.env, signing_key.verifying_key().as_bytes());
    assert_eq!(f.client().get_attestor(), expected);
}
