# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Achievo is an **AI-assisted student reward distribution system** on Stellar Soroban (testnet). Students submit activities in natural language; a 5-agent pipeline (Activity → Verification → Reward → Stellar → Feedback) interprets the submission, assigns an XLM reward, and executes the payout via a Soroban treasury contract.

## Repo Structure

```
contract/           — Soroban treasury contract (Rust, compiles to WASM via cdylib)
frontend/src/
  agents.ts         — 5 pure TS agent functions (rule-based, no external deps)
  contract.ts       — Soroban RPC calls: view queries + sendRewardOnChain()
  wallet.ts         — StellarWalletsKit init, Horizon, Friendbot
  App.tsx           — Single-page React UI + agent pipeline visualizer
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
  --wasm target/wasm32-unknown-unknown/release/contract.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>
```

The contract has five entry points:

| Function | Auth | Description |
|---|---|---|
| `initialize(admin, token)` | admin | One-time setup; panic if already initialized |
| `send_reward(recipient, amount)` | admin | Transfer `amount` stroops from contract to recipient |
| `get_balance()` | none | Current XLM held in contract (stroops) |
| `get_disbursed()` | none | Total XLM paid out so far (stroops) |
| `get_admin()` | none | Admin address (frontend uses to check role) |

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
- `src/wallet.ts` — `StellarWalletsKit` init (static), Horizon server, Friendbot helper
- `src/agents.ts` — 5 pure TS agent functions (Activity, Verification, Reward, Feedback); reward table and whitelist defined here
- `src/contract.ts` — all Soroban RPC calls; exports `CONTRACT_ID`, `XLM_TOKEN_CONTRACT_ID`, view helpers, and `sendRewardOnChain()`
- `src/App.tsx` — single-page React UI: activity submission form + pipeline stepper + reward result card, no router

The frontend talks **directly** to Stellar's Soroban RPC (`https://soroban-testnet.stellar.org`) and Horizon (`https://horizon-testnet.stellar.org`). There is no backend server.

## Network Constants (Testnet)

| Constant | Value in `contract.ts` |
|---|---|
| `CONTRACT_ID` | `CDJN47RNDWOUCOTMGFDDNNT226QWRTKCX5WRTXTDXXQIIMIBMA4MM4X4` |
| `XLM_TOKEN_CONTRACT_ID` | `CAS3J7CYCJ34TRCB4YEX6ADYZ37CTAMCCMI43GAPK4R4SUK2VJYZATJQ` |
| Soroban RPC | `https://soroban-testnet.stellar.org` |
| Horizon | `https://horizon-testnet.stellar.org` |

The UI's settings panel lets users override `CONTRACT_ID` at runtime without a code change.

## Transaction Flow

All on-chain writes follow: `loadAccount → buildTx → simulateTransaction (prepareTransaction) → signTransaction (via StellarWalletsKit) → sendTransaction → poll getTransaction`. This is implemented in `sendContractTransaction()` in `contract.ts`.

## Agent Pipeline (implemented — `frontend/src/agents.ts`)

Five sequential rule-based functions (Option A from `Architecture Options.md`):

1. `activityAgent(text)` — keyword match against whitelist → `{ activity, valid, suggestedReward }`
2. `verificationAgent(activity)` — whitelist check → `{ status: 'approved' | 'rejected', reason? }`
3. `rewardAgent(activity)` — reward table lookup → `{ reward, currency: 'XLM' }`
4. *(Stellar Agent = `sendRewardOnChain()` in `contract.ts`)*
5. `feedbackAgent(result)` — format tx result → `{ message, type: 'success' | 'failure' }`

Reward table: `tutoring`→5, `workshop`→2, `volunteering`→10, `event`/`participation`→3 XLM.
