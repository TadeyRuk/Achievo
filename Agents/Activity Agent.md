# 🎯 Activity Agent

## 📋 Role
Interprets student-submitted activities written in natural language into structured data.

## 📥 Inputs
- Raw text from student: *"I attended the Rust programming workshop yesterday."* or *"I helped tutor two classmates in discrete math."*

## 📤 Outputs
Returns structured JSON data:
```json
{
  "activity": "workshop",
  "valid": true,
  "suggested_reward": "2 XLM"
}
```

## 🛠️ Implementation Strategy
- **Phase 1 (MVP)**: Simple regex and keyword classification (e.g., matching "tutor" -> tutoring, "workshop" -> workshop).
- **Phase 2 (Upgrade)**: Prompting a lightweight LLM (e.g., Gemini API) to classify the activity and extract context.

## 🔗 Related Notes
- Back to [[Index]]
- Proceed to [[Verification Agent]]
