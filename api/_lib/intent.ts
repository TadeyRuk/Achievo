import { createHash } from 'crypto';

/** SHA-256 hex of trimmed activity text — binds challenge MAC to submission intent. */
export function hashActivityIntent(activityText: string): string {
  return createHash('sha256').update(activityText.trim()).digest('hex');
}

export function challengeMacPayload(nonce: string, expiry: number, intentHash: string): string {
  return `${nonce}:${expiry}:${intentHash}`;
}
