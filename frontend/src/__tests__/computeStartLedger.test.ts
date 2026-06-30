import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeStartLedger } from '../contract'

describe('computeStartLedger', () => {
  // Example-based checks for representative cases.
  it('clamps to 1 when the window is larger than the latest ledger', () => {
    expect(computeStartLedger(100, 1000)).toBe(1)
  })

  it('returns the latest ledger when the window is 0', () => {
    expect(computeStartLedger(500, 0)).toBe(500)
  })

  it('returns latest - window when within range', () => {
    expect(computeStartLedger(20000, 17280)).toBe(2720)
  })

  it('handles large values without going out of range', () => {
    expect(computeStartLedger(1_000_000, 17280)).toBe(982720)
  })

  // Feature: live-rewards-feed, Property 1: Start ledger stays within the ledger window
  // Validates: Requirements 1.2, 6.2
  it('Feature: live-rewards-feed, Property 1: Start ledger stays within the ledger window', () => {
    fc.assert(
      fc.property(
        // L >= 1
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        // non-negative window (cover window=0, window > L, and large values)
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (latestLedger, window) => {
          const s = computeStartLedger(latestLedger, window)
          expect(s).toBeGreaterThanOrEqual(1)
          expect(s).toBeLessThanOrEqual(latestLedger)
        }
      ),
      { numRuns: 200 }
    )
  })
})
