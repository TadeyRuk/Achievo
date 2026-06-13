# 🚀 MVP Roadmap

A quick checklist of core requirements for the hackathon-ready version.

---

## 🎯 High-Priority Backlog

- [ ] **Freighter Wallet Integration**
  - Prompt user to connect their Stellar Freighter browser extension.
  - Retrieve current wallet address.

- [ ] **Stellar transaction (Testnet)**
  - Treasury account key storage setup in `.env`.
  - SDK transaction build, sign, and broadcast.

- [ ] **Agent Pipeline Engine**
  - Implement rule-based/keyword parser for the Activity Agent.
  - Implement validation logic in the Verification Agent.
  - Implement lookup rules in the Reward Decision Agent.

- [ ] **UI Submission Page**
  - Simple, modern dashboard showing:
    - User wallet and balance.
    - Submit field: "What did you do today?"
    - Visual timeline of the agents processing the request.
    - Success banner with a clickable link to StellarExpert explorer.
