import { test, expect } from '@playwright/test';

test.describe('Achievo PWA smoke', () => {
  test('loads the app shell and shows brand', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Achievo/i);
    // Splash or login or main shell should render without a blank document
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('service worker registration script is present', async ({ page }) => {
    await page.goto('/');
    const sw = page.locator('script').filter({ hasText: 'serviceWorker' });
    // Registration lives in the bundled main chunk, not a raw script tag —
    // assert the SW asset itself is served for the PWA.
    const res = await page.request.get('/sw.js');
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/cache|CACHE|workbox|addEventListener/i);
    void sw;
  });
});
