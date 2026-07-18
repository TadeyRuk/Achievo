import type { VercelRequest } from '@vercel/node';

function header(req: VercelRequest, name: string): string | undefined {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

/**
 * Best-effort client IP for rate limiting.
 *
 * Prefer platform-trusted headers (`x-vercel-forwarded-for`, `x-real-ip`).
 * Trust `x-forwarded-for` only on Vercel or outside production so a direct
 * hit on the function origin cannot spoof IP limits via a forged XFF header.
 */
export function getClientIp(req: VercelRequest): string {
  const vercelFwd = header(req, 'x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelFwd) return vercelFwd;

  const realIp = header(req, 'x-real-ip');
  if (realIp) return realIp;

  const xff = header(req, 'x-forwarded-for')?.split(',')[0]?.trim();
  const trustXff =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.NODE_ENV !== 'production';
  if (xff && trustXff) return xff;

  return req.socket?.remoteAddress ?? 'unknown';
}
