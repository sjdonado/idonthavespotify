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
    const spotifyLinkAlbum = 'https://open.spotify.com/album/1gDqOyL8NmU2LQPtFutRng';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkAlbum);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('MultiViral');
    expect(searchCardText).toContain('Calle 13 · Album · 2014 · 15 songs');
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

    expect(youtubeLink).toBe('https://www.youtube.com/playlist?list=PLDUEjoBVMbh_-FtCOppxPRktZX5Q2xdGE');
    expect(deezerLink).toBe('https://www.deezer.com/album/7482049');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=MultiViral%20Calle%2013');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=MultiViral%20Calle%2013');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=MultiViral%20Calle%2013');
  });

  test('should return a song with a valid spotifyLink - Artist', async ({ page }) => {
    const spotifyLinkArtist = 'https://open.spotify.com/artist/0EmeFodog0BfCgMzAIvKQp';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkArtist);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Shakira');
    expect(searchCardText).toContain('Artist · 79.4M monthly listeners');
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

    expect(youtubeLink).toBe('https://www.youtube.com/channel/UCYLNGLIzMhRTi6ZOLjAPSmw');
    expect(deezerLink).toBe('https://www.deezer.com/artist/160');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=Shakira');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Shakira');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Shakira');
  });

  test('should return a song with a valid spotifyLink - Playlist', async ({ page }) => {
    const spotifyLinkPlaylist = 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkPlaylist);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('lofi beats');
    expect(searchCardText).toContain('lofi beats · Playlist · 800 songs · 5M likes');
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

    expect(youtubeLink).toBe('https://www.youtube.com/playlist?list=PLuDoiEqVUgejiZy0AOEEOLY2YFFXncwEA');
    expect(deezerLink).toBe('https://www.deezer.com/playlist/7584355422');
    expect(appleMusicLink).toBe('https://music.apple.com/search?term=lofi%20beats%20Playlist');
    expect(tidalLink).toBe('https://music.apple.com/search?term=lofi%20beats%20Playlist');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=lofi%20beats%20Playlist');
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
