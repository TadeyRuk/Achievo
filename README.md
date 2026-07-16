<p align="center">
  <img src="frontend/public/only_logo.png" alt="Achievo Logo" width="96" />
</p>

# Achievo — AI Student Reward System on Stellar

> Earn XLM automatically for your academic achievements — powered by a 5-agent AI pipeline and Soroban smart contracts on the Stellar Testnet.

Students connect their wallet, describe what they did, and Achievo's AI pipeline evaluates the submission and sends XLM directly to their wallet — no manual approval, no middleman.

**[Live Demo →](https://achievo-rust.vercel.app)** · Production deploy: `feat/persistent-agent-layer` @ [`03867f3`](https://github.com/TadeyRuk/Achievo/commit/03867f3)

### Production health (verified 2026-07-10)

| Check | Result |
|---|---|
| App loads | ✅ https://achievo-rust.vercel.app |
| Wallet challenge | ✅ `GET /api/nonce?wallet=G...` returns `nonce`, `mac`, `challengeXdr` |
| Reward API | ✅ `POST /api/reward` validates challenges (`NONCE_HMAC_SECRET` + `ADMIN_SECRET` configured) |
| AI scoring | ✅ Groq-backed `ScoringAgent` (requires valid signed challenge to reach) |
| Treasury contract | ✅ `CCQVKUU2…` — **1,000 testnet XLM** on-chain |
| On-chain payouts (current contract) | ⚠️ **0** `send_reward` events yet — legacy QA used the [previous contract](https://stellar.expert/explorer/testnet/contract/CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM) |
| User feedback stored | ⚠️ `GET /api/feedback` → `count: 0` (needs live testers) |
| Payout ledger API | 🔜 `GET /api/payouts` on this branch — deploy to enable on production |

**Quick smoke test:** connect Freighter on **Testnet**, submit *“I tutored calculus for one hour”*, approve the challenge signature when **Kouri Agent** runs — you should receive a tx hash and XLM (1 reward per wallet per 24h).

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

**CI Pipeline (example passing run):**
<p align="center">
  <img src="docs/screenshots/ci-green.png" width="70%" alt="GitHub Actions CI — Frontend + Contract jobs" />
</p>

> **Note:** Latest pushes on `feat/persistent-agent-layer` may fail ESLint (`setState` in `useEffect` in `App.tsx`). Contract + Vitest suites pass locally.

**Analytics & Monitoring (PostHog):** Client events `wallet_connected`, `activity_submitted`, `reward_paid`, and transaction feedback are instrumented in `frontend/src/main.tsx`. Set `VITE_POSTHOG_KEY` on Vercel to enable. Capture a dashboard screenshot for submission proof before Level 4.

---

## Features

- 🤖 **5-Agent AI Pipeline** — Activity → Verification → Reward → Kouri → Feedback
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
         ├── Kouri Agent       — nonce challenge → wallet signs → POST /api/reward → send_reward() on Soroban
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

> **Tester guide:** share [`docs/LEVEL4_TESTER_CHECKLIST.md`](docs/LEVEL4_TESTER_CHECKLIST.md) with classmates (Freighter Testnet + connect steps).  
> **Auto-export proof:** `npm run export-payout-proof` → [`docs/generated/level4-payout-proof.md`](docs/generated/level4-payout-proof.md)

The table below is a **snapshot** from June 2026 QA on the **legacy** contract. Regenerate the combined proof file after new test sessions — it merges legacy StellarExpert events + the current contract’s on-chain `get_history`.

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
June 14–16, 2026 dev/QA window** on the **legacy** contract (`CDLRRHTN…MSCSNM`). The **current**
contract (`CCQVKUU2…`) has **0 payouts** as of 2026-07-10 — complete at least one live payout on
[achievo-rust.vercel.app](https://achievo-rust.vercel.app) to populate `get_history` and the in-app feed.

| Level 4 proof target | Current status |
|---|---|
| ≥10 on-chain transactions | 9/10 (legacy only) |
| ≥10 unique wallets | 2/10 |

Wallet diversity is capped by the `1 reward per wallet per day` rate limit in `api/reward.ts`.
Regenerate counts with `npm run export-payout-proof`. Share
[`docs/LEVEL4_TESTER_CHECKLIST.md`](docs/LEVEL4_TESTER_CHECKLIST.md) with classmates to close the gap.

Legacy events: [StellarExpert (legacy contract)](https://stellar.expert/explorer/testnet/contract/CDLRRHTNRQ2BGA7ESIXAMIQ2YNL3IF5PP5K6GPH2WR3IEYL7INMSCSNM).
Live feed: Soroban RPC `getEvents` + `get_history` (see `frontend/src/contract.ts`, `RecentPayouts.tsx`).
PostHog tracks wallet connects and submissions beyond this table (see [Analytics & Monitoring](#analytics--monitoring)).

---

## Project Structure

```
contract/                   — Soroban treasury contract (Rust)
api/
  nonce.ts                  — Issues HMAC-signed wallet challenge nonces
  reward.ts                 — ScoringAgent + IntegrityAgent + admin signs send_reward tx
  feedback.ts               — POST/GET user ratings (Redis); summaryMarkdown for Level 4
  payouts.ts                — GET server-side payout ledger (after deploy)
  _lib/store.ts             — Upstash Redis (rate limits, nonces, feedback, payouts)
  _lib/telegram.ts          — Optional Telegram notifications
  _agents/scoring.ts        — Groq activity classification + effort score
  _agents/integrity.ts      — Duplicate / abuse soft-flags
scripts/
  export-payout-proof.mjs   — Auto-generate docs/generated/level4-payout-proof.md
docs/
  LEVEL4_TESTER_CHECKLIST.md
  legacy-payouts.json       — Static legacy tx rows for proof export
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
# 13 test files, 68 tests: contract helpers, RecentPayouts UI, feedback summary,
# property-based tests (fast-check), agent utilities
```

**Payout proof export (Level 4):**
```bash
npm run export-payout-proof
# → docs/generated/level4-payout-proof.md (legacy + current contract stats)
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
| `transaction_feedback_submitted` | User rates a payout after the reward modal | `tx_hash`, `rating`, `has_comment` |
| `transaction_feedback_skipped` | User skips the post-payout feedback sheet | `tx_hash` |

Initialization is guarded on `VITE_POSTHOG_KEY` being present, so local/CI builds without the
key run normally with analytics simply disabled — no PostHog account is required to build,
test, or develop the app. See [Environment Variables](#environment-variables) for setup.

---

## User Feedback

After every successful on-chain payout, students see a **Quick feedback** sheet (1–5 stars + optional comment). Responses are stored server-side via `POST /api/feedback`, keyed by transaction hash (one submission per payout).

**Live summary (for README / Level 4):** `GET /api/feedback` returns aggregate stats plus a ready-to-paste `summaryMarkdown` field:

```bash
curl -s https://achievo-rust.vercel.app/api/feedback | jq '{count, averageRating, summaryMarkdown, highlights}'
```

| Field | Purpose |
|---|---|
| `distribution` | Count per star rating (1–5) |
| `highlights` | Bullet points for submission write-ups |
| `summaryMarkdown` | Paste into README after testing |
| `recentComments` | Latest written feedback (anonymized in UI) |

PostHog also tracks `transaction_feedback_submitted` and `transaction_feedback_skipped` events.

| Event | When |
|---|---|
| `transaction_feedback_submitted` | User submits a star rating (and optional comment) |
| `transaction_feedback_skipped` | User dismisses or skips the sheet |

---

## Sample Feedback (Documentation)

> **Generated documentation data — not live user feedback.** The 14 entries below illustrate the feedback export format. Each has a unique, generated 64-character transaction-hash-shaped identifier; none represents an on-chain transaction or a stored production response.

| # | Rating | Feedback | Generated transaction hash |
|---|---:|---|---|
| 1 | 5/5 | “The wallet signature step was clear and the reward appeared right away.” | `58fb460f215f8b488291bfc2bfa8fb36e3d545c53250352e594a50261e02e239` |
| 2 | 5/5 | “I liked seeing the activity score before the XLM payout.” | `c9c2bb891623d8cc2a32839296dcb9bef5eaed242e61e2dfd8e7de532843d2f7` |
| 3 | 4/5 | “Smooth flow overall; a short note on testnet wallets would help.” | `d2c517ef6ef0f2ded611488cf6e643f2000c8dab6639fb0e08bcca8b2e4a6f34` |
| 4 | 5/5 | “The confirmation card made it easy to verify what I earned.” | `2af0e1995abcbb0fce0de86210f50c3c0b419e8efd55f59d881695a351770d2f` |
| 5 | 4/5 | “Good feedback prompt after the payout, without being distracting.” | `bba1c85891238a2b46adc29cda097b452fa75e66578ff84e57472e7299a32793` |
| 6 | 5/5 | “The AI explanation felt fair for my tutoring activity.” | `5f412c7b9f964469ee665cf0379cc95ebbe32d2e6756d1fa40616db6f2d7b5a2` |
| 7 | 5/5 | “I could follow every stage from submission to reward.” | `74fcaaba09b0107e6ab76567f5e0c3a297bf0a41cf1e0c680316ec0d3fb986c8` |
| 8 | 4/5 | “Nice interface; I would enjoy a little more detail in reward history.” | `33b4532e2166a86106be3615c1e59e71bbd2d0303e5e81ba9d042c3177d2398f` |
| 9 | 5/5 | “Connecting Freighter and signing the challenge was straightforward.” | `76b243b1d30f65ad045e21cf1ee864d338fb5c9cb61f4a80435a1d0911eb7855` |
| 10 | 5/5 | “The scholar-rank progress gives me a reason to keep contributing.” | `fd9425afa59df17db67519bb2441b65a5811b7b7ba26c8faea1d5fac12b9835f` |
| 11 | 4/5 | “The reward arrived quickly; clearer mobile wallet guidance would help.” | `92147e9a008ab83a466702b7857a5248e42f3a21824196377b0e1bdfb858783e` |
| 12 | 5/5 | “The payout hash and amount were easy to find after submitting.” | `b3ff697a408c4f5841ae0d7cc3cdb63068f7ef1a8ff05b920e2ce3d9d46c1eb6` |
| 13 | 5/5 | “A rewarding way to recognize volunteering work.” | `ee0dd61332cad1f44c5d29e29473f701d83b8c9657d5273bc67d30270e5ae510` |
| 14 | 4/5 | “Everything worked well; I would like notification preferences later.” | `d9ef01937e733ead662403807dc440e89a2500fdb96600b70329e488c8d9f574` |

**Sample summary:** 14 responses, average rating **4.64/5** (9 five-star and 5 four-star ratings).

---

## Telegram Activity Feed (optional)

When `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set on Vercel, every successful payout and every feedback submission posts to your Telegram channel or group — a live, visual ledger for demos and Level 4 proof.

**Setup:**

1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token.
2. Create a channel (e.g. `Achievo Payouts`) or use a group; add the bot as **admin** (channels) or member (groups).
3. Get the chat ID (`@userinfobot` for DMs, or forward a channel post to `@RawDataBot`).
4. Add to Vercel → Settings → Environment Variables:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID` (e.g. `-1001234567890` for channels)

**Server-side payout log:** `GET /api/payouts` returns payouts recorded in Redis after each successful `POST /api/reward` (count, unique wallets, total XLM, entries). Complements on-chain `get_history` and Telegram history. **Requires deploying this branch** — not yet on production as of 2026-07-10.

```bash
curl -s https://achievo-rust.vercel.app/api/payouts | jq '{count, uniqueWallets, totalXlm}'
# After deploy: same URL returns ledger stats
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
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limits, feedback, payout ledger) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather (optional activity feed) |
| `TELEGRAM_CHAT_ID` | Telegram channel/group chat ID (optional activity feed) |
| `VITE_POSTHOG_KEY` | PostHog project API key (public, client-side). Omit to run with analytics disabled. |
| `VITE_POSTHOG_HOST` | PostHog ingestion host. Optional — defaults to `https://us.i.posthog.com`. |

---

## License

MIT
