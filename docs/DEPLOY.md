# Deploy

## Vercel CLI pin

CI installs a **pinned** CLI version (`VERCEL_CLI_VERSION` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

To bump:

1. Check `npm view vercel version`.
2. Update `VERCEL_CLI_VERSION` in the workflow in a dedicated PR.
3. Smoke a staging deploy before relying on production tags.

## Tag release flow (`v*`)

1. CI: frontend + contract jobs must pass.
2. Publish contract WASM to the GitHub Release.
3. **Staging**: `vercel deploy --prebuilt` (no `--prod`) → alias `staging`.
4. **Smoke**: `GET /api/health` on the staging URL must return healthy.
5. **Production**: promote / deploy `--prod` only after smoke passes.

## Rollback

### Frontend + API

1. Find the previous good tag (GitHub Releases).
2. Re-run deploy from that tag, or `vercel rollback` / redeploy the prior deployment URL with `--prod`.
3. Confirm `/api/health` on production.

### Contract

1. Keep prior WASM artifacts on GitHub Releases.
2. Do **not** point `CONTRACT_ID` at a new deploy until reconcile is green ([`docs/OPS.md`](OPS.md)).
3. Redeploying WASM requires a new contract instance + ID update — treat as a coordinated release.

## Environments

| Environment | Use |
|-------------|-----|
| Vercel Preview / staging alias | Tag smoke before prod |
| Vercel Production | Live PWA + API |
| Achievo signer (separate Vercel project) | Holds `ADMIN_SECRET`; see [`services/signer`](../services/signer/) |
| GitHub `production` environment | Protects deploy secrets |

Mainnet / real-value cutover: [`MAINNET.md`](MAINNET.md).
