import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { stroopsToXlm } from '../contract'

// STROOP_FACTOR is module-private in contract.ts; replicate the literal here
// for computing the expected value (do not import it since it is not exported).
const STROOP_FACTOR = 10_000_000

describe('stroopsToXlm', () => {
  // Example-based checks for representative cases.
  it('converts zero stroops to zero XLM', () => {
    expect(stroopsToXlm(0)).toBe(0)
  })

  it('converts one whole XLM worth of stroops', () => {
    expect(stroopsToXlm(10_000_000)).toBe(1)
  })

  it('converts a fractional amount', () => {
    expect(stroopsToXlm(2_500_000)).toBe(0.25)
  })

  it('accepts bigint input', () => {
    expect(stroopsToXlm(50_000_000n)).toBe(5)
  })

  // Feature: live-rewards-feed, Property 2: Stroop-to-XLM conversion is exact division
  // Validates: Requirements 1.4
  it('Feature: live-rewards-feed, Property 2: Stroop-to-XLM conversion is exact division', () => {
    fc.assert(
      fc.property(
        // Cover both supported input types: non-negative number and non-negative bigint.
        fc.oneof(
          fc.nat(),
          fc.bigInt({ min: 0n, max: BigInt(Number.MAX_SAFE_INTEGER) })
        ),
        (s) => {
          // Primary division is exact equality with Number(s) / STROOP_FACTOR.
          expect(stroopsToXlm(s)).toBe(Number(s) / STROOP_FACTOR)

          // Round-trip: multiplying back recovers Number(s) within a tolerance
          // scaled to magnitude (large values lose float precision).
          const roundTrip = stroopsToXlm(s) * STROOP_FACTOR
          const tolerance = Math.max(1, Number(s) * 1e-9)
          expect(Math.abs(roundTrip - Number(s))).toBeLessThanOrEqual(tolerance)
        }
      ),
      { numRuns: 200 }
    )
  })
})
