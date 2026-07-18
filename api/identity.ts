import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StrKey } from '@stellar/stellar-sdk';
import { redactWallet } from '@achievo/identity';
import {
  bindIdentity,
  getIdentityByWallet,
  issueSessionToken,
  verifySessionToken,
} from './_lib/identity';
import { StoreUnavailableError } from './_lib/store';

/**
 * Identity API (privacy-first).
 * - GET  ?wallet=G… → redacted public view
 * - POST { wallet, sessionToken, displayName? } → refresh session / update name hash
 *
 * First bind happens inside `/api/reward` after ownership proof succeeds.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const wallet = (req.query.wallet as string | undefined)?.trim() ?? '';
      if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
        return res.status(400).json({ error: 'Invalid wallet address.' });
      }
      const identity = await getIdentityByWallet(wallet);
      if (!identity) {
        return res.status(404).json({ error: 'No identity bound to this wallet.' });
      }
      return res.status(200).json({
        id: identity.id,
        wallet: redactWallet(identity.walletPublicKey),
        createdAt: identity.createdAt,
        hasDisplayNameHash: Boolean(identity.displayNameHash),
      });
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const wallet = typeof body.wallet === 'string' ? body.wallet.trim() : '';
      const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
      const displayName = typeof body.displayName === 'string' ? body.displayName : undefined;

      if (!wallet || !StrKey.isValidEd25519PublicKey(wallet)) {
        return res.status(400).json({ error: 'Invalid wallet address.' });
      }
      if (!sessionToken) {
        return res.status(401).json({
          error: 'sessionToken required. Identity is bound on first successful reward challenge.',
        });
      }

      const verified = verifySessionToken(sessionToken, wallet);
      if (!verified.ok) {
        return res.status(401).json({ error: verified.error });
      }

      const identity = await bindIdentity(wallet, { displayName });
      const session = issueSessionToken(identity);
      return res.status(200).json({
        id: identity.id,
        wallet: redactWallet(identity.walletPublicKey),
        createdAt: identity.createdAt,
        sessionToken: session.token,
        expiresAt: session.expiresAt,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof StoreUnavailableError) {
      return res.status(503).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Identity request failed.' });
  }
}
