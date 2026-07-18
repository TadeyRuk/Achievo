import { describe, it, expect } from 'vitest'
import {
  BASE_REWARD,
  MAX_BONUS,
  estimateMaxReward,
  estimateBaseReward,
  isKnownActivity,
} from '@achievo/shared'

describe('@achievo/shared rewards', () => {
  it('uses workshop base 2 and max bonus 3 (max estimate 5)', () => {
    expect(BASE_REWARD.workshop).toBe(2)
    expect(MAX_BONUS.workshop).toBe(3)
    expect(estimateMaxReward('workshop')).toBe(5)
    expect(estimateBaseReward('workshop')).toBe(2)
  })

  it('recognizes whitelist activities only', () => {
    expect(isKnownActivity('tutoring')).toBe(true)
    expect(isKnownActivity('unknown')).toBe(false)
    expect(estimateMaxReward('nope')).toBe(0)
  })
})
