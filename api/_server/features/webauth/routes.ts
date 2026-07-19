import type { WebAuthChallengeSuccess, WebAuthTokenSuccess } from '@achievo/contracts';
import { error, json, methodNotAllowed, type HttpRoute } from '../../http';
import type { WebAuthPorts } from './ports';

function firstQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

async function rateLimitOrError(
  ports: WebAuthPorts,
  clientIp: string,
  key: string,
): Promise<ReturnType<typeof error> | null> {
  if (clientIp === 'unknown') return null;
  if (!(await ports.claimOnce(key, 60))) {
    return error(429, 'Too many auth requests. Wait a moment and retry.');
  }
  return null;
}

function storeOrInternalError(
  ports: WebAuthPorts,
  cause: unknown,
  fallback: string,
): ReturnType<typeof error> {
  return ports.isStoreUnavailable(cause)
    ? error(503, (cause as Error).message)
    : error(500, fallback);
}

function challengeVerifyError(cause: unknown): ReturnType<typeof error> {
  const message = cause instanceof Error ? cause.message : '';
  if (message.includes('challenge') || message.includes('Challenge')) {
    return error(401, message);
  }
  return error(401, 'Web Auth verification failed.');
}

export function createWebAuthRoute(ports: WebAuthPorts): HttpRoute {
  return async (request) => {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return methodNotAllowed();
    }
    if (!ports.configured()) return error(503, 'Web Auth is not configured.');

    if (request.method === 'GET') {
      try {
        const account = firstQuery(request.query.account);
        if (!account || !ports.isValidWallet(account)) {
          return error(400, 'Invalid or missing account.');
        }
        const limited = await rateLimitOrError(
          ports,
          request.clientIp,
          `rate:webauth:ip:${request.clientIp}`,
        );
        if (limited) return limited;

        const challenge = ports.buildChallenge(account);
        return json<WebAuthChallengeSuccess>(200, {
          transaction: challenge.transaction,
          network_passphrase: challenge.networkPassphrase,
        });
      } catch (cause) {
        return storeOrInternalError(ports, cause, 'Failed to issue Web Auth challenge.');
      }
    }

    try {
      const body = (request.body ?? {}) as { transaction?: unknown };
      const transaction =
        typeof body.transaction === 'string' ? body.transaction.trim() : '';
      if (!transaction) return error(400, 'Missing signed transaction.');

      const limited = await rateLimitOrError(
        ports,
        request.clientIp,
        `rate:webauth:post:${request.clientIp}`,
      );
      if (limited) return limited;

      const issued = ports.verifyAndIssue(transaction);
      if (!(await ports.claimOnce(`sep10:challenge:${issued.challengeId}`, 600))) {
        return error(401, 'Challenge transaction has already been used.');
      }

      return json<WebAuthTokenSuccess>(200, {
        token: issued.token,
        wallet: issued.wallet,
        expiresAt: issued.expiresAt,
      });
    } catch (cause) {
      return ports.isStoreUnavailable(cause)
        ? error(503, (cause as Error).message)
        : challengeVerifyError(cause);
    }
  };
}
