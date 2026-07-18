import posthog from 'posthog-js';

export function initializeAnalytics(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  posthog.init(key, {
    api_host:
      (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    autocapture: true,
  });
}

export function trackActivitySubmitted(length: number): void {
  posthog.capture('activity_submitted', { length });
}

export function trackRewardPaid(properties: {
  amount: number;
  activity: string;
  txHash: string;
}): void {
  posthog.capture('reward_paid', {
    amount: properties.amount,
    activity: properties.activity,
    tx_hash: properties.txHash,
  });
}

export function trackWalletConnected(walletType: string): void {
  posthog.capture('wallet_connected', { wallet_type: walletType });
}

export function trackTransactionFeedbackSubmitted(properties: {
  txHash: string;
  rating?: number;
  hasComment?: boolean;
}): void {
  posthog.capture('transaction_feedback_submitted', {
    tx_hash: properties.txHash,
    rating: properties.rating,
    has_comment: properties.hasComment,
  });
}

export function trackTransactionFeedbackSkipped(txHash: string): void {
  posthog.capture('transaction_feedback_skipped', { tx_hash: txHash });
}

export function trackOnboardingFinished(reason: 'skipped' | 'completed'): void {
  posthog.capture(reason === 'skipped' ? 'onboarding_skipped' : 'onboarding_completed');
}

export function trackOnboardingStep(id: string, index: number): void {
  posthog.capture('onboarding_step', { id, index });
}

export function trackOnboardingWelcomeShown(): void {
  posthog.capture('onboarding_welcome_shown');
}
