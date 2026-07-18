import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySignerRequest } from '../lib/auth';
import { signAndSubmitReward } from '../lib/submit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const hmacSecret = process.env.SIGNER_HMAC_SECRET?.trim();
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!hmacSecret || !adminSecret) {
    res.status(503).json({ ok: false, error: 'Signer is not configured.' });
    return;
  }

  const body =
    typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  const auth = verifySignerRequest({
    secret: hmacSecret,
    body,
    timestamp: String(req.headers['x-achievo-timestamp'] ?? ''),
    nonce: String(req.headers['x-achievo-nonce'] ?? ''),
    signature: String(req.headers['x-achievo-signature'] ?? ''),
  });
  if (!auth.ok) {
    res.status(401).json({ ok: false, error: auth.error });
    return;
  }

  const parsed = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as {
    wallet?: string;
    rewardXlm?: number;
    activity?: string;
  };
  const wallet = typeof parsed.wallet === 'string' ? parsed.wallet : '';
  const rewardXlm = typeof parsed.rewardXlm === 'number' ? parsed.rewardXlm : NaN;
  const activity = typeof parsed.activity === 'string' ? parsed.activity : '';
  if (!wallet || !activity || !Number.isFinite(rewardXlm)) {
    res.status(400).json({ ok: false, error: 'Invalid sign-reward payload.' });
    return;
  }

  try {
    const result = await signAndSubmitReward({
      adminSecret,
      wallet,
      rewardXlm,
      activity,
    });
    if ('pending' in result && result.pending) {
      res.status(202).json(result);
      return;
    }
    if (!result.ok) {
      res.status(result.status).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (cause) {
    res.status(500).json({
      ok: false,
      error: (cause as Error).message ?? 'Signer failed.',
    });
  }
}
