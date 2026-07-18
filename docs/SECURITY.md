# Security

## Never commit

- `ADMIN_SECRET`, `NONCE_HMAC_SECRET`, `CRON_SECRET`
- Upstash / Telegram / Groq / Google Forms tokens
- Wallet seed phrases or Stellar secret keys
- `.env`, `.env.local`, Vercel pull dumps with secrets

Use [`.env.example`](../.env.example) as the template. Real values live in Vercel / GitHub Environments only.

## CI gates

| Gate | Where |
|------|--------|
| `npm audit --audit-level=high` | CI `security` job |
| Gitleaks | CI on pull requests |
| Dependabot | Weekly npm + cargo + Actions |

If `npm audit` reports a high finding that cannot be fixed immediately, document the exception and expiry in this file under **Audit exceptions** (do not `--force` without review).

## Audit exceptions

| Item | Reason | Expiry |
|------|--------|--------|
| Transitive `npm audit` high+ findings | Mostly Remotion/tooling and deep deps; CI audit step is `continue-on-error` until a dedicated dependency cleanup PR | Revisit each Dependabot cycle |

Gitleaks remains a hard gate on PRs.

## Payout trust model

- Admin signing key stays server-side only (`api/_lib/payout/submitReward.ts`).
- Students sign ownership challenges, never treasury admin transactions.
- Production Redis is fail-closed — missing store config returns 503, not in-memory payouts.
