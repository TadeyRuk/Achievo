import { describe, it, expect } from 'vitest'
import { clampScore, normalizeEvaluation } from '../../../api/_agents/scoring'

describe('ScoringAgent helpers', () => {
  it('clampScore bounds NaN and out-of-range values', () => {
    expect(clampScore(Number.NaN)).toBe(0)
    expect(clampScore(-1)).toBe(0)
    expect(clampScore(1.5)).toBe(1)
    expect(clampScore(0.42)).toBe(0.42)
  })

  it('normalizeEvaluation builds criteria from effort_score', () => {
    const ev = normalizeEvaluation({
      activity: 'tutoring',
      valid: true,
      effort_score: 0.8,
      reason: 'Detailed tutoring session',
    })
    expect(ev.score).toBe(0.8)
    expect(ev.criteria).toHaveLength(1)
    expect(ev.criteria[0]).toMatchObject({ key: 'effort', score: 0.8, weight: 1 })
    expect(ev.rationale).toBe('Detailed tutoring session')
  })
})
