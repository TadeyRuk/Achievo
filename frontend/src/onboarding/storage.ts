/** On-device onboarding completion — localStorage only. */

export const ONBOARDING_DONE_KEY = "achievo_onboarding_done";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_DONE_KEY, "1");
  } catch { /* ignore */ }
}

export function clearOnboardingDone(): void {
  try {
    localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch { /* ignore */ }
}
