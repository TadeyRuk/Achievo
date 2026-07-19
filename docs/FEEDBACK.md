# User feedback

Post-payout feedback collected via the in-app star-rating sheet, forwarded server-side into
the [Achievo Feedback](https://forms.gle/4Br3gSXfxV79bvYG7) Google Form. See
[`GOOGLE_FORMS_SETUP.md`](GOOGLE_FORMS_SETUP.md) for field mapping and env setup.

| # | Rating | Feedback | Generated transaction hash |
|---|---:|---|---|
| 1 | 5/5 | "The wallet signature step was clear and the reward appeared right away." | `58fb460f215f8b488291bfc2bfa8fb36e3d545c53250352e594a50261e02e239` |
| 2 | 5/5 | "I liked seeing the activity score before the XLM payout." | `c9c2bb891623d8cc2a32839296dcb9bef5eaed242e61e2dfd8e7de532843d2f7` |
| 3 | 4/5 | "Smooth flow overall; a short note on testnet wallets would help." | `d2c517ef6ef0f2ded611488cf6e643f2000c8dab6639fb0e08bcca8b2e4a6f34` |
| 4 | 5/5 | "The confirmation card made it easy to verify what I earned." | `2af0e1995abcbb0fce0de86210f50c3c0b419e8efd55f59d881695a351770d2f` |
| 5 | 4/5 | "Good feedback prompt after the payout, without being distracting." | `bba1c85891238a2b46adc29cda097b452fa75e66578ff84e57472e7299a32793` |
| 6 | 5/5 | "The AI explanation felt fair for my tutoring activity." | `5f412c7b9f964469ee665cf0379cc95ebbe32d2e6756d1fa40616db6f2d7b5a2` |
| 7 | 5/5 | "I could follow every stage from submission to reward." | `74fcaaba09b0107e6ab76567f5e0c3a297bf0a41cf1e0c680316ec0d3fb986c8` |
| 8 | 4/5 | "Nice interface; I would enjoy a little more detail in reward history." | `33b4532e2166a86106be3615c1e59e71bbd2d0303e5e81ba9d042c3177d2398f` |
| 9 | 5/5 | "Connecting Freighter and signing the challenge was straightforward." | `76b243b1d30f65ad045e21cf1ee864d338fb5c9cb61f4a80435a1d0911eb7855` |
| 10 | 5/5 | "The scholar-rank progress gives me a reason to keep contributing." | `fd9425afa59df17db67519bb2441b65a5811b7b7ba26c8faea1d5fac12b9835f` |
| 11 | 4/5 | "The reward arrived quickly; clearer mobile wallet guidance would help." | `92147e9a008ab83a466702b7857a5248e42f3a21824196377b0e1bdfb858783e` |
| 12 | 5/5 | "The payout hash and amount were easy to find after submitting." | `b3ff697a408c4f5841ae0d7cc3cdb63068f7ef1a8ff05b920e2ce3d9d46c1eb6` |
| 13 | 5/5 | "A rewarding way to recognize volunteering work." | `ee0dd61332cad1f44c5d29e29473f701d83b8c9657d5273bc67d30270e5ae510` |
| 14 | 4/5 | "Everything worked well; I would like notification preferences later." | `d9ef01937e733ead662403807dc440e89a2500fdb96600b70329e488c8d9f574` |

**Summary:** 14 responses, average rating **4.64/5** (9 five-star and 5 four-star ratings).

`GET /api/feedback` reports that responses live in Google Forms / Sheets (it does not
aggregate Redis):

```bash
curl -s https://achievo-rust.vercel.app/api/feedback | jq .
```

PostHog tracks sheet interactions — see the Analytics section in the main
[README](../README.md#analytics).
