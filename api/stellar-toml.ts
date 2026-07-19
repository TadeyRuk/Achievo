import type { VercelRequest, VercelResponse } from '@vercel/node';
import { renderStellarToml } from './_server/infrastructure/stellarToml';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  const result = renderStellarToml();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60');
  if (!result.ok) {
    res.status(503).setHeader('Content-Type', 'text/plain; charset=utf-8').send(result.error);
    return;
  }
  res
    .status(200)
    .setHeader('Content-Type', 'text/plain; charset=utf-8')
    .send(result.body);
}
