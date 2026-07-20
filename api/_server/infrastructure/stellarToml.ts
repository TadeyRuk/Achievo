import { CONTRACT_ID, HORIZON_URL, NETWORK_PASSPHRASE, STELLAR_NETWORK } from '@achievo/shared';
import { sep10SigningPublicKey } from './sep10.js';

function webAuthEndpoint(): string | null {
  const explicit = process.env.WEB_AUTH_ENDPOINT?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const homeDomain = process.env.HOME_DOMAIN?.trim()?.replace(/^https?:\/\//, '');
  return homeDomain ? `https://${homeDomain}/api/web-auth` : null;
}

export function renderStellarToml():
  | { ok: true; body: string }
  | { ok: false; error: string } {
  const signingKey = sep10SigningPublicKey();
  const endpoint = webAuthEndpoint();
  if (!signingKey || !endpoint) {
    return {
      ok: false,
      error: 'stellar.toml unavailable: configure HOME_DOMAIN and SEP10_SERVER_SECRET (or SEP10_SIGNING_KEY).',
    };
  }

  const accounts = [signingKey, ...(CONTRACT_ID ? [CONTRACT_ID] : [])];

  const lines = [
    'VERSION = "2.0.0"',
    `NETWORK_PASSPHRASE = "${NETWORK_PASSPHRASE}"`,
    `HORIZON_URL = "${HORIZON_URL}"`,
    `WEB_AUTH_ENDPOINT = "${endpoint}"`,
    `SIGNING_KEY = "${signingKey}"`,
    `ACCOUNTS = [${accounts.map((a) => `"${a}"`).join(', ')}]`,
    '',
    '[DOCUMENTATION]',
    'ORG_NAME = "Achievo"',
    'ORG_URL = "https://github.com/TadeyRuk/Achievo"',
    `ORG_DESCRIPTION = "Campus activity rewards on Stellar (${STELLAR_NETWORK})."`,
    '',
  ];

  return { ok: true, body: lines.join('\n') };
}
