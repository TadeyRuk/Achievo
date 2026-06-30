import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  Keypair,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk'
import type { rpc } from '@stellar/stellar-sdk'
import { decodeRewardEvent, stroopsToXlm } from '../contract'

// Build the reward-event `value` ScVal: a 2-tuple (recipient: Address, amount: i128)
// matching the topics ("reward","sent") event the contract emits.
function buildEventValue(recipient: string, amountStroops: bigint): xdr.ScVal {
  const recipientScVal = nativeToScVal(recipient, { type: 'address' })
  const amountScVal = nativeToScVal(amountStroops, { type: 'i128' })
  return xdr.ScVal.scvVec([recipientScVal, amountScVal])
}

// Assemble a minimal fake EventResponse with the fields decodeRewardEvent reads.
function makeEvent(
  value: xdr.ScVal,
  txHash: string,
  ledgerClosedAt: string
): rpc.Api.EventResponse {
  return {
    value,
    txHash,
    ledgerClosedAt,
  } as unknown as rpc.Api.EventResponse
}

describe('decodeRewardEvent', () => {
  // Sanity: the constructed value round-trips through scValToNative into
  // [recipientAddressString, amountBigInt] as decodeRewardEvent expects.
  it('round-trips the constructed event value through scValToNative', () => {
    const recipient = Keypair.random().publicKey()
    const amountStroops = 123_456_789n
    const decoded = scValToNative(buildEventValue(recipient, amountStroops)) as unknown[]
    expect(Array.isArray(decoded)).toBe(true)
    expect(decoded[0]).toBe(recipient)
    expect(decoded[1]).toBe(amountStroops)
  })

  it('decodes recipient, amount, txHash and timestamp from an event', () => {
    const recipient = Keypair.random().publicKey()
    const amountStroops = 50_000_000n // 5 XLM
    const ledgerClosedAt = '2024-01-01T00:00:00Z'
    const event = makeEvent(buildEventValue(recipient, amountStroops), 'abc123', ledgerClosedAt)

    const result = decodeRewardEvent(event)

    expect(result.recipient).toBe(recipient)
    expect(result.amount).toBe(stroopsToXlm(amountStroops))
    expect(result.txHash).toBe('abc123')
    expect(result.timestamp).toBe(new Date(ledgerClosedAt).getTime())
  })

  // Feature: live-rewards-feed, Property 3: Event decoding preserves recipient and amount
  // Validates: Requirements 1.3, 1.4
  it('Feature: live-rewards-feed, Property 3: Event decoding preserves recipient and amount', () => {
    fc.assert(
      fc.property(
        // recipient: a valid Stellar public key (Address type)
        fc.constant(null).map(() => Keypair.random().publicKey()),
        // amountStroops: non-negative i128-range bigint
        fc.bigInt({ min: 0n, max: 170_141_183_460_469_231_731_687_303_715_884_105_727n }),
        // an arbitrary tx hash and an ISO timestamp
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('2100-01-01T00:00:00Z'), noInvalidDate: true }),
        (recipient, amountStroops, txHash, closedAt) => {
          const ledgerClosedAt = closedAt.toISOString()
          const event = makeEvent(buildEventValue(recipient, amountStroops), txHash, ledgerClosedAt)

          const result = decodeRewardEvent(event)

          expect(result.recipient).toBe(recipient)
          expect(result.amount).toBe(stroopsToXlm(amountStroops))
        }
      ),
      { numRuns: 200 }
    )
  })
})
