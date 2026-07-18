import { IOSSheet } from "./IOSSheet";

interface InfoSheetProps {
  onDismiss: () => void;
}

const PIPELINE_STEPS = [
  { num: "1", name: "Activity Agent", desc: "Keyword pre-scan of your submission for a fast category hint." },
  { num: "2", name: "Verification Agent", desc: "Confirms the activity is on the approved whitelist." },
  { num: "3", name: "Reward Agent", desc: "Groq AI classifies the activity and scores your effort (0–1) to calculate final XLM." },
  { num: "4", name: "Kouri Agent", desc: "Admin key signs and submits send_reward() to the Soroban treasury contract on-chain." },
  { num: "5", name: "Feedback Agent", desc: "Returns your tx hash and reward amount for display." },
] as const;

const ACTIVITIES = [
  { a: "Volunteering", base: 10, max: 15 },
  { a: "Tutoring", base: 5, max: 10 },
  { a: "Workshop", base: 2, max: 5 },
  { a: "Event", base: 3, max: 5 },
  { a: "Participation", base: 3, max: 5 },
] as const;

export function InfoSheet({ onDismiss }: InfoSheetProps) {
  return (
    <IOSSheet onDismiss={onDismiss} aria-label="How Achievo works">
      <div className="space-y-7 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 pr-2 min-w-0">
            <h2 className="text-[22px] font-semibold text-[var(--dah-primary)] tracking-tight">
              How Achievo Works
            </h2>
            <p className="text-[13px] text-[var(--dah-on-surface-variant)]">
              AI pipeline + effort-based XLM rewards
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 pt-1 text-[17px] font-normal text-[var(--dah-outline)] active:opacity-60"
          >
            Close
          </button>
        </div>

        <section className="space-y-2">
          <p className="text-[13px] text-[var(--dah-on-surface-variant)] px-1">
            5-Agent Pipeline
          </p>
          <div className="rounded-[12px] bg-[var(--dah-surface-low)] overflow-hidden divide-y divide-[var(--dah-outline-variant)]/40">
            {PIPELINE_STEPS.map((s) => (
              <div key={s.num} className="flex gap-3 items-start px-4 py-3">
                <span className="w-6 h-6 rounded-full bg-[var(--dah-primary)] text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {s.num}
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--dah-on-surface)]">{s.name}</p>
                  <p className="text-[13px] text-[var(--dah-on-surface-variant)] leading-snug mt-0.5">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[13px] text-[var(--dah-on-surface-variant)] px-1">
            Effort-Based Scoring
          </p>

          <div className="rounded-[12px] bg-[var(--dah-primary)] px-4 py-4">
            <p className="text-[12px] text-white/55 mb-1">Formula</p>
            <p className="text-[15px] font-semibold text-white tracking-tight">
              reward = base + (effort × bonus)
            </p>
            <p className="text-[13px] text-white/65 mt-2 leading-relaxed">
              AI scores 0.0–1.0 on specificity, duration, scope, and impact. Vague = low. Detailed + context = high.
            </p>
          </div>

          <div className="rounded-[12px] bg-[var(--dah-surface-low)] overflow-hidden divide-y divide-[var(--dah-outline-variant)]/40">
            <div className="grid grid-cols-[1fr_auto_auto] px-4 py-2.5">
              <span className="text-[12px] text-[var(--dah-on-surface-variant)]">Activity</span>
              <span className="text-[12px] text-[var(--dah-on-surface-variant)] w-14 text-center">Base</span>
              <span className="text-[12px] text-[var(--dah-on-surface-variant)] w-14 text-center">Max</span>
            </div>
            {ACTIVITIES.map((r) => (
              <div
                key={r.a}
                className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3"
              >
                <span className="text-[15px] font-medium text-[var(--dah-on-surface)]">{r.a}</span>
                <span className="text-[13px] text-[var(--dah-outline)] w-14 text-center">{r.base}</span>
                <span className="text-[13px] font-semibold text-[var(--dah-primary)] w-14 text-center">
                  {r.max}
                </span>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-[12px] text-[var(--dah-outline)]">
          Powered by <span className="font-semibold text-[var(--dah-primary)]">Stellar</span>
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="w-full py-3.5 rounded-full bg-[var(--dah-primary)] text-white text-[17px] font-semibold active:opacity-80 transition-opacity"
        >
          Got It
        </button>
      </div>
    </IOSSheet>
  );
}
