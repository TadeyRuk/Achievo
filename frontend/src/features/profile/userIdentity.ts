/** On-device user identity (name) — localStorage only, no server account. */

export const USER_NAME_KEY = "achievo_user_name";

export function getUserName(): string | null {
  try {
    const raw = localStorage.getItem(USER_NAME_KEY);
    const trimmed = raw?.trim() ?? "";
    return trimmed || null;
  } catch {
    return null;
  }
}

export function setUserName(name: string): void {
  const trimmed = name.trim();
  try {
    if (trimmed) {
      localStorage.setItem(USER_NAME_KEY, trimmed);
    } else {
      localStorage.removeItem(USER_NAME_KEY);
    }
  } catch { /* ignore */ }
}

export function hasUserName(): boolean {
  return getUserName() !== null;
}
