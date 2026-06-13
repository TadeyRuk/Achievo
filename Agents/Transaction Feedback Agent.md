# 📣 Transaction Feedback Agent

## 📋 Role
Formats raw transaction hashes, ledger events, or error codes into friendly UI display messages for the student.

## 📥 Inputs
- Transaction response status from [[Stellar Agent]].

## 📤 Outputs

### Success Output
```text
🎉 Reward Sent!
+5 XLM to your wallet
Transaction Hash: ABCD1234
```

### Failure Output
```text
❌ Transaction Failed
Reason: [Error message details]
Please try again later.
```

## 🛠️ Implementation Strategy
- Mapping typical Stellar Horizon SDK error codes (e.g. `tx_bad_seq`, `op_underfunded`) to human-friendly feedback.
- Format text dynamically for the frontend to render.

## 🔗 Related Notes
- Back to [[Index]]
- Review [[System Overview]]
