import { describe, it, expect } from 'vitest'
import {
  classifyActivity,
  evaluateHeuristic,
  effortFeatures,
} from '../_agents/heuristic'

describe('HeuristicScoringAgent', () => {
  it('classifies whitelist keywords', () => {
    expect(classifyActivity('I did tutoring after school')).toBe('tutoring')
    expect(classifyActivity('attended a workshop on Soroban')).toBe('workshop')
    expect(classifyActivity('went shopping')).toBe('unknown')
  })

  it('returns base-only score and heuristic_fallback rationale', () => {
    const text =
      'I logged volunteering for 3 hours helping 12 students improve their math.'
    const ev = evaluateHeuristic(text)
    expect(ev.valid).toBe(true)
    expect(ev.activity).toBe('volunteering')
    expect(ev.score).toBe(0)
    expect(ev.rationale).toContain('heuristic_fallback')
    const features = effortFeatures(text)
    expect(features.hasNumbers).toBe(true)
    expect(features.hasTime).toBe(true)
  })
})
