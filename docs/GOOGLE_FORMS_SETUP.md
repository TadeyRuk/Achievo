# Google Forms feedback setup

Achievo posts in-app feedback to a single Google Form (system of record). Users
never see the Form UI — `POST /api/feedback` and `POST /api/feedback-general`
submit server-side.

## Form columns

| Column | Env var | Used by |
|---|---|---|
| Type (`general` / `transaction`) | `GOOGLE_FORM_ENTRY_TYPE` | both |
| Rating (1–5) | `GOOGLE_FORM_ENTRY_RATING` | both |
| Comment | `GOOGLE_FORM_ENTRY_COMMENT` | both |
| Name | `GOOGLE_FORM_ENTRY_NAME` | general |
| Wallet | `GOOGLE_FORM_ENTRY_WALLET` | transaction |
| Reward | `GOOGLE_FORM_ENTRY_REWARD` | transaction |
| Activity | `GOOGLE_FORM_ENTRY_ACTIVITY` | transaction |
| Tx hash | `GOOGLE_FORM_ENTRY_TXHASH` | transaction |

Also set `GOOGLE_FORM_ID` to the form’s id (from the edit/view URL).

## How to find entry IDs

1. Open the form → Preview.
2. Inspect a field’s `name` attribute (`entry.1234567890`).
3. Map each field to the env vars above on Vercel (Production / Preview / Development).
4. Redeploy after changing env vars.

## Live form

[Achievo Feedback](https://forms.gle/4Br3gSXfxV79bvYG7)

## Notes

- Transaction feedback is claim-once per tx hash (Redis).
- General feedback is IP-throttled.
- On Forms failure after a claim, the API releases the claim so the user can retry.
