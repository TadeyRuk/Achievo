# Achievo — AI Student Reward System on Stellar

Achievo automatically rewards students with XLM for completing recognized activities. A student connects their wallet, submits what they did, and the system evaluates the submission through a 5-agent pipeline and sends XLM directly to their wallet — no manual approval needed.

---

## How It Works

```
Student connects wallet + submits activity
              ↓
   Vercel API (api/reward.ts)
   ├── Activity Agent    — classifies activity type
   ├── Verification Agent — checks against whitelist
   ├── Reward Agent      — assigns XLM amount
   ├── Stellar Agent     — signs + sends send_reward() on Soroban
   └── Feedback Agent    — formats result
              ↓
   Student receives XLM + sees tx hash
```

**The admin key lives in a Vercel environment variable — never in the browser.** The student's wallet is read-only (receive XLM + view balance).

**Recognized activities and rewards:**

| Activity              | Reward |
|-----------------------|--------|
| tutoring              | 5 XLM  |
| workshop              | 2 XLM  |
| volunteering          | 10 XLM |
| event / participation | 3 XLM  |

---

## Tech Stack

- **Smart contract**: Rust / Soroban SDK 26.1 (treasury contract, Stellar Testnet)
- **Backend**: Vercel serverless function (`api/reward.ts`) — runs agents + signs transactions
- **Frontend**: React 19 + Vite + TypeScript
- **Wallet**: StellarWalletsKit (Freighter, xBull, Albedo, Lobstr, Hana) — receive-only
- **Network**: Stellar Testnet

---

## Deployed Contract

| Item | Value |
|------|-------|
| Network | Stellar Testnet |
| Contract ID | `CAIYYR6UKRUVAYY56CKLNQDEPUR3PGZL3CUXWKH3TJKJ4MIDZYO4WJAJ` |
| XLM Token (SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Treasury balance | 10,000 testnet XLM |

---

## Setup — Run Locally

```bash
# 1. Clone
git clone https://github.com/TadeyRuk/Achievo.git
cd Achievo

# 2. Install frontend dependencies
cd frontend
npm install

# 3. Set environment variable (for local API)
echo "ADMIN_SECRET=your_stellar_secret_key" > ../.env.local

# 4. Start dev server (Vercel CLI runs API + frontend together)
npx vercel dev
# → http://localhost:3000
```

Requires a Stellar wallet browser extension (Freighter recommended) to connect and receive XLM.

---

## Build the Contract (Rust)

```bash
cd contract
cargo build --release --target wasm32v1-none
```

> **Note:** Requires `wasm32v1-none` target. The `wasm32-unknown-unknown` target is incompatible with Soroban SDK 26+ on Rust 1.82+.

---

## Screenshots

*(Add after first test run)*

- [ ] Wallet connected (student receive-only)
- [ ] Activity submitted — pipeline running
- [ ] Reward sent — transaction hash on StellarExpert

---

## Project Structure

```
contract/       — Soroban treasury contract (Rust)
api/
  reward.ts     — Vercel function: agents + admin signs send_reward tx
frontend/src/
  agents.ts     — 5 pure agent functions (Activity → Feedback)
  contract.ts   — Soroban read-only view calls
  wallet.ts     — StellarWalletsKit + Horizon + Friendbot
  App.tsx       — UI: activity form + pipeline visualizer + reward card
*.md            — Obsidian vault design docs
```
