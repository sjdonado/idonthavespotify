import { test, expect } from '@playwright/test';

test.describe('Search Tests', () => {
  const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/watch?v=zhY_0DoQCQs');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=Do%20Not%20Disturb%20Drake');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake');
  });

  test('should return "No links found" with a valid spotifyLink - Spotify exclusive content', async ({ page }) => {
    const searchCard = page.getByTestId('search-card');

    const exclusiveContentSpotifyLink = 'https://open.spotify.com/episode/5dNTXSZtkQLm6HuVdboFtx';

    await page.fill('#song-link', exclusiveContentSpotifyLink);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('No links found');
    expect(searchCardText).not.toContain('Listen on Youtube');
    expect(searchCardText).not.toContain('Listen on Apple Music');
    expect(searchCardText).not.toContain('Listen on Tidal');
    expect(searchCardText).not.toContain('Listen on SoundCloud');
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

    await page.waitForTimeout(1000);
    const previousSearchCount = Number(await searchCount.textContent());

    await page.fill('#song-link', spotifyLink);
    await page.press('#song-link', 'Enter');

    await expect(searchCount).toHaveText(String(previousSearchCount + 1));
  });
});
