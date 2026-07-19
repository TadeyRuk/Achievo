# Mainnet / real-value readiness (Phase 3)

Do **not** fund a mainnet treasury or point production `CONTRACT_ID` / network URLs at mainnet until every gate below is checked.

## Hard gates

- [ ] `ATTESTOR_SECRET` set on Achievo API; contract `set_attestor` matches attestor pubkey
- [ ] Isolated signer deployed ([`services/signer`](../services/signer/)); Achievo web/API project has **no** `ADMIN_SECRET` (relayer only on signer)
- [ ] `SIGNER_HMAC_SECRET` rotated and stored only in GitHub/Vercel environments
- [ ] Production `CRON_SECRET` set; reconcile workflow secrets (`ACHIEVO_BASE_URL`, `CRON_SECRET`) verified
- [ ] Production Redis fail-closed confirmed (`/api/health` returns Redis up)
- [ ] `rewardsPaused` path tested (health 503 + UI disabled)
- [ ] Daily caps reviewed for real XLM economics (`@achievo/shared` + contract stroops)
- [ ] Privacy scrub verified: PostHog/Telegram contain no raw activity or full wallets
- [ ] Staging smoke: connect → submit → history → reconcile settles pending
- [ ] Incident runbook: pause rewards, rotate signer HMAC, revoke compromised deploy

## Soft gates (before meaningful balance)

- [ ] Optional payout delay / manual approve for amounts above a threshold
- [ ] Multisig / 2-of-N admin upgrade path documented for the Soroban admin address
- [ ] Groq/Forms retention review (what text leaves Achievo and for how long)
- [ ] Rate-limit abuse test (wallet + IP + identity)
- [ ] External pen-test or at least adversarial review of `/api/reward` + signer auth

## Multisig upgrade path (Phase 3.5)

Product payouts use `claim_reward` + attestor vouchers. Ops `send_reward` / `set_attestor` still use a single Stellar admin (`admin.require_auth()`). For larger treasuries:

1. Move admin to a Stellar multisig account (e.g. 2-of-3) for `set_attestor` / emergency `send_reward`.
2. Keep the hot relayer as a low-privilege fee payer; rotate `ATTESTOR_SECRET` if compromised.
3. Or add a second-approval policy before minting high-value vouchers.

## Network cutover checklist

1. Deploy contract WASM to mainnet; record `CONTRACT_ID`.
2. Set mainnet `SOROBAN_RPC_URL` / `HORIZON_URL` / `VITE_*` on staging first.
3. Fund treasury with a **tiny** balance; run one payout end-to-end.
4. Only then raise balance and remove testnet Friendbot assumptions from ops docs.
