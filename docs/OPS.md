# Operations

## Health

`GET /api/health` — Redis + Soroban RPC + contract ID. When `rewardsPaused: true`, the UI should disable submit.

## Reconcile

`GET|POST /api/reconcile` with `Authorization: Bearer $CRON_SECRET`.

- Settles `pending_reconcile` rows (poll timeout after `sendTransaction`).
- Alerts via Telegram when pending &gt; 15 minutes, on-chain failure, or treasury daily ≥ 80% of cap.

Schedule via Vercel Cron or GitHub `schedule` (every 5–15 minutes).

## Ambiguous submits

If confirmation polling times out, budgets are **not** released. The tx hash is stored pending until reconcile confirms SUCCESS (keep reservation) or FAILED (ops alert; manual budget review).

## Rollback

See [`DEPLOY.md`](DEPLOY.md).
