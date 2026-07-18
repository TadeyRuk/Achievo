import type {
  GeneralFeedbackApiRequest,
  TransactionFeedbackApiInfoSuccess,
  TransactionFeedbackApiRequest,
} from '@achievo/contracts';
import { error, json, methodNotAllowed, type HttpRequest, type HttpRoute } from '../../http';
import type { FeedbackPorts } from './ports';

const TX_HASH = /^[a-f0-9]{64}$/i;
const MAX_COMMENT = 500;
const MAX_NAME = 40;

function parseRating(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
}

function optionalText(
  raw: unknown,
  field: string,
  maximum: number,
): string | null | { error: string } {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') return { error: `${field} must be a string.` };
  const value = raw.trim();
  return value.length > maximum
    ? { error: `${field} must be at most ${maximum} characters.` }
    : value || null;
}

function parseTransaction(body: unknown): TransactionFeedbackApiRequest | { error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const txHash = typeof input.txHash === 'string' ? input.txHash.trim() : '';
  if (!TX_HASH.test(txHash)) {
    return { error: 'txHash must be a 64-character hex Stellar transaction hash.' };
  }
  const rating = parseRating(input.rating);
  if (rating === null) return { error: 'rating must be an integer from 1 to 5.' };
  const comment = optionalText(input.comment, 'comment', MAX_COMMENT);
  if (typeof comment === 'object' && comment) return comment;
  const reward =
    input.reward === undefined || input.reward === null || input.reward === ''
      ? null
      : Number(input.reward);
  if (reward !== null && (!Number.isFinite(reward) || reward < 0)) {
    return { error: 'reward must be a non-negative number.' };
  }
  const wallet =
    typeof input.wallet === 'string' && input.wallet.trim() ? input.wallet.trim() : null;
  const activity =
    typeof input.activity === 'string' && input.activity.trim()
      ? input.activity.trim().slice(0, 80)
      : null;
  return { txHash, rating, comment, wallet, reward, activity };
}

function parseGeneral(body: unknown): GeneralFeedbackApiRequest | { error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const rating = parseRating(input.rating);
  if (rating === null) return { error: 'rating must be an integer from 1 to 5.' };
  const comment = optionalText(input.comment, 'comment', MAX_COMMENT);
  if (typeof comment === 'object' && comment) return comment;
  const name = optionalText(input.name, 'name', MAX_NAME);
  if (typeof name === 'object' && name) return name;
  return { rating, comment, name };
}

function mappedFailure(ports: FeedbackPorts, cause: unknown, prefix: string) {
  const mapped = ports.mapError(cause);
  return mapped
    ? error(mapped.status, mapped.message)
    : error(502, `${prefix}: ${(cause as Error).message ?? String(cause)}`);
}

export function createTransactionFeedbackRoute(ports: FeedbackPorts): HttpRoute {
  return async (request: HttpRequest) => {
    if (request.method === 'GET') {
      return json<TransactionFeedbackApiInfoSuccess>(200, {
        source: 'google_forms',
        message:
          'Transaction feedback is collected via Google Forms. See the linked response Sheet and docs/GOOGLE_FORMS_SETUP.md.',
      });
    }
    if (request.method !== 'POST') return methodNotAllowed();
    const parsed = parseTransaction(request.body);
    if ('error' in parsed) return error(400, parsed.error);
    const claimKey = `feedback:tx:${parsed.txHash}`;
    let claimed = false;
    try {
      claimed = await ports.claimOnce(claimKey, 365 * 24 * 60 * 60);
      if (!claimed) return error(409, 'Feedback already submitted for this transaction.');
      await ports.submitTransaction(parsed);
      return json(201, { ok: true as const });
    } catch (cause) {
      if (claimed) await ports.releaseClaim(claimKey).catch(() => undefined);
      return mappedFailure(ports, cause, 'Failed to submit feedback');
    }
  };
}

export function createGeneralFeedbackRoute(ports: FeedbackPorts): HttpRoute {
  return async (request: HttpRequest) => {
    if (request.method !== 'POST') return methodNotAllowed();
    const parsed = parseGeneral(request.body);
    if ('error' in parsed) return error(400, parsed.error);
    try {
      if (
        request.clientIp !== 'unknown' &&
        !(await ports.claimOnce(`rate:feedback-general:ip:${request.clientIp}`, 60))
      ) {
        return error(429, 'Too many feedback submissions. Wait a moment and retry.');
      }
      await ports.submitGeneral(parsed);
      return json(201, { ok: true as const });
    } catch (cause) {
      return mappedFailure(ports, cause, 'Failed to submit feedback');
    }
  };
}
