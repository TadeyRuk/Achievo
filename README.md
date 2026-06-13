# 🤖 Achievo AI Agent System (Design Plan)

## 🧠 Core Idea

Achievo uses a multi-agent system to manage the entire reward lifecycle:

> From student activity submission → verification → reward decision → Stellar XLM payout.

Each responsibility is handled by a specialized “agent” (can be real AI or simulated logic in the MVP).

---

# 🧩 System Overview

```text
Student Action
      ↓
Activity Agent
      ↓
Verification Agent
      ↓
Reward Decision Agent
      ↓
Blockchain Agent (Stellar / XLM)
      ↓
Transaction Feedback Agent
      ↓
User Notification (UI)
```

---

# 🧑‍💻 The AI Agents

## 1. 🎯 Activity Agent

### Role
Interprets student-submitted activities into structured data.

### Input
- "I attended a workshop"
- "I helped tutor 2 classmates"

### Output

```json
{
  "activity": "tutoring",
  "valid": true,
  "suggested_reward": "5 XLM"
}
```

### Implementation (MVP)
- Rule-based parser OR
- Simple keyword classification OR
- Optional LLM prompt

---

## 2. 🛡️ Verification Agent

### Role
Validates if the activity is allowed or recognized.

### MVP Logic
Simple whitelist check:

Allowed activities:
- workshop
- tutoring
- volunteering
- event participation

### Output

```json
{
  "status": "approved"
}
```

or

```json
{
  "status": "rejected",
  "reason": "Invalid activity"
}
```

---

## 3. 💰 Reward Decision Agent

### Role
Assigns XLM reward based on activity type.

### Reward Rules

| Activity | Reward |
|----------|--------|
| tutoring | 5 XLM |
| workshop | 2 XLM |
| volunteering | 10 XLM |
| event participation | 5 XLM |

### Output

```json
{
  "reward": 5,
  "currency": "XLM"
}
```

---

## 4. ⛓️ Blockchain Agent (Stellar Agent)

### Role
Handles all blockchain transactions.

### Responsibilities
- Connect to Stellar SDK
- Build transaction
- Send XLM from treasury wallet
- Return transaction hash

### Output

```json
{
  "success": true,
  "txHash": "ABCD1234..."
}
```

---

## 5. 📣 Transaction Feedback Agent

### Role
Formats transaction results for UI display.

### Output Examples

### Success

```text
🎉 Reward Sent!

+5 XLM to your wallet
Transaction Hash: ABCD1234
```

### Failure

```text
❌ Transaction Failed

Please try again later.
```

---

# 🧠 Optional AI Layer (Upgrade Feature)

Instead of pure rules, you can use AI for interpretation:

## Prompt Example

```text
You are a campus reward system.

Classify the student activity and assign a reward in XLM.

Activity: "I helped organize a coding workshop"

Return JSON only.
```

---

# 🏗️ Architecture Options

## Option A — Simple MVP (Recommended)

Each agent is a function:

- activityAgent()
- verificationAgent()
- rewardAgent()
- stellarAgent()

✔ Fast  
✔ Easy  
✔ Hackathon-safe  
✔ No AI cost  

---

## Option B — AI-Enhanced System

Use LLM for:
- activity classification
- reward suggestions
- message generation

---

## Option C — Hybrid System (Best)

| Layer | Type |
|------|------|
| Activity parsing | AI |
| Verification | Rules |
| Reward logic | Rules |
| Stellar transaction | SDK |
| Messaging | AI |

---

# 🔄 Full End-to-End Flow

```text
1. Student submits activity
        ↓
2. Activity Agent interprets input
        ↓
3. Verification Agent approves activity
        ↓
4. Reward Agent assigns XLM value
        ↓
5. Blockchain Agent sends XLM
        ↓
6. Transaction Agent returns result
        ↓
7. UI displays reward confirmation
```

---

# 💡 Why This Matters

Instead of being just a wallet app, Achievo becomes:

> An AI-assisted reward distribution system powered by Stellar.

This makes the project significantly more impressive in a hackathon context.

---

# 🚀 MVP Recommendation

### Must Implement
- Freighter Wallet integration
- Stellar XLM transaction (testnet)
- Reward logic (rule-based agent)
- Basic activity submission UI

### Optional
- AI classification (Activity Agent)
- Smart reward suggestions

---

# 🧭 Summary

Achievo’s AI agent system simulates intelligent decision-making across:

- Understanding student actions
- Validating contributions
- Assigning fair rewards
- Executing blockchain transactions
- Returning user-friendly feedback

This structure keeps the system modular, scalable, and hackathon-ready.
