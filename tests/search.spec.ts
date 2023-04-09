import { test, expect } from '@playwright/test';

test.describe('Search Tests', () => {
  const spotifyLinkSong = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should return a song with a valid spotifyLink - Song', async ({ page }) => {
    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkSong);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Do Not Disturb');
    expect(searchCardText).toContain('Drake · Song · 2017');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const deezerLink = await page.getByText('Listen on Deezer').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/watch?v=zhY_0DoQCQs');
    expect(deezerLink).toBe('https://www.deezer.com/track/144572248');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=Do%20Not%20Disturb%20Drake');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake');
  });

  test('should return a song with a valid spotifyLink - Album', async ({ page }) => {
    const spotifyLinkAlbum = 'https://open.spotify.com/album/1lXY618HWkwYKJWBRYR4MK';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkAlbum);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('More Life');
    expect(searchCardText).toContain('Drake · Album · 2017 · 22 songs');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const deezerLink = await page.getByText('Listen on Deezer').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/playlist?list=PLGxQs-Q59UneXtjndClk4s5T108T8fD5S');
    expect(deezerLink).toBe('https://www.deezer.com/track/144572210');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=More%20Life%20Drake');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=More%20Life%20Drake');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=More%20Life%20Drake');
  });

  test('should return a song with a valid spotifyLink - Artist', async ({ page }) => {
    const spotifyLinkAlbum = 'https://open.spotify.com/album/1lXY618HWkwYKJWBRYR4MK';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkAlbum);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('More Life');
    expect(searchCardText).toContain('Drake · Album · 2017 · 22 songs');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const deezerLink = await page.getByText('Listen on Deezer').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/channel/UCByOQJjav0CUDwxCk-jVNRQ');
    expect(deezerLink).toBe('https://www.deezer.com/artist/246791');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=Drake');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Drake');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Drake');
  });

  test('should return a song with a valid spotifyLink - Playlist', async ({ page }) => {
    const spotifyLinkPlaylist = 'https://open.spotify.com/playlist/37i9dQZF1DX7QOv5kjbU68';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkPlaylist);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('This Is Drake');
    expect(searchCardText).toContain('This Is Drake · Playlist · 118 songs · 3.8M likes');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).not.toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/playlist?list=PLvWhOwZCUiGVYWXZ5JgzU7rWnSoaN_4sK');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=This%20Is%20Drake%20Playlist');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=This%20Is%20Drake%20Playlist');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=This%20Is%20Drake%20Playlist');
  });

  test('should return a song with a valid spotifyLink - Podcast', async ({ page }) => {
    const spotifyLinkPodcast = 'https://open.spotify.com/episode/0A7dzFTy9z0kcsyFCimGP1';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkPodcast);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('The art of paying attention');
    expect(searchCardText).toContain('Listen to this episode from TED Talks Daily on Spotify.');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).not.toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/watch?v=p5IuRLOer6E');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=The%20art%20of%20paying%20attention%20%7C%20Wendy%20MacNaughton%20TED%20Talks%20Daily');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=The%20art%20of%20paying%20attention%20%7C%20Wendy%20MacNaughton%20TED%20Talks%20Daily');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=The%20art%20of%20paying%20attention%20%7C%20Wendy%20MacNaughton%20TED%20Talks%20Daily');
  });

  test('should return a song with a valid spotifyLink - Show', async ({ page }) => {
    const spotifyLinkShow = 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkShow);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Waveform: The MKBHD Podcast');
    expect(searchCardText).toContain('Listen to Waveform: The MKBHD Podcast on Spotify');
    expect(searchCardText).toContain('Listen on Youtube');
    expect(searchCardText).not.toContain('Listen on Deezer');
    expect(searchCardText).toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const appleMusicLink = await page.getByText('Listen on Apple Music').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/channel/UCEcrRXW3oEYfUctetZTAWLw');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=Waveform%3A%20The%20MKBHD%20Podcast');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Waveform%3A%20The%20MKBHD%20Podcast');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Waveform%3A%20The%20MKBHD%20Podcast');
  });

  test('should return "No links found" with a valid spotifyLink - Spotify exclusive content', async ({ page }) => {
    const searchCard = page.getByTestId('search-card');

    const exclusiveContentSpotifyLink = 'https://open.spotify.com/episode/5dNTXSZtkQLm6HuVdboFtx';

    await page.fill('#song-link', exclusiveContentSpotifyLink);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('No links found');
    expect(searchCardText).not.toContain('Listen on Youtube');
    expect(searchCardText).not.toContain('Listen on Deezer');
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

    await page.fill('#song-link', spotifyLinkSong);
    await page.press('#song-link', 'Enter');

    await expect(searchCount).toHaveText(String(previousSearchCount + 1));
  });
});
