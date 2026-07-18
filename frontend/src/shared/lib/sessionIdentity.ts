/** Persist server-issued identity session after a successful reward bind. */

const SESSION_KEY = 'achievo_session_token';
const IDENTITY_ID_KEY = 'achievo_identity_id';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getIdentityId(): string | null {
  try {
    return localStorage.getItem(IDENTITY_ID_KEY);
  } catch {
    return null;
  }
}

export function persistIdentitySession(identityId: string, sessionToken: string): void {
  try {
    localStorage.setItem(IDENTITY_ID_KEY, identityId);
    localStorage.setItem(SESSION_KEY, sessionToken);
  } catch { /* ignore */ }
}

export function clearIdentitySession(): void {
  try {
    localStorage.removeItem(IDENTITY_ID_KEY);
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}
