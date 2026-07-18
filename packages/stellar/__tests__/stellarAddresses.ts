import { StrKey } from '@stellar/stellar-sdk'

/**
 * Build a valid Stellar ed25519 public key without Keypair.random().
 * SDK 15's @noble/ed25519 rejects Uint8Array seeds under Vitest/jsdom
 * (cross-realm instanceof), so tests encode keys via StrKey instead.
 */
export function publicKeyFromByte(fill: number): string {
  const bytes = new Uint8Array(32).fill(fill & 0xff)
  return StrKey.encodeEd25519PublicKey(Buffer.from(bytes))
}

export function randomPublicKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return StrKey.encodeEd25519PublicKey(Buffer.from(bytes))
}
