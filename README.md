# Achievo — AI Student Reward System on Stellar

Achievo is an AI-assisted student reward distribution system built on Stellar Soroban (testnet).

Students submit activities in natural language. A pipeline of five agents interprets the submission, verifies eligibility, calculates an XLM reward, and executes the on-chain payout — all visible in real time through an animated UI.

---

## How It Works

```
Student submits activity text
         ↓
  1. Activity Agent     — keyword classification
         ↓
  2. Verification Agent — whitelist check
         ↓
  3. Reward Agent       — XLM amount lookup
         ↓
  4. Stellar Agent      — Soroban contract call (send_reward)
         ↓
  5. Feedback Agent     — human-readable result
         ↓
  UI shows reward confirmation + StellarExpert link
```

**Recognized activities and rewards:**

| Activity              | Reward |
|-----------------------|--------|
| tutoring              | 5 XLM  |
| workshop              | 2 XLM  |
| volunteering          | 10 XLM |
| event / participation | 3 XLM  |

---

## Tech Stack

- **Smart contract**: Rust / Soroban SDK 26.1 (WASM, deployed on Stellar Testnet)
- **Frontend**: React 19 + Vite + TypeScript
- **Wallet**: StellarWalletsKit (Freighter, xBull, Albedo, Lobstr, Hana)
- **Network**: Stellar Testnet (Soroban RPC + Horizon)

---

## Setup — Run Locally

```bash
# 1. Clone
git clone https://github.com/TadeyRuk/Achievo.git
cd Achievo

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

Requires a Stellar wallet browser extension (Freighter recommended).

---

## Deployed Contract

| Item | Value |
|------|-------|
| Network | Stellar Testnet |
| Contract ID | *(update after deploy)* |
| XLM Token Contract | `CAS3J7CYCJ34TRCB4YEX6ADYZ37CTAMCCMI43GAPK4R4SUK2VJYZATJQ` |

---

## Build the Contract (Rust)

```bash
cd contract
cargo build --release --target wasm32v1-none
```

> **Note:** Requires Rust 1.84+ and `wasm32v1-none` target. The older `wasm32-unknown-unknown` target is incompatible with Soroban SDK 26+ on Rust 1.82+.

---

## Screenshots

*(Add after first test run)*

- [ ] Wallet connected state
- [ ] Balance displayed
- [ ] Activity submitted — pipeline running
- [ ] Reward sent — transaction hash on StellarExpert

---

## Project Structure

```
contract/       — Soroban treasury contract (Rust)
frontend/src/
  agents.ts     — 5 pure agent functions (Activity → Feedback)
  contract.ts   — Soroban RPC calls (view + send_reward tx)
  wallet.ts     — StellarWalletsKit + Horizon + Friendbot
  App.tsx       — Single-page UI + pipeline visualizer
*.md            — Obsidian vault design docs
```
