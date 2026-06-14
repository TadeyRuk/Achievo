# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Achievo is an **AI-assisted student reward distribution system** on Stellar Soroban (testnet). A student connects their wallet and submits an activity in natural language. A 5-agent pipeline running on a **Vercel serverless function** evaluates the submission and automatically sends XLM to the student's wallet — the student never needs to sign or pay; the system's admin key (held server-side) does it.

## Architecture

```
Student browser                Vercel API (api/reward.ts)       Stellar Testnet
      |                               |                               |
      |-- POST /api/reward ---------->|                               |
      |   { activity, wallet }        |-- activityAgent()             |
      |                               |-- verificationAgent()         |
      |                               |-- rewardAgent()               |
      |                               |-- sign with ADMIN_SECRET      |
      |                               |-- send_reward(wallet, amt) -->|
      |                               |<-- txHash -------------------|
      |<-- { txHash, reward } --------|                               |
```

Admin key lives in `ADMIN_SECRET` Vercel env var — never in the browser. Student wallet connection is read-only (receive XLM + show balance only).

## Repo Structure

```
contract/           — Soroban treasury contract (Rust, compiles to WASM via cdylib)
api/
  reward.ts         — Vercel serverless function: runs agents + signs send_reward tx
frontend/src/
  agents.ts         — 5 pure TS agent functions (rule-based, no external deps)
  contract.ts       — Soroban RPC view queries (read-only); sendRewardOnChain used by API
  wallet.ts         — StellarWalletsKit init, Horizon, Friendbot
  App.tsx           — Single-page React UI + pipeline visualizer
Agents/             — Design docs for the agent pipeline
*.md                — Obsidian vault design docs (Index.md is the nav root)
```

## Contract (Rust / Soroban)

```bash
cd contract

# Build WASM (requires wasm32v1-none — wasm32-unknown-unknown fails on Rust 1.82+)
cargo build --release --target wasm32v1-none

# Run tests
cargo test

# Deploy to testnet (requires Stellar CLI)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/contract.wasm \
  --network testnet \
  --source dev
```

The contract has five entry points:

| Function | Auth | Description |
|---|---|---|
| `initialize(admin, token)` | admin | One-time setup; panic if already initialized |
| `send_reward(recipient, amount)` | admin | Transfer `amount` stroops from contract to recipient |
| `get_balance()` | none | Current XLM held in contract (stroops) |
| `get_disbursed()` | none | Total XLM paid out so far (stroops) |
| `get_admin()` | none | Admin address |

State stored in single `instance` slot under key `"state"` (`symbol_short!("state")`).

**Critical:** all token amounts on-chain are in **stroops** (1 XLM = 10,000,000 stroops). The `symbol_short!` macro accepts max 9 characters.

## Frontend (React + Vite + TypeScript)

```bash
cd frontend

npm install        # first time
npm run dev        # dev server at http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run lint       # eslint
npm run preview    # serve dist/ locally
```

Key files:
- `src/wallet.ts` — StellarWalletsKit init, Horizon, Friendbot helper
- `src/agents.ts` — 5 pure TS agent functions; reward table + whitelist defined here
- `src/contract.ts` — read-only Soroban view calls; `sendRewardOnChain()` called by API, not browser
- `src/App.tsx` — activity form + pipeline stepper + reward card; POSTs to `/api/reward`

## Network Constants (Testnet)

| Constant | Value |
|---|---|
| `CONTRACT_ID` | `CAIYYR6UKRUVAYY56CKLNQDEPUR3PGZL3CUXWKH3TJKJ4MIDZYO4WJAJ` |
| `XLM_TOKEN_CONTRACT_ID` (XLM SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Admin pubkey | `GBPW3ETOM3525MXSQUH3QYHPQIFNM6QGOF474H4FJQQS7NCPC3FUMCOF` |
| Soroban RPC | `https://soroban-testnet.stellar.org` |
| Horizon | `https://horizon-testnet.stellar.org` |

Treasury funded with 10,000 testnet XLM.

## Vercel Environment Variables

| Var | Description |
|---|---|
| `ADMIN_SECRET` | Stellar secret key for the treasury admin (never expose to browser) |

## Transaction Flow (server-side)

`loadAccount → buildTx → prepareTransaction (simulate) → sign with ADMIN_SECRET → sendTransaction → poll getTransaction`. Implemented in `api/reward.ts` (mirrors `sendContractTransaction` from `contract.ts`).

## Agent Pipeline (`frontend/src/agents.ts` + `api/reward.ts`)

Five sequential rule-based functions:

1. `activityAgent(text)` — keyword match → `{ activity, valid, suggestedReward }`
2. `verificationAgent(activity)` — whitelist check → `{ status, reason? }`
3. `rewardAgent(activity)` — reward table → `{ reward, currency: 'XLM' }`
4. *(Stellar Agent — `sendRewardOnChain()` called inside `api/reward.ts`)*
5. `feedbackAgent(result)` — format result → `{ message, type }`

Reward table: `tutoring`→5, `workshop`→2, `volunteering`→10, `event`/`participation`→3 XLM.

Rate limit: 1 reward per wallet address per day (enforced in `api/reward.ts`).
