/**
 * ScoringAgent — explainable evaluation (persistent, broad domain agent)
 * ────────────────────────────────────────────────────────────────────────
 * Owns the ENTIRE "how good is this submission" domain, not just one metric.
 * Its stable public surface is `evaluate()`, which returns a structured,
 * explainable score. Today it produces a single effort criterion; the
 * `criteria[]` array is the extensibility seam so future work (multi-criteria
 * rubrics, per-criterion weights, confidence intervals) slots in without
 * changing callers.
 *
 * Callers: api/reward.ts (authoritative reward decision).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single scored dimension. The array of these is what makes scoring broad. */
export interface ScoreCriterion {
  /** Stable machine key, e.g. "effort". */
  key: string;
  /** Human label for UI, e.g. "Effort". */
  label: string;
  /** Normalized 0.0–1.0 score for this dimension. */
  score: number;
  /** Relative weight when combining criteria (sums are normalized by caller). */
  weight: number;
}

export interface Evaluation {
  activity: string;
  valid: boolean;
  /** Aggregate 0.0–1.0 score (currently == effort; weighted mean once multi-criteria). */
  score: number;
  /** Per-dimension breakdown. Starts with one entry ("effort"), designed for many. */
  criteria: ScoreCriterion[];
  /** One-sentence, human-readable justification surfaced in the UI. */
  rationale: string;
}

/** Raw shape returned by the Groq model. Kept internal to the agent. */
interface GroqClassification {
  activity: string;
  valid: boolean;
  effort_score: number; // 0.0–1.0
  reason: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Clamp any number into the inclusive 0.0–1.0 range (NaN → 0). */
export function clampScore(n: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Normalizes a raw model classification into the agent's stable Evaluation
 * shape. Pure + exported so it can be unit-tested without hitting the network.
 */
export function normalizeEvaluation(raw: GroqClassification): Evaluation {
  const score = clampScore(raw.effort_score ?? 0);
  return {
    activity: raw.activity,
    valid: Boolean(raw.valid),
    score,
    criteria: [
      { key: 'effort', label: 'Effort', score, weight: 1 },
    ],
    rationale: (raw.reason ?? '').trim(),
  };
}

// ─── Network call ────────────────────────────────────────────────────────────

async function classifyWithGroq(activityText: string): Promise<GroqClassification> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured.');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI evaluator for a student reward system on the Stellar blockchain. ' +
            'Your job has two parts:\n' +
            '1. Classify the activity into exactly one of: tutoring, workshop, volunteering, event, participation. ' +
            'If it fits none, set valid=false and activity="unknown".\n' +
            '2. Score the student\'s effort from 0.0 to 1.0 based on: specificity of description, ' +
            'duration or scope mentioned, impact or outcomes described, and number of people helped. ' +
            'A vague one-liner scores 0.1–0.3. A detailed account with context scores 0.7–1.0.\n' +
            'Respond with valid JSON only — no markdown, no text outside the JSON.',
        },
        {
          role: 'user',
          content:
            `Student activity submission: "${activityText}"\n\n` +
            'Respond with: {"activity":"tutoring|workshop|volunteering|event|participation|unknown","valid":true|false,"effort_score":0.0-1.0,"reason":"one sentence"}',
        },
      ],
      temperature: 0,
      max_tokens: 120,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json() as { choices: { message: { content: string } }[] };
  const content = data.choices[0]?.message?.content?.trim() ?? '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned non-JSON response.');

  const parsed = JSON.parse(jsonMatch[0]) as GroqClassification;
  if (!parsed.activity || typeof parsed.valid !== 'boolean') {
    throw new Error('AI response missing required fields.');
  }

  return parsed;
}

// ─── Public agent surface ──────────────────────────────────────────────────

export const ScoringAgent = {
  /**
   * Evaluate a free-form activity submission into a structured, explainable
   * score. This is the agent's stable entry point — extend the returned
   * `criteria[]` rather than adding new top-level methods.
   */
  async evaluate(activityText: string): Promise<Evaluation> {
    const raw = await classifyWithGroq(activityText);
    return normalizeEvaluation(raw);
  },
};
