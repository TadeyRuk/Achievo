import { test, expect } from '@playwright/test';

/**
 * Rejection-path smoke: when /api/reward is unavailable/rejected,
 * the static shell still loads (API failures must not white-screen the app).
 */
test.describe('reward rejection resilience', () => {
  test('app stays usable when reward API returns 429', async ({ page }) => {
    await page.route('**/api/reward', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit: 1 reward per day. Try again tomorrow.' }),
      });
    });

    await page.goto('/');
    await expect(page.locator('#root')).not.toBeEmpty();
    // Health probe (if fired) should not crash the tree either
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          rewardsPaused: false,
          checks: { contractId: 'ok', redis: 'degraded', rpc: 'ok' },
          network: 'testnet',
        }),
      });
    });
    await page.reload();
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});
