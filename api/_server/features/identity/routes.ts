import type {
  IdentityApiPublicSuccess,
  IdentityApiUpdateRequest,
  IdentityApiUpdateSuccess,
} from '@achievo/contracts';
import { error, json, methodNotAllowed, type HttpRoute } from '../../http/index.js';
import type { IdentityPorts } from './ports.js';

export function createIdentityRoute(ports: IdentityPorts): HttpRoute {
  return async (request) => {
    try {
      if (request.method === 'GET') {
        const raw = request.query.wallet;
        const wallet = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? '';
        if (!wallet || !ports.isValidWallet(wallet)) return error(400, 'Invalid wallet address.');
        const identity = await ports.findByWallet(wallet);
        if (!identity) return error(404, 'No identity bound to this wallet.');
        return json<IdentityApiPublicSuccess>(200, {
          id: identity.id,
          wallet: ports.redactWallet(identity.walletPublicKey),
          createdAt: identity.createdAt,
          hasDisplayNameHash: Boolean(identity.displayNameHash),
        });
      }
      if (request.method === 'POST') {
        const input = (request.body ?? {}) as Partial<IdentityApiUpdateRequest>;
        const wallet = typeof input.wallet === 'string' ? input.wallet.trim() : '';
        const sessionToken = typeof input.sessionToken === 'string' ? input.sessionToken : '';
        const displayName =
          typeof input.displayName === 'string' ? input.displayName : undefined;
        if (!wallet || !ports.isValidWallet(wallet)) return error(400, 'Invalid wallet address.');
        if (!sessionToken) {
          return error(
            401,
            'sessionToken required. Identity is bound on first successful reward challenge.',
          );
        }
        const verified = ports.verifySession(sessionToken, wallet);
        if (!verified.ok) return error(401, verified.error);
        const identity = await ports.bind(wallet, { displayName });
        const session = ports.issueSession(identity);
        return json<IdentityApiUpdateSuccess>(200, {
          id: identity.id,
          wallet: ports.redactWallet(identity.walletPublicKey),
          createdAt: identity.createdAt,
          sessionToken: session.token,
          expiresAt: session.expiresAt,
        });
      }
      return methodNotAllowed();
    } catch (cause) {
      return ports.isStoreUnavailable(cause)
        ? error(503, (cause as Error).message)
        : error(500, 'Identity request failed.');
    }
  };
}
