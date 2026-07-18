/**
 * HeuristicScoringAgent — offline fallback when Groq is unavailable.
 * Classifies via whitelist keywords and pays BASE_REWARD only (score = 0).
 */

import {
  classifyActivityKeyword,
  isKnownActivity,
} from '@achievo/shared';
import type { Evaluation } from './scoring';

const TIME_WORDS = /\b(\d+\s*(hours?|hrs?|minutes?|mins?|days?)|all\s*day|morning|afternoon|evening)\b/i;
const PEOPLE_WORDS = /\b(\d+\s*(students?|peers?|classmates?|people|kids?|learners?)|group|class|team)\b/i;
const IMPACT_WORDS = /\b(helped|taught|mentored|organized|led|volunteered|facilitated|improved)\b/i;

export function classifyActivity(text: string) {
  return classifyActivityKeyword(text);
}

export function effortFeatures(text: string): {
  length: number;
  hasNumbers: boolean;
  hasTime: boolean;
  hasPeople: boolean;
  hasImpact: boolean;
} {
  return {
    length: text.trim().length,
    hasNumbers: /\d/.test(text),
    hasTime: TIME_WORDS.test(text),
    hasPeople: PEOPLE_WORDS.test(text),
    hasImpact: IMPACT_WORDS.test(text),
  };
}

export function evaluateHeuristic(activityText: string): Evaluation {
  const activity = classifyActivityKeyword(activityText);
  const valid = isKnownActivity(activity);
  const features = effortFeatures(activityText);

  return {
    activity,
    valid,
    score: 0,
    criteria: [{ key: 'effort', label: 'Effort', score: 0, weight: 1 }],
    rationale: valid
      ? `heuristic_fallback: classified as ${activity} (len=${features.length}).`
      : 'heuristic_fallback: no recognized academic activity keyword.',
  };
}

export const HeuristicScoringAgent = {
  evaluate(activityText: string): Evaluation {
    return evaluateHeuristic(activityText);
  },
};
