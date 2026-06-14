# Rise In — Stellar Journey to Mastery Checklist

## Level 1 — White Belt ✅

### Wallet Setup
- [x] Set up Freighter wallet integration
- [x] Use Stellar Testnet

### Wallet Connection
- [x] Implement wallet connect functionality
- [x] Implement wallet disconnect functionality

### Balance Handling
- [x] Fetch connected wallet's XLM balance
- [x] Display balance clearly in UI

### Transaction Flow
- [x] Send XLM transaction on Stellar testnet
- [x] Show transaction feedback (success/failure state)
- [x] Show transaction hash or confirmation message

### Development Standards
- [x] UI setup
- [x] Wallet integration
- [x] Balance fetch
- [x] Transaction logic
- [x] Error handling

### Submission Checklist
- [x] Public GitHub repository
- [x] README.md file
- [ ] **Readme includes:**
  - [ ] Project description
  - [ ] Setup instructions (how to run locally)
  - [ ] Screenshots:
    - [ ] Wallet connected state
    - [ ] Balance displayed
    - [ ] Successful testnet transaction
    - [ ] Transaction result shown to user

---

## Level 2 — Yellow Belt 🏗️

### Core Requirements
- [x] 3+ error types handled (in `api/reward.ts`)
  - [x] User wallet not found / invalid address
  - [x] Insufficient treasury balance
  - [x] Contract/account not found on network
- [x] Contract deployed on testnet
  - Contract ID: `CAIYYR6UKRUVAYY56CKLNQDEPUR3PGZL3CUXWKH3TJKJ4MIDZYO4WJAJ`
- [x] Contract called from frontend (via Vercel API → `send_reward`)
  - [x] `initialize` (one-time setup, done)
  - [x] `send_reward` (called by API on each student submission)
  - [x] `get_balance` / `get_disbursed` / `get_admin` (view calls from browser)
- [x] Transaction status visible (pipeline stepper in UI)
- [x] Minimum 2+ meaningful commits (5+ already)

### Architecture
- [ ] **Vercel API route** `api/reward.ts` — holds admin key, runs agents, signs tx
- [ ] Student wallet = receive-only (read-only connection, no signing required)
- [ ] Rate limiting: 1 reward per wallet per day

### Submission Checklist
- [x] Public GitHub repository
- [x] Minimum 2+ meaningful commits
- [ ] README with setup instructions
- [ ] **README must include:**
  - [ ] Live demo link (Vercel deploy)
  - [ ] Deployed contract address: `CAIYYR6UKRUVAYY56CKLNQDEPUR3PGZL3CUXWKH3TJKJ4MIDZYO4WJAJ`
  - [ ] Transaction hash of `send_reward` call (verifiable on Stellar Explorer)
  - [ ] Screenshots:
    - [ ] Wallet connected (student receive-only)
    - [ ] Pipeline running
    - [ ] Reward sent + tx hash on StellarExpert

---

## Level 3 — Orange Belt 🚀

### Advanced Smart Contract Development
- [ ] Inter-contract communication
- [ ] Event streaming & real-time updates
- [ ] Write tests for contracts
  - [ ] Unit tests (cargo test)
  - [ ] 3+ passing tests

### Production-Ready Frontend
- [ ] Mobile responsive frontend development
- [ ] Error handling & loading states
- [ ] Write tests for frontend
  - [ ] Component tests
  - [ ] Integration tests

### Deployment & CI/CD
- [ ] CI/CD pipeline setup
- [ ] Smart contract deployment workflow
- [ ] Production-ready architecture practices
- [ ] Documentation & demo presentation

### Development Standards
- [ ] Minimum 10+ meaningful commits
- [ ] Complete documentation

### Submission Checklist
- [ ] Public GitHub repository
- [ ] README with complete documentation
- [ ] Minimum 10+ meaningful commits
- [ ] Live demo link (Vercel, Netlify, or similar)
- [ ] Contract deployment address
- [ ] Transaction hash for contract interaction
- [ ] Screenshots showing:
  - [ ] Mobile responsive UI
  - [ ] CI/CD pipeline running
  - [ ] Test output with 3+ passing tests
- [ ] Demo video link (1–2 minutes)
- [ ] Idea submission for Level 4+

---

## Level 4–7 (Locked Until Idea Approved)

### Idea Submission Requirements
- [ ] Problem statement
- [ ] Why Stellar?
- [ ] Target users
- [ ] Technical architecture (Frontend + Contract + Data flow)
- [ ] Complexity evaluation
- [ ] Roadmap:
  - [ ] MVP phase
  - [ ] User acquisition plan
  - [ ] Mainnet vision

**Status**: Do not start development until idea is reviewed and approved by Stellar Builder Team.

---

## Prizes

- **Level 2 Winner**: $10
- **Level 3 Winner**: $50
- **Levels 4–6**: TBD (based on complexity & execution)
