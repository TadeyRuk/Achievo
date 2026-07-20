import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { HttpRequest, HttpRoute } from './types.js';

function firstHeader(req: VercelRequest, name: string): string | undefined {
  const raw = req.headers?.[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export function getClientIp(req: VercelRequest): string {
  const vercelForwarded = firstHeader(req, 'x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelForwarded) return vercelForwarded;

  const realIp = firstHeader(req, 'x-real-ip');
  if (realIp) return realIp;

  const forwarded = firstHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim();
  const trustForwarded =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.NODE_ENV !== 'production';
  if (forwarded && trustForwarded) return forwarded;

  return req.socket?.remoteAddress ?? 'unknown';
}

export function normalizeVercelRequest(req: VercelRequest): HttpRequest {
  const headers: Record<string, string | undefined> = {};
  for (const [name, raw] of Object.entries(req.headers ?? {})) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    headers[name.toLowerCase()] = typeof value === 'string' ? value : undefined;
  }

  return {
    method: req.method ?? '',
    headers,
    query: req.query ?? {},
    body: req.body,
    clientIp: getClientIp(req),
  };
}

export function adaptVercelRoute(route: HttpRoute) {
  return async (req: VercelRequest, res: VercelResponse): Promise<unknown> => {
    try {
      const result = await route(normalizeVercelRequest(req));
      return res.status(result.status).json(result.body);
    } catch (cause) {
      console.error('Unhandled route error:', cause);
      return res.status(500).json({ error: 'Internal server error.' });
    }
  };
}
