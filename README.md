# Achievo — AI Student Reward System on Stellar

> Earn XLM automatically for your academic achievements — powered by a 5-agent AI pipeline and Soroban smart contracts on the Stellar Testnet.

Students connect their wallet, describe what they did, and Achievo's AI pipeline evaluates the submission and sends XLM directly to their wallet — no manual approval, no middleman.

---

## Features

- 🤖 **5-Agent AI Pipeline** — Activity → Verification → Reward → Stellar → Feedback
- ⛓️ **On-Chain Payouts** — XLM sent via Soroban treasury contract, every transaction verifiable on StellarExpert
- 🔐 **Wallet Ownership Proof** — nonce-based challenge/signature before every payout (prevents spoofing)
- 📱 **PWA / Mobile Ready** — installable on iOS & Android, offline-capable, network-first service worker
- 🏆 **Reward History** — local transaction log with weekly earnings trend chart
- 🎖️ **Achievement Badges** — 6 dynamic badges that unlock based on activity milestones
- 👛 **Multi-Wallet Support** — Freighter (desktop), Albedo, xBull, Lobstr

---

## How It Works

```
Student connects wallet + submits activity description
                    ↓
         Vercel Serverless API (api/reward.ts)
         ├── Activity Agent    — classifies activity type via Groq AI
         ├── Verification Agent — checks against activity whitelist
         ├── Reward Agent      — base reward + AI effort bonus (0.0–1.0 score)
         ├── Stellar Agent     — verifies wallet signature + calls send_reward() on Soroban
         └── Feedback Agent    — formats confirmation message
                    ↓
         Student receives XLM + sees tx hash + RewardCard
```

**The admin secret key lives in a Vercel environment variable — never in the browser.** The student's wallet is receive-only (view balance + sign ownership proof).

### Effort-Based Scoring

Rewards are not fixed — the AI scores submission quality and adds a bonus on top of the baseline:

```
reward = base_reward + (effort_score × max_bonus)
```

The AI scores `effort_score` (0.0–1.0) based on:
- Specificity — vague one-liner vs. detailed account
- Duration / scope — hours, number of people, scale of event
- Impact — outcomes described, who was helped
- Evidence — concrete details that indicate genuine participation

---

## Recognized Activities & Rewards

| Activity      | Base  | Max Bonus | Max Total |
|---------------|-------|-----------|-----------|
| Tutoring      | 5 XLM | +5 XLM    | 10 XLM    |
| Workshop      | 2 XLM | +3 XLM    | 5 XLM     |
| Volunteering  | 10 XLM| +5 XLM    | 15 XLM    |
| Event         | 3 XLM | +2 XLM    | 5 XLM     |
| Participation | 3 XLM | +2 XLM    | 5 XLM     |

*Base reward is guaranteed for any valid submission. Bonus is determined by AI effort scoring — the more specific and detailed the description, the higher the multiplier.*

---

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Rust / Soroban SDK 26.1 (Stellar Testnet) |
| Backend | Vercel serverless TypeScript (`api/reward.ts`, `api/nonce.ts`) |
| AI | Groq API — llama-3.1-8b-instant (activity classification + effort scoring) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Vanilla CSS + Tailwind utility classes |
| Animations | Motion (Framer Motion v11) |
| Wallet | StellarWalletsKit — Freighter, xBull, Albedo, Lobstr |
| Network | Stellar Testnet |

---

## Deployed Contract

| Item | Value |
|------|-------|
| Network | Stellar Testnet |
| Contract ID | `CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM` |
| XLM Token (SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Treasury Balance | 10,000 testnet XLM |
| Explorer | [View on StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM) |

---

## Project Structure

```
contract/                   — Soroban treasury contract (Rust)
api/
  nonce.ts                  — Issues HMAC-signed wallet challenge nonces
  reward.ts                 — 5-agent pipeline + admin signs send_reward tx
frontend/
  public/
    sw.js                   — Service worker (network-first, offline fallback)
    manifest.json           — PWA manifest
  src/
    App.tsx                 — Root: state, pipeline orchestration, modals
    ActivityForm.tsx        — Submission form with character counter
    PipelineVisualizer.tsx  — Animated 5-step pipeline + live log console
    RewardCard.tsx          — Gold reward card shown on payout success
    RewardHistory.tsx       — Transaction history list
    WalletProfile.tsx       — Wallet dashboard: balance, weekly chart, treasury
    StudentProfile.tsx      — Profile: stats + 6 achievement badges
    BottomNav.tsx           — Floating pill-style bottom navigation
    Navbar.tsx              — Top bar with logo
    agents.ts               — 5 pure client-side agent hint functions
    contract.ts             — Soroban read-only view calls (treasury info)
    wallet.ts               — StellarWalletsKit + Horizon + Friendbot
    customIcons.tsx         — Custom SVG icon components
vault/                      — Design docs (Obsidian)
```

---

## Setup — Run Locally

```bash
# 1. Clone
git clone https://github.com/TadeyRuk/Achievo.git
cd Achievo

# 2. Install dependencies
cd frontend && npm install && cd ..

# 3. Set environment variables
cp .env.local.example .env.local
# Add your ADMIN_SECRET (Stellar secret key) and GROQ_API_KEY

# 4. Start dev server (Vercel CLI handles API + frontend together)
npx vercel dev
# → http://localhost:3000
```

> Requires a Stellar wallet to connect — **Albedo** works on mobile (web-based), **Freighter** on desktop.

---

## Build the Contract (Rust)

```bash
cd contract
cargo build --release --target wasm32v1-none
```

> **Note:** Requires the `wasm32v1-none` target. The `wasm32-unknown-unknown` target is incompatible with Soroban SDK 26+ on Rust 1.82+.

---

## Environment Variables

| Variable | Description |
|---|---|
| `ADMIN_SECRET` | Stellar secret key of the treasury admin account |
| `GROQ_API_KEY` | Groq API key for AI activity evaluation |
| `NONCE_HMAC_SECRET` | Secret for signing wallet challenge nonces |

---

## License

MIT
