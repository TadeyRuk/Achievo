# Achievo signer (Phase 2)

Isolated Vercel project that holds the **relayer** Stellar secret (`ADMIN_SECRET`) and
submits Soroban `claim_reward` calls. Vouchers are minted by the Achievo API with
`ATTESTOR_SECRET` — the signer never invents payout amounts.

The main Achievo API must **not** set `ADMIN_SECRET` when using the remote signer. Configure:

| Env on signer | Purpose |
|---------------|---------|
| `ADMIN_SECRET` | Relayer Stellar secret (fee-paying source account) |
| `SIGNER_HMAC_SECRET` | Shared with Achievo API |
| `CONTRACT_ID` / RPC / Horizon | Same network as Achievo |

| Env on Achievo API | Purpose |
|--------------------|---------|
| `ATTESTOR_SECRET` | Ed25519 key that mints claim vouchers (Stellar secret) |
| `SIGNER_URL` | e.g. `https://achievo-signer.vercel.app` |
| `SIGNER_HMAC_SECRET` | Same shared secret |
| *(omit)* `ADMIN_SECRET` | Keep relayer key only on signer |

Auth: `X-Achievo-Timestamp`, `X-Achievo-Nonce`, `X-Achievo-Signature` over the JSON body.

Body fields: `wallet`, `rewardXlm`, `activity`, `claimIdHex`, `expiry`, `signatureHex`.
