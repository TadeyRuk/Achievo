# Migration Plan: Split-Bill → AI Student Reward System

## What We're Changing

Achievo pivots from a split-bill escrow dApp to an **AI-assisted student reward distribution system** powered by Stellar.

---

## Current State

| Layer | What it does now |
|---|---|
| Contract | Escrow: organizer inits bill, participants pay shares, organizer claims |
| Frontend | Form to create bill, participant list, pay share button, claim button |
| Agents/ | Design docs only — nothing implemented |

---

## Target State

| Layer | What it will do |
|---|---|
| Contract | Treasury: admin-funded pool; sends XLM to student wallet on trigger |
| Frontend | Activity submission UI + agent pipeline visualizer + reward confirmation |
| Agents (frontend TS) | 5 rule-based agents executing in sequence |

---

## What Changes

### 1. Contract (`contract/src/lib.rs`)

**Remove:**
- `BillState` struct (organizer, participants, share_per_person, etc.)
- `init` — bill initialization
- `pay_share` — participant payment
- `claim` — organizer withdrawal

**Add:**
- `TreasuryState` struct (admin address, token address, total_disbursed)
- `initialize(admin, token)` — one-time setup, admin funds the contract
- `send_reward(admin, recipient, amount)` — admin-authorized payout to student
- `get_balance()` — view current treasury balance
- `get_total_disbursed()` — view running total paid out

**Key difference:** Flow reverses. Before, many users sent XLM *in*. Now, one admin sends XLM *out* to students.

---

### 2. Frontend (`frontend/src/`)

#### `contract.ts`
**Remove:** `getBillState`, `createBillOnChain`, `payShareOnChain`, `claimFundsOnChain`, `BillStateData`, `ParticipantInfo`

**Add:**
- `getTreasuryBalance(contractId)` — fetch admin's treasury balance
- `sendRewardOnChain(admin, recipient, amount, onStatus, contractId)` — trigger payout

#### `App.tsx`
**Remove:** Split-bill form, participant list, bill escrow dashboard

**Add:**
- Activity submission input ("What did you do today?")
- Agent pipeline visualizer — animated stepper showing each agent processing
- Reward result card — shows XLM amount + tx hash + StellarExpert link
- Treasury balance display (for admin view)

#### New file: `src/agents.ts`
Five pure TS functions, no external deps, deterministic:

| Function | Input | Output |
|---|---|---|
| `activityAgent(text)` | Raw student text | `{ activity, valid, suggestedReward }` |
| `verificationAgent(activity)` | Activity type | `{ status: 'approved' \| 'rejected', reason? }` |
| `rewardAgent(activity)` | Activity type | `{ reward: number, currency: 'XLM' }` |
| `stellarAgent(wallet, recipient, amount)` | Wallet + recipient + XLM | `{ success, txHash }` |
| `feedbackAgent(result)` | Tx result | `{ message, type: 'success' \| 'failure' }` |

Activity whitelist + reward table (from original design):

| Activity keyword | Reward |
|---|---|
| tutoring | 5 XLM |
| workshop | 2 XLM |
| volunteering | 10 XLM |
| event / participation | 3 XLM |

---

### 3. README.md

**Remove:** Split-bill setup instructions, bill escrow screenshots

**Add:**
- New project description (AI reward system)
- Updated setup instructions
- Screenshots: activity submission, agent pipeline, reward sent, tx hash

---

### 4. CHECKLIST.md

Update Level 1/2/3 items to reflect new project scope.

---

## What Stays the Same

| Item | Why keep |
|---|---|
| `wallet.ts` | StellarWalletsKit, Horizon, Friendbot — unchanged |
| Testnet network constants | Same RPC + Horizon endpoints |
| `sendContractTransaction()` pattern | Same build→simulate→sign→submit→poll flow |
| Vite + React + TS setup | No change |
| All existing Obsidian docs | Already describe the target system |

---

## New Contract Deployment

After contract rewrite:
1. `cargo build --release --target wasm32-unknown-unknown`
2. `stellar contract deploy --wasm ... --network testnet --source <ADMIN_KEY>`
3. Call `initialize(admin, XLM_TOKEN_CONTRACT_ID)` once
4. Fund the treasury address with testnet XLM via Friendbot
5. Update `CONTRACT_ID` in `contract.ts`

---

## Implementation Order

1. Rewrite `contract/src/lib.rs` (treasury contract)
2. Deploy new contract → get new `CONTRACT_ID`
3. Create `src/agents.ts` (5 agent functions)
4. Rewrite `contract.ts` (new RPC calls)
5. Rewrite `App.tsx` (new UI)
6. Update README + CHECKLIST
