# 💰 Reward Decision Agent

## 📋 Role
Assigns the XLM reward value based on the verified activity type.

## 📥 Inputs
- Verified activity payload from [[Verification Agent]].

## 📤 Outputs
```json
{
  "reward": 5,
  "currency": "XLM"
}
```

## 🛠️ Implementation Strategy
Rule-based matching table:

| Activity | Reward Value (XLM) |
| :--- | :---: |
| `tutoring` | 5 XLM |
| `workshop` | 2 XLM |
| `volunteering` | 10 XLM |
| `event participation` | 5 XLM |

## 🔗 Related Notes
- Back to [[Index]]
- Proceed to [[Stellar Agent]]
