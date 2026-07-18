import { describe, it, expect } from 'vitest'
import {
  DAILY_TREASURY_CAP_XLM,
  DAILY_RECIPIENT_CAP_XLM,
  MAX_REWARD_PER_TX_XLM,
  utcDayKey,
} from '@achievo/shared'

describe('@achievo/shared caps', () => {
  it('matches Phase 7 policy numbers', () => {
    expect(MAX_REWARD_PER_TX_XLM).toBe(20)
    expect(DAILY_RECIPIENT_CAP_XLM).toBe(20)
    expect(DAILY_TREASURY_CAP_XLM).toBe(100)
  })

  it('formats UTC day keys', () => {
    expect(utcDayKey(new Date('2026-07-18T12:00:00.000Z'))).toBe('2026-07-18')
  })
})
