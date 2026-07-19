# Security

## Never commit

- `ADMIN_SECRET`, `ATTESTOR_SECRET`, `NONCE_HMAC_SECRET`, `CRON_SECRET`, `SIGNER_HMAC_SECRET`, `IDENTITY_ID_PEPPER`
- Upstash / Telegram / Groq / Google Forms tokens
- Wallet seed phrases or Stellar secret keys
- `.env`, `.env.local`, Vercel pull dumps with secrets

Use [`.env.example`](../.env.example) as the template. Real values live in Vercel / GitHub Environments only.

## Threat model

### Assets

| Asset | Why it matters |
|-------|----------------|
| Attestor key (`ATTESTOR_SECRET`) | Mints claim vouchers; can authorize payouts up to on-chain caps if leaked |
| Relayer key (`ADMIN_SECRET`) | Fee-paying source for `claim_reward`; alone cannot invent vouchers |
| Redis (Upstash) | Rate limits, budgets, identity, pending reconcile, payout ledger |
| `NONCE_HMAC_SECRET` / session MAC | Challenge + identity session forgery |
| Activity text | Student-authored content; privacy-sensitive in logs/analytics |
| Sink credentials | Telegram, Groq, Google Forms, PostHog |

### Trust boundaries

```text
Browser (wallet + localStorage)
  → @achievo/sdk → api/*.ts (thin)
  → features (ports) → infrastructure
  → [optional] achievo-signer service → Soroban
```

Students prove wallet ownership; they never hold the treasury key. Public APIs must redact wallets. Analytics/ops sinks must not receive raw activity text or full addresses.

### Abuse cases (mitigations)

| Abuse | Mitigation |
|-------|------------|
| Env leak of web project | Keep `ATTESTOR_SECRET` on API; Phase 2: `ADMIN_SECRET` only on isolated signer; signer submits API-minted vouchers |
| Relayer leak without attestor | Cannot mint new vouchers; can only replay if it also holds unused voucher material |
| Analytics/Telegram exfil of activity/wallet | Scrubbed events/alerts (category + redacted wallet only) |
| Cron without secret in production | Fail-closed 503 when `CRON_SECRET` missing under `VERCEL_ENV=production` |
| Stolen `sessionToken` | HMAC + expiry; clear client session on wallet disconnect; verify wallet bind on identity routes |
| Rate-limit bypass | Redis `claimOnce` SET NX; production Redis fail-closed |
| Missing attestor/relayer/nonce secrets | Reward/nonce return 503/500; no unsigned payouts |

## CI gates

| Gate | Where |
|------|--------|
| `npm audit --audit-level=high` | CI `security` job |
| Gitleaks | CI on pull requests (hard fail) |
| Dependabot | Weekly npm + cargo + Actions |
| `npm run check:boundaries` | CI frontend job |

If `npm audit` reports a **direct** dependency high that cannot be fixed immediately, document the exception and expiry below (do not `--force` without review). Transitive highs remain soft-fail until cleaned up.

## Audit exceptions

| Item | Reason | Expiry |
|------|--------|--------|
| Transitive `npm audit` high+ findings | Deep dependency tree; CI audit step is `continue-on-error` for transitive noise | Revisit 2026-08-18 (next Dependabot cycle) |

Gitleaks remains a hard gate on PRs.

## Payout trust model

- Product path: API mints an ed25519 voucher (`ATTESTOR_SECRET`) → relayer submits `claim_reward` (local `ADMIN_SECRET` or remote [`services/signer`](../services/signer/)).
- Contract verifies attestor signature, burns one-time `claim_id`, enforces expiry + money caps. Ops-only `send_reward` remains admin-gated and is not used by `/api/reward`.
- Phase 2: Prefer isolated signer so the web/API project env does not hold the relayer key.
- Students sign ownership challenges, never treasury/relayer transactions.
- Production Redis is fail-closed — missing store config returns 503, not in-memory payouts.

## Mainnet / real-value gates

See [MAINNET.md](MAINNET.md). Do not point production at mainnet until those gates pass.
