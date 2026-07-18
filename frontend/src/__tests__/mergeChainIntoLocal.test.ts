import { describe, it, expect } from 'vitest'
import { mergeChainIntoLocal } from '../features/history'
import type { RewardHistoryItem } from '@achievo/shared'

describe('mergeChainIntoLocal', () => {
  it('lets chain rows win on matching txHash', () => {
    const local: RewardHistoryItem[] = [
      {
        id: 'tx1',
        activity: 'local-activity',
        reward: 1,
        txHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        timestamp: 1000,
      },
    ]
    const chain = [
      {
        ledger: 1,
        recipient: 'GTEST',
        amount: 5,
        activity: 'chain-activity',
        timestamp: 2000,
        txHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    ]

    const merged = mergeChainIntoLocal(local, chain)
    expect(merged).toHaveLength(1)
    expect(merged[0].activity).toBe('chain-activity')
    expect(merged[0].reward).toBe(5)
    expect(merged[0].timestamp).toBe(2000)
  })

  it('keeps local-only rows that are not yet on chain', () => {
    const local: RewardHistoryItem[] = [
      {
        id: 'local-only',
        activity: 'optimistic',
        reward: 2,
        txHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        timestamp: 3000,
      },
    ]
    const chain = [
      {
        ledger: 2,
        recipient: 'GTEST',
        amount: 3,
        activity: 'on-chain',
        timestamp: 1000,
        txHash: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      },
    ]

    const merged = mergeChainIntoLocal(local, chain)
    expect(merged.map((r) => r.txHash).sort()).toEqual([
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    ])
    expect(merged[0].timestamp).toBeGreaterThan(merged[1].timestamp)
  })
})
