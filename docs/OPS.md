# Operations

## Health

`GET /api/health` — Redis + Soroban RPC + contract ID. When `rewardsPaused: true`, the UI should disable submit.

## Reconcile

`GET|POST /api/reconcile` with `Authorization: Bearer $CRON_SECRET`.

- Settles `pending_reconcile` rows (poll timeout after `sendTransaction`).
- Alerts via Telegram when pending &gt; 15 minutes, on-chain failure, or treasury daily ≥ 80% of cap.

Scheduled by GitHub Actions (`.github/workflows/reconcile.yml`, every 10 minutes + manual `workflow_dispatch`), not Vercel Cron — Hobby plans reject sub-daily Vercel crons and would fail deploy.

Repo secrets required for the workflow:

- `ACHIEVO_BASE_URL` — production (or staging) origin, e.g. `https://achievo.example.com`
- `CRON_SECRET` — same value as the app’s `CRON_SECRET` env on Vercel

In production, missing `CRON_SECRET` fails closed (503) on `/api/reconcile`.

## Vouchers + attestor

`/api/reward` requires `ATTESTOR_SECRET` (Stellar secret) to mint ed25519 vouchers. After deploy, call contract `set_attestor` with the matching raw public key so `claim_reward` verifies signatures.

## Isolated signer (Phase 2)

When `SIGNER_URL` + `SIGNER_HMAC_SECRET` are set on the Achievo API, the relayer submits API-minted vouchers via [`services/signer`](../services/signer/) (separate Vercel project). Omit `ADMIN_SECRET` from the web/API project in that mode; keep `ATTESTOR_SECRET` on the API. See the signer README for env split and rotation.

## Ambiguous submits

If confirmation polling times out, budgets are **not** released. The tx hash is stored pending until reconcile confirms SUCCESS (keep reservation) or FAILED (ops alert; manual budget review).

## Rollback

See [`DEPLOY.md`](DEPLOY.md).
