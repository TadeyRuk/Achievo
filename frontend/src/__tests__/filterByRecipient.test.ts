import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { Keypair } from '@stellar/stellar-sdk'
import { filterByRecipient } from '../contract'
import type { RewardEvent } from '../contract'

// A small pool of sample wallet addresses so that filtering is meaningfully
// exercised: events draw recipients from this pool (some match, some don't).
const ADDRESS_POOL = [
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
]

// An address that is NOT in the pool, used to exercise the empty-result case.
const OUTSIDE_ADDRESS = Keypair.random().publicKey()

// Generator for a single RewardEvent with a recipient drawn from the pool.
// txHashes are generated uniquely (see arrayWithUniqueTxHashes) so identity
// comparison via txHash is clean.
function rewardEventArb(txHash: string): fc.Arbitrary<RewardEvent> {
  return fc.record({
    txHash: fc.constant(txHash),
    recipient: fc.constantFrom(...ADDRESS_POOL),
    amount: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    timestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
  })
}

// Generator for an array of RewardEvents with guaranteed-unique txHashes.
const eventsArb: fc.Arbitrary<RewardEvent[]> = fc
  .uniqueArray(fc.integer({ min: 0, max: 100_000 }), { minLength: 0, maxLength: 30 })
  .chain((ids) =>
    fc.tuple(...ids.map((id) => rewardEventArb(`tx-${id}`)))
  )
  .map((events) => events as RewardEvent[])

// Target wallet: mostly drawn from the pool, occasionally an outside address
// so the empty-result case is covered.
const walletArb: fc.Arbitrary<string> = fc.oneof(
  { weight: 9, arbitrary: fc.constantFrom(...ADDRESS_POOL) },
  { weight: 1, arbitrary: fc.constant(OUTSIDE_ADDRESS) }
)

describe('filterByRecipient', () => {
  it('returns only matching events (basic example)', () => {
    const [a, b] = ADDRESS_POOL
    const events: RewardEvent[] = [
      { txHash: 't1', recipient: a, amount: 1, timestamp: 1 },
      { txHash: 't2', recipient: b, amount: 2, timestamp: 2 },
      { txHash: 't3', recipient: a, amount: 3, timestamp: 3 },
    ]
    const result = filterByRecipient(events, a)
    expect(result.map((e) => e.txHash)).toEqual(['t1', 't3'])
  })

  it('returns an empty array when no event matches', () => {
    const [a] = ADDRESS_POOL
    const events: RewardEvent[] = [
      { txHash: 't1', recipient: a, amount: 1, timestamp: 1 },
    ]
    expect(filterByRecipient(events, OUTSIDE_ADDRESS)).toEqual([])
  })

  // Feature: live-rewards-feed, Property 4: Recipient filter is sound and complete
  // Validates: Requirements 2.1
  it('Feature: live-rewards-feed, Property 4: Recipient filter is sound and complete', () => {
    fc.assert(
      fc.property(eventsArb, walletArb, (events, w) => {
        const result = filterByRecipient(events, w)

        // Soundness: every returned event matches w.
        for (const e of result) {
          expect(e.recipient).toBe(w)
        }

        // Completeness: the result count equals the count of input events
        // whose recipient === w, and every matching input event is present
        // in the result (identity by unique txHash).
        const expectedMatches = events.filter((e) => e.recipient === w)
        expect(result.length).toBe(expectedMatches.length)

        const resultHashes = new Set(result.map((e) => e.txHash))
        for (const e of expectedMatches) {
          expect(resultHashes.has(e.txHash)).toBe(true)
        }

        // The result is a subsequence of the input preserving order.
        const inputMatchHashes = events
          .filter((e) => e.recipient === w)
          .map((e) => e.txHash)
        expect(result.map((e) => e.txHash)).toEqual(inputMatchHashes)
      }),
      { numRuns: 200 }
    )
  })
})
