import { test, expect } from '@playwright/test';

test.describe('Search Tests', () => {
  const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should return a song with a valid spotifyLink', async ({ page }) => {
    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLink);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Do Not Disturb');
    expect(searchCardText).toContain('Drake · Song · 2017');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');
  });

  test('should return an error with an invalid spotifyLink', async ({ page }) => {
    const invalidSpotifyLink = 'https://open.spotify.com/invalid';

    const inputSelector = '#song-link';

    await page.fill('#song-link', invalidSpotifyLink);
    await page.press('#song-link', 'Enter');

    expect(await page.$(`${inputSelector}:invalid`)).toBeTruthy();
  });

  test('should increment the queries performed counter', async ({ page }) => {
    const searchCount = page.getByTestId('search-count');

    const previousSearchCount = Number(await searchCount.textContent());

    await page.fill('#song-link', spotifyLink);
    await page.press('#song-link', 'Enter');

    await expect(searchCount).toHaveText(String(previousSearchCount + 1));
  });
});
