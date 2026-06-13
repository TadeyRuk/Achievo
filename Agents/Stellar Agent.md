# ⛓️ Stellar Agent (Blockchain Agent)

## 📋 Role
Handles all interaction with the Stellar blockchain network to execute payment transactions from the treasury account to the student's wallet.

## 📥 Inputs
- Recipient public key (student wallet address)
- XLM Reward amount from [[Reward Decision Agent]]

## 📤 Outputs
- **Success**:
  ```json
  {
    "success": true,
    "txHash": "ABCD1234..."
  }
  ```
- **Failure**:
  ```json
  {
    "success": false,
    "error": "Timeout / Insufficient funds"
  }
  ```

## 🛠️ Implementation Strategy
- Uses Stellar JavaScript SDK (connecting to Horizon testnet).
- Connects to treasury wallet credentials (environment variables).
- Builds a simple payment transaction operation and submits it.

## 🔗 Related Notes
- Back to [[Index]]
- Proceed to [[Transaction Feedback Agent]]
