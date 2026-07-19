import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { buildVoucherMessage, mintRewardVoucher } from '../_server/infrastructure/voucher';

describe('reward vouchers', () => {
  const attestor = Keypair.random();
  const wallet = Keypair.random().publicKey();

  beforeEach(() => {
    process.env.ATTESTOR_SECRET = attestor.secret();
  });

  afterEach(() => {
    delete process.env.ATTESTOR_SECRET;
  });

  it('mints a signature the attestor key verifies', () => {
    const claimId = Buffer.alloc(32, 7);
    const expiry = 1_800_000_000;
    const voucher = mintRewardVoucher({
      wallet,
      rewardXlm: 5,
      activity: 'tutoring',
      claimId,
      expiry,
    });

    const message = buildVoucherMessage({
      wallet,
      rewardXlm: 5,
      activity: 'tutoring',
      claimId,
      expiry,
    });

    expect(attestor.verify(message, voucher.signature)).toBe(true);
    expect(voucher.claimIdHex).toHaveLength(64);
    expect(voucher.signatureHex).toHaveLength(128);
  });

  it('changes digest when amount changes', () => {
    const claimId = Buffer.alloc(32, 1);
    const expiry = 1_800_000_000;
    const a = buildVoucherMessage({
      wallet,
      rewardXlm: 5,
      activity: 'tutoring',
      claimId,
      expiry,
    });
    const b = buildVoucherMessage({
      wallet,
      rewardXlm: 6,
      activity: 'tutoring',
      claimId,
      expiry,
    });
    expect(a.equals(b)).toBe(false);
  });
});
