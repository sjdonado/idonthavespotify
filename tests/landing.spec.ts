import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should has title', async ({ page }) => {
    const expectedTitle = "I don't have Spotify";

    const title = await page.locator('h1').textContent();

    expect(title).toBe(expectedTitle);
  });

  test('should has subtitle', async ({ page }) => {
    const expectedSubtitle = 'Paste a Spotify link and get the content on other platforms.';

    const subtitle = await page.locator('h2').textContent();

    expect(subtitle).toBe(expectedSubtitle);
  });

  test('should has footer links', async ({ page }) => {
    const footerText = await page.locator('footer').textContent();

    expect(footerText).toContain('Raycast Extension');
    expect(footerText).toContain('View on Github');
  });
});
