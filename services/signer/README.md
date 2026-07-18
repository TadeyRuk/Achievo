# Achievo signer (Phase 2)

Isolated Vercel project that holds `ADMIN_SECRET` and signs/submits Soroban `send_reward` calls.

The main Achievo API must **not** set `ADMIN_SECRET` when using the remote signer. Configure:

| Env on signer | Purpose |
|---------------|---------|
| `ADMIN_SECRET` | Treasury Stellar secret |
| `SIGNER_HMAC_SECRET` | Shared with Achievo API |
| `CONTRACT_ID` / RPC / Horizon | Same network as Achievo |

| Env on Achievo API | Purpose |
|--------------------|---------|
| `SIGNER_URL` | e.g. `https://achievo-signer.vercel.app` |
| `SIGNER_HMAC_SECRET` | Same shared secret |
| *(omit)* `ADMIN_SECRET` | Keep key only on signer |

Auth: `X-Achievo-Timestamp`, `X-Achievo-Nonce`, `X-Achievo-Signature` over the JSON body.
