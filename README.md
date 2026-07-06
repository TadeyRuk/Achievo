<p align="center">
  <img src="frontend/public/only_logo.png" alt="Achievo Logo" width="96" />
</p>

# Achievo — AI Student Reward System on Stellar

> Earn XLM automatically for your academic achievements — powered by a 5-agent AI pipeline and Soroban smart contracts on the Stellar Testnet.

Students connect their wallet, describe what they did, and Achievo's AI pipeline evaluates the submission and sends XLM directly to their wallet — no manual approval, no middleman.

**[Live Demo →](https://achievo-rust.vercel.app)**

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/7a7c6956-f839-4354-ad44-1de7243da92a.jpeg" width="22%" alt="Home" />
  <img src="docs/screenshots/ce517080-4294-4760-8b2c-a82e827c0763.jpeg" width="22%" alt="Community Pulse" />
  <img src="docs/screenshots/c01b6332-92b9-4e87-a425-309bddc3017f.jpeg" width="22%" alt="AI Pipeline" />
  <img src="docs/screenshots/593164cc-1ced-4da1-b54e-9e868dd12a8e.jpeg" width="22%" alt="Reward Confirmation" />
</p>
<p align="center">
  <img src="docs/screenshots/bf381d31-294b-42f6-96f0-6a00aa35031b.jpeg" width="22%" alt="Profile" />
  <img src="docs/screenshots/bd77e0f7-3a15-4e2d-a8d2-45e3d079a76c.jpeg" width="22%" alt="Milestones" />
  <img src="docs/screenshots/99aae065-bceb-4b2a-8f03-268720534581.jpeg" width="22%" alt="Avatar Picker" />
</p>

**Mobile (full-bleed) vs Desktop (phone-frame bezel):**
<p align="center">
  <img src="docs/screenshots/mobile-home.png" width="22%" alt="Mobile — full-bleed" />
  <img src="docs/screenshots/desktop-phone-frame.png" width="45%" alt="Desktop — phone frame" />
</p>

**CI Pipeline (both jobs green):**
<p align="center">
  <img src="docs/screenshots/ci-green.png" width="70%" alt="GitHub Actions CI — Frontend + Contract both passing" />
</p>

**Analytics & Monitoring (PostHog):**
<p align="center">
  <img src="docs/screenshots/analytics-posthog.png" width="70%" alt="PostHog dashboard — pageviews, wallet_connected, activity_submitted, reward_paid events" />
</p>

---

## Features

- 🤖 **5-Agent AI Pipeline** — Activity → Verification → Reward → Stellar → Feedback
- ⛓️ **On-Chain Payouts** — XLM sent via Soroban treasury contract, every transaction verifiable on StellarExpert
- 🔐 **Wallet Ownership Proof** — nonce-based challenge/signature before every payout (prevents spoofing)
- 📱 **PWA / Mobile Ready** — installable on iOS & Android, offline-capable, network-first service worker
- 🏆 **Reward History** — local transaction log with weekly earnings trend chart
- 🎖️ **Scholar Rank System** — 5 progressive badges (Bronze → Diamond) unlocked by XP, streaks, and activity milestones
- 🏅 **3D Animated Badges** — spinning coin display with per-badge 3D hover effect
- 🔥 **Activity Streaks** — consecutive daily participation tracked live
- 📊 **Community Dashboard** — activity feed showing your rewards alongside simulated community pulse
- 👥 **Refer-a-Friend** — unique referral code + one-tap share to WhatsApp, X, Email, or system share sheet
- 👛 **Multi-Wallet Support** — Freighter (desktop), Albedo, xBull, Lobstr — with official brand logos
- 🔔 **Connection Modals** — animated success/confirmation overlays for wallet connect and disconnect

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

## Scholar Rank System

XP is earned at **100 XP per XLM received**. Each rank has a badge with a 3D animated coin display and hover effect.

| Rank     | XP Required | Additional Requirements              |
|----------|-------------|--------------------------------------|
| 🥉 Bronze   | 0           | Default starting rank                |
| 🥈 Silver   | 1,000 XP    | ≥ 1 volunteering activity            |
| 🥇 Gold     | 2,500 XP    | ≥ 1 tutoring or math activity        |
| 💠 Platinum | 5,000 XP    | ≥ 1 workshop + 3-day streak          |
| 💎 Diamond  | 10,000 XP   | ≥ 1 science activity + 5-day streak  |

---

## App Tabs

| Tab | Component | Description |
|-----|-----------|-------------|
| **Home** | `Dashboard.tsx` | Community feed, streak card, quick-submit CTA, wallet prompt |
| **History** | `RewardHistory.tsx` | Full transaction log with amounts and timestamps |
| **Wallet** | `WalletProfile.tsx` | Balance hero card, weekly earnings chart, treasury stats, wallet selector |
| **Profile** | `StudentProfile.tsx` | XP progress, scholar badge display, activity stats |
| *(overlay)* | `ReferFriend.tsx` | Referral code card + share sheet (WhatsApp, X, Email, More) |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Smart Contract | Rust / Soroban SDK 26.1 (Stellar Testnet) |
| Backend | Vercel serverless TypeScript (`api/reward.ts`, `api/nonce.ts`) |
| AI | Groq API — llama-3.1-8b-instant (activity classification + effort scoring) |
| Frontend | React 19 + Vite + TypeScript |
| Styling | Tailwind v4 + CSS custom properties (design tokens) |
| Animations | Motion (Framer Motion v11) — page transitions, 3D badge spin, modals |
| Wallet | StellarWalletsKit — Freighter, xBull, Albedo, Lobstr |
| Network | Stellar Testnet |

---

## Deployed Contract

| Item | Value |
|------|-------|
| Network | Stellar Testnet |
| Contract ID | `CCQVKUU2AYYWLKEUNZ47NXYLUB4SLN5YEB3EHQ76TCI5X4K5VEIW5PDS` |
| XLM Token (SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| Treasury Balance | 1,000 testnet XLM |
| Explorer | [View on StellarExpert](https://stellar.expert/explorer/testnet/contract/CCQVKUU2AYYWLKEUNZ47NXYLUB4SLN5YEB3EHQ76TCI5X4K5VEIW5PDS) |

> **Redeployed 2026-07-06.** The treasury was redeployed to add an on-chain
> `MAX_REWARD_PER_TX` cap (20 XLM) and a durable on-chain reward history
> (`get_history`/`get_reward`), so a leaked admin key or API bug can no longer
> drain the treasury in a single call. The wallet-interaction table below is a
> historical record from the previous contract deployment; the live app and
> Recent Payouts feed now point at the contract ID above.

---

## On-Chain Wallet Interactions

Every reward is a real `send_reward` call on the deployed treasury contract — each row below
is an independently verifiable Soroban event, decoded directly from the contract's on-chain
event log (topics `("reward", "sent")`).

| # | Date (UTC) | Recipient | Amount |
|---|---|---|---|
| 1 | 2026-06-14 14:05 | [GAWTHZ…GZGSED](https://stellar.expert/explorer/testnet/account/GAWTHZQUA75JWE4KHZW434VS3WJ6ETFAOBR42A5TG7I2W7OVASGZGSED) | 3.5 XLM |
| 2 | 2026-06-14 14:10 | [GAWTHZ…GZGSED](https://stellar.expert/explorer/testnet/account/GAWTHZQUA75JWE4KHZW434VS3WJ6ETFAOBR42A5TG7I2W7OVASGZGSED) | 3.5 XLM |
| 3 | 2026-06-14 17:08 | [GAWTHZ…GZGSED](https://stellar.expert/explorer/testnet/account/GAWTHZQUA75JWE4KHZW434VS3WJ6ETFAOBR42A5TG7I2W7OVASGZGSED) | 14 XLM |
| 4 | 2026-06-14 17:25 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 4.1 XLM |
| 5 | 2026-06-14 18:18 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 6 XLM |
| 6 | 2026-06-14 18:26 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 11 XLM |
| 7 | 2026-06-15 02:15 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 11 XLM |
| 8 | 2026-06-15 08:26 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 11 XLM |
| 9 | 2026-06-16 01:28 | [GBL55A…NGE7KB5](https://stellar.expert/explorer/testnet/account/GBL55A67ZYVI2VABOLPJEHKMNTYPPJHNT2KXN7ETVJXJHVXPXNGE7KB5) | 5.5 XLM |

**9 verified on-chain reward transactions, 69.6 XLM disbursed, across 2 wallets during the
June 14–16, 2026 dev/QA testing window.** Wallet diversity in this window is capped by the
contract's own `1 reward per wallet per day` rate limit (`api/reward.ts`) — each wallet could
only be paid once daily during solo testing. Every row is reproducible independently via the
[contract's event log on StellarExpert](https://stellar.expert/explorer/testnet/contract/CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM) (previous contract deployment, prior to the 2026-07-06 redeploy above)
or the Soroban RPC `getEvents` endpoint (see `getRewardEvents()` in `frontend/src/contract.ts`).
Wallet-connect and activity-submission events are additionally tracked client-side via
PostHog (see [Analytics & Monitoring](#analytics--monitoring)) as of this release, so live
usage after deployment continues to grow verifiable wallet interactions beyond this table.

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
    App.tsx                 — Root: tab state, pipeline orchestration, modals
    Dashboard.tsx           — Home tab: community feed, streak, quick-submit CTA
    ActivityForm.tsx        — Submission form with character counter
    PipelineVisualizer.tsx  — Animated 5-step pipeline + live log console
    RewardCard.tsx          — Gold reward card shown on payout success
    RewardHistory.tsx       — Transaction history list
    WalletProfile.tsx       — Wallet dashboard: hero balance, weekly trend chart, treasury
    StudentProfile.tsx      — Profile: XP progress, scholar rank badges (3D animated)
    ReferFriend.tsx         — Referral overlay: unique code + WhatsApp/X/Email share
    BottomNav.tsx           — Floating pill-style bottom navigation
    Navbar.tsx              — Top bar with logo and info modal trigger
    agents.ts               — 5 pure client-side agent hint functions
    contract.ts             — Soroban view calls + getEvents polling (live payout feed)
    RecentPayouts.tsx       — Live on-chain reward feed (polls every 15 s)
    wallet.ts               — StellarWalletsKit + Horizon + Friendbot
    customIcons.tsx         — Custom SVG icon components
vault/                      — Design docs (Obsidian)
```

---

## Demo Video

🎥 **[Watch the Achievo app presentation](./achievo-app-presentation-v2.mp4)**

This 2:38 walkthrough introduces the mobile PWA, academic activity submission flow,
5-agent reward pipeline, wallet proof step, Soroban payout confirmation, scholar
rank progress, and CI status.

---

## Testing

> **Recommended:** Use the **[live Vercel deployment](https://achievo-rust.vercel.app)** for evaluation. All environment variables (`ADMIN_SECRET`, `GROQ_API_KEY`, `NONCE_HMAC_SECRET`) are already configured there — the AI pipeline, wallet auth, and on-chain payouts work out of the box with no local setup required.

**Contract tests (Rust):**
```bash
cd contract && cargo test
# 18 tests: initialize, send_reward, per-tx cap, on-chain history, edge cases, event emission
```

**Frontend tests (Vitest + fast-check):**
```bash
cd frontend && npm test
# 8 test files, 29 tests: pure helpers (computeStartLedger, stroopsToXlm,
# decodeRewardEvent, filterByRecipient, mergePayouts) + RecentPayouts UI states,
# property-based tests (fast-check) for correctness across full value ranges
```

> **Note on real-time event feed:** Soroban RPC does not expose SSE or WebSocket streams for contract events — `getEvents` polling is the supported mechanism. Achievo polls every 15 seconds using the Soroban RPC `getEvents` endpoint, filtered by the `(reward, sent)` topic and the connected wallet address. This is architecturally equivalent to event streaming for Soroban.

Running locally requires manually setting env vars and a Vercel CLI session for the serverless API to work (see below).

---

## Analytics & Monitoring

Product usage is instrumented client-side with [PostHog](https://posthog.com) (`posthog-js`,
initialized in `frontend/src/main.tsx`). Autocapture + pageviews run by default; three custom
events track the core funnel end-to-end:

| Event | Fired when | Payload |
|---|---|---|
| `wallet_connected` | A wallet successfully connects (`handleConnect` in `App.tsx`) | `wallet_type` (Freighter/Albedo/xBull/Lobstr) |
| `activity_submitted` | A student submits an activity description | `length` of the submission |
| `reward_paid` | A reward transaction settles on-chain | `amount`, `activity`, `tx_hash` |

Initialization is guarded on `VITE_POSTHOG_KEY` being present, so local/CI builds without the
key run normally with analytics simply disabled — no PostHog account is required to build,
test, or develop the app. See [Environment Variables](#environment-variables) for setup.

---

## User Feedback

<!-- TODO: replace with real tester feedback before submission. -->

> Pending — real tester feedback notes to be added here.

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
| `VITE_POSTHOG_KEY` | PostHog project API key (public, client-side). Omit to run with analytics disabled. |
| `VITE_POSTHOG_HOST` | PostHog ingestion host. Optional — defaults to `https://us.i.posthog.com`. |

---

## License

MIT
