# Identity model

Achievo treats **identity** as a pseudonymous principal separate from any single
wallet address. Wallets prove ownership; identity is the durable key for
progression and (where applicable) rate accounting.

## MVP shape

```text
Identity {
  id                // derived label bound at first ownership proof
  walletPublicKey   // current bound Stellar G-address
  createdAt
  displayNameHash?  // optional SHA-256 of display name — never raw PII
}
```

| Concern | Where it lives |
|---|---|
| Display name / avatar | Client `localStorage` only |
| Identity record + wallet index | Redis via `api/_lib/identity.ts` |
| Session token | HMAC (`identityId:wallet:expiry:nonce:mac`), issued after first successful `/api/reward` |
| Package types / redact helpers | `@achievo/identity` |

## Lifecycle

1. Student connects a wallet and completes the ownership challenge in `/api/reward`.
2. On successful payout, the server `bindIdentity(wallet)` and returns `identityId` + `sessionToken`.
3. The client stores the session (`sessionIdentity.ts`) and keys progression cache by `identityId` when present.
4. `POST /api/identity` refreshes a session or updates `displayNameHash` — it does **not** create a first bind without a prior reward proof.

## Privacy defaults

- `GET /api/payouts` returns **redacted** wallets (`GABC…WXYZ`) and optional `identityId` — never full address lists.
- `GET /api/identity?wallet=` returns a redacted wallet + id metadata.
- No school SSO / KYC in this phase; the abstraction is ready for later account recovery without baking PII into the ledger.

## Hybrid identity rate claims (current)

`/api/reward` uses **hybrid** daily rate keys (`api/_lib/payout/rateClaims.ts`):

1. Always `rate:wallet:{G}` (+ `rate:ip:{ip}` when known).
2. If `getIdentityByWallet(wallet)` already returns an identity, also
   `claimOnce(rate:identity:{id})`.
3. On failure, release identity claim with the same policy as wallet/IP.

**Rebind is not supported in this pass.** Identity rate claims are additive for
returning wallets only. A new wallet with no prior bind is unchanged (wallet/IP
only until after the first successful payout). Recipient Redis budget remains
wallet-keyed until a future rebind pass.

## Principles

1. Minimal data — no unnecessary PII server-side.
2. Identity ≠ wallet — rebind is planned later; today one wallet per identity.
3. Bind on challenge — first durable bind follows verified ownership (after payout).
4. Privacy by default for public APIs.
