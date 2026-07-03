import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { Keypair } from '@stellar/stellar-sdk'
import { mergePayouts, DEFAULT_ACTIVITY_LABEL } from '../contract'
import type { RewardEvent } from '../contract'
import type { RewardHistoryItem } from '../RewardHistory'

// A small pool of sample wallet addresses so recipients are realistic and
// occasionally collide, while still being valid Stellar public keys.
const ADDRESS_POOL = [
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
  Keypair.random().publicKey(),
]

// A pool of human-readable activity labels for history entries. None of these
// equals DEFAULT_ACTIVITY_LABEL so a matched label is always distinguishable
// from the fallback.
const ACTIVITY_POOL = ['volunteering', 'tutoring', 'workshop', 'event', 'participation']

// Generator for a single RewardEvent bound to a specific (unique) txHash.
function rewardEventArb(txHash: string): fc.Arbitrary<RewardEvent> {
  return fc.record({
    txHash: fc.constant(txHash),
    recipient: fc.constantFrom(...ADDRESS_POOL),
    amount: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    timestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
  })
}

// Generator for an array of RewardEvents with guaranteed-unique txHashes
// (chain events come from distinct transactions, so txHashes are unique).
// Returns both the events and the set of txHashes used, so history can be
// generated to partially overlap with them.
const eventsWithHashesArb: fc.Arbitrary<{ events: RewardEvent[]; hashes: string[] }> = fc
  .uniqueArray(fc.integer({ min: 0, max: 100_000 }), { minLength: 0, maxLength: 30 })
  .chain((ids) => {
    const hashes = ids.map((id) => `tx-${id}`)
    return fc
      .tuple(...hashes.map((h) => rewardEventArb(h)))
      .map((events) => ({ events: events as RewardEvent[], hashes }))
  })

// Generator for a history entry. Its txHash either matches one of the chain
// event hashes (so it contributes an activity label) or is an unrelated hash
// (so it should never appear in the output).
function historyItemArb(chainHashes: string[]): fc.Arbitrary<RewardHistoryItem> {
  const txHashArb =
    chainHashes.length > 0
      ? fc.oneof(
          { weight: 7, arbitrary: fc.constantFrom(...chainHashes) },
          { weight: 3, arbitrary: fc.integer({ min: 0, max: 100_000 }).map((n) => `hist-${n}`) }
        )
      : fc.integer({ min: 0, max: 100_000 }).map((n) => `hist-${n}`)

  return fc.record({
    id: fc.uuid(),
    activity: fc.constantFrom(...ACTIVITY_POOL),
    reward: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    txHash: txHashArb,
    timestamp: fc.integer({ min: 0, max: 4_000_000_000_000 }),
  })
}

// Combined generator: chain events (unique txHashes) plus a history list that
// partially overlaps those hashes (and partially does not).
const scenarioArb = eventsWithHashesArb.chain(({ events, hashes }) =>
  fc
    .array(historyItemArb(hashes), { minLength: 0, maxLength: 30 })
    .map((history) => ({ events, history }))
)

describe('mergePayouts', () => {
  // ── Example-based sanity checks ──────────────────────────────────────────
  it('uses the matching history activity label and chain values', () => {
    const [a] = ADDRESS_POOL
    const events: RewardEvent[] = [{ txHash: 't1', recipient: a, amount: 5, timestamp: 100 }]
    const history: RewardHistoryItem[] = [
      { id: 'h1', activity: 'tutoring', reward: 999, txHash: 't1', timestamp: 50 },
    ]
    const [item] = mergePayouts(events, history)
    expect(item.activity).toBe('tutoring')
    expect(item.recipient).toBe(a)
    expect(item.amount).toBe(5)
    expect(item.txHash).toBe('t1')
    expect(item.timestamp).toBe(100)
  })

  it('falls back to DEFAULT_ACTIVITY_LABEL when no history matches', () => {
    const [a] = ADDRESS_POOL
    const events: RewardEvent[] = [{ txHash: 't1', recipient: a, amount: 5, timestamp: 100 }]
    const item = mergePayouts(events, [])[0]
    expect(item.activity).toBe(DEFAULT_ACTIVITY_LABEL)
  })

  it('surfaces only chain events, sorted newest-first', () => {
    const [a, b] = ADDRESS_POOL
    const events: RewardEvent[] = [
      { txHash: 't1', recipient: a, amount: 1, timestamp: 100 },
      { txHash: 't2', recipient: b, amount: 2, timestamp: 300 },
      { txHash: 't3', recipient: a, amount: 3, timestamp: 200 },
    ]
    const history: RewardHistoryItem[] = [
      { id: 'h9', activity: 'workshop', reward: 7, txHash: 'unrelated', timestamp: 999 },
    ]
    const result = mergePayouts(events, history)
    expect(result.map((p) => p.txHash)).toEqual(['t2', 't3', 't1'])
  })

  // ── Task 7.2 ─────────────────────────────────────────────────────────────
  // Feature: live-rewards-feed, Property 5: Merged payout list has unique transaction hashes
  // Validates: Requirements 3.1, 3.2
  it('Feature: live-rewards-feed, Property 5: Merged payout list has unique transaction hashes', () => {
    fc.assert(
      fc.property(scenarioArb, ({ events, history }) => {
        const result = mergePayouts(events, history)

        // Output has at most one PayoutItem per txHash.
        const hashes = result.map((p) => p.txHash)
        const uniqueHashes = new Set(hashes)
        expect(uniqueHashes.size).toBe(hashes.length)

        // One PayoutItem per chain event (only chain events are surfaced).
        expect(result.length).toBe(events.length)
        expect(uniqueHashes).toEqual(new Set(events.map((e) => e.txHash)))
      }),
      { numRuns: 200 }
    )
  })

  // ── Task 7.3 ─────────────────────────────────────────────────────────────
  // Feature: live-rewards-feed, Property 6: Merge field authority
  // Validates: Requirements 3.3, 3.4, 3.5
  it('Feature: live-rewards-feed, Property 6: Merge field authority', () => {
    fc.assert(
      fc.property(scenarioArb, ({ events, history }) => {
        const result = mergePayouts(events, history)

        // Index chain events and last-write-wins history by txHash for lookup.
        const eventByHash = new Map(events.map((e) => [e.txHash, e]))
        const historyByHash = new Map<string, RewardHistoryItem>()
        for (const h of history) historyByHash.set(h.txHash, h)

        for (const item of result) {
          const event = eventByHash.get(item.txHash)
          // Every output item must correspond to a chain event.
          expect(event).toBeDefined()

          // Chain is authoritative for recipient + amount (and txHash/timestamp).
          expect(item.recipient).toBe(event!.recipient)
          expect(item.amount).toBe(event!.amount)
          expect(item.timestamp).toBe(event!.timestamp)

          const match = historyByHash.get(item.txHash)
          if (match) {
            // Matching history contributes its activity label.
            expect(item.activity).toBe(match.activity)
          } else {
            // No match → default activity label.
            expect(item.activity).toBe(DEFAULT_ACTIVITY_LABEL)
          }
        }
      }),
      { numRuns: 200 }
    )
  })

  // ── Task 7.4 ─────────────────────────────────────────────────────────────
  // Feature: live-rewards-feed, Property 7: Payout list is ordered most-recent-first
  // Validates: Requirements 3.6
  it('Feature: live-rewards-feed, Property 7: Payout list is ordered most-recent-first', () => {
    fc.assert(
      fc.property(scenarioArb, ({ events, history }) => {
        const result = mergePayouts(events, history)

        // For every adjacent pair, the earlier item has a timestamp >= the later.
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].timestamp).toBeGreaterThanOrEqual(result[i].timestamp)
        }
      }),
      { numRuns: 200 }
    )
  })
})
