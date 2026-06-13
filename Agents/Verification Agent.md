# 🛡️ Verification Agent

## 📋 Role
Validates if the interpreted activity is allowed, recognized, and matches authorization rules.

## 📥 Inputs
Output from the [[Activity Agent]] containing:
- Activity type (e.g. `tutoring`, `workshop`, `volunteering`, `event participation`)

## 📤 Outputs
- **Approved**:
  ```json
  {
    "status": "approved"
  }
  ```
- **Rejected**:
  ```json
  {
    "status": "rejected",
    "reason": "Invalid activity type"
  }
  ```

## 🛠️ Implementation Strategy
- **Phase 1 (MVP)**: Whitelist match check. Allowed activities are:
  - `workshop`
  - `tutoring`
  - `volunteering`
  - `event participation`
- **Phase 2 (Upgrade)**: Check against a database of registered events or signed sheets by supervisors.

## 🔗 Related Notes
- Back to [[Index]]
- Proceed to [[Reward Decision Agent]]
