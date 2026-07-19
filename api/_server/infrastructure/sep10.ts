import { createHash } from 'crypto';
import { Keypair, WebAuth } from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE } from '@achievo/shared';
import { signSep10Jwt, verifySep10Jwt } from './jwt';

const CHALLENGE_TIMEOUT_SECONDS = 300;
const JWT_TTL_SECONDS = 30 * 60;

type Sep10Env = {
  serverSecret: string;
  jwtSecret: string;
  homeDomain: string;
  webAuthDomain: string;
};

function readSep10Env(): Sep10Env | null {
  const serverSecret = process.env.SEP10_SERVER_SECRET?.trim();
  const jwtSecret = process.env.SEP10_JWT_SECRET?.trim();
  const homeDomain = process.env.HOME_DOMAIN?.trim();
  const webAuthDomain = process.env.WEB_AUTH_DOMAIN?.trim();
  if (!serverSecret || !jwtSecret || !homeDomain || !webAuthDomain) return null;
  return { serverSecret, jwtSecret, homeDomain, webAuthDomain };
}

function requireSep10Env(): Sep10Env {
  const env = readSep10Env();
  if (!env) throw new Error('SEP-10 is not configured.');
  return env;
}

export function sep10Configured(): boolean {
  return readSep10Env() !== null;
}

export function sep10SigningPublicKey(): string | null {
  const configured = process.env.SEP10_SIGNING_KEY?.trim() || null;
  const secret = process.env.SEP10_SERVER_SECRET?.trim();
  if (!secret) return configured;
  try {
    return Keypair.fromSecret(secret).publicKey();
  } catch {
    return configured;
  }
}

export function buildWebAuthChallenge(account: string): {
  transaction: string;
  networkPassphrase: string;
} {
  const { serverSecret, homeDomain, webAuthDomain } = requireSep10Env();
  const transaction = WebAuth.buildChallengeTx(
    Keypair.fromSecret(serverSecret),
    account,
    homeDomain,
    CHALLENGE_TIMEOUT_SECONDS,
    NETWORK_PASSPHRASE,
    webAuthDomain,
  );
  return { transaction, networkPassphrase: NETWORK_PASSPHRASE };
}

export function verifyWebAuthAndIssueToken(signedTransaction: string): {
  token: string;
  wallet: string;
  expiresAt: number;
  challengeId: string;
} {
  const { serverSecret, jwtSecret, homeDomain, webAuthDomain } = requireSep10Env();
  const serverAccountID = Keypair.fromSecret(serverSecret).publicKey();

  const { clientAccountID } = WebAuth.readChallengeTx(
    signedTransaction,
    serverAccountID,
    NETWORK_PASSPHRASE,
    homeDomain,
    webAuthDomain,
  );

  WebAuth.verifyChallengeTxSigners(
    signedTransaction,
    serverAccountID,
    NETWORK_PASSPHRASE,
    [clientAccountID],
    homeDomain,
    webAuthDomain,
  );

  const challengeId = createHash('sha256').update(signedTransaction).digest('hex');
  const token = signSep10Jwt(
    { sub: clientAccountID, iss: homeDomain, ttlSeconds: JWT_TTL_SECONDS },
    jwtSecret,
  );
  const expiresAt = Math.floor(Date.now() / 1000) + JWT_TTL_SECONDS;
  return { token, wallet: clientAccountID, expiresAt, challengeId };
}

export function verifyRewardAuthToken(
  token: string,
): { ok: true; wallet: string } | { ok: false; error: string } {
  const jwtSecret = process.env.SEP10_JWT_SECRET?.trim();
  const homeDomain = process.env.HOME_DOMAIN?.trim();
  if (!jwtSecret || !homeDomain) {
    return { ok: false, error: 'Server configuration error.' };
  }
  const verified = verifySep10Jwt(token, jwtSecret, homeDomain);
  if (!verified.ok) return verified;
  return { ok: true, wallet: verified.claims.sub };
}
