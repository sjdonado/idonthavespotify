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
    expect(appleMusicLink).toBe('https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237');
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
    expect(appleMusicLink).toBe('https://music.apple.com/us/album/multiviral/828622648');
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
    expect(searchCardText).toContain('Artist');
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
    expect(appleMusicLink).toBe('https://music.apple.com/us/artist/shakira/889327');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Shakira');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Shakira');
  });

  test('should return a song with a valid spotifyLink - Playlist', async ({ page }) => {
    const spotifyLinkPlaylist = 'https://open.spotify.com/playlist/37i9dQZF1DX10zKzsJ2jva';

    const searchCard = page.getByTestId('search-card');

    await page.fill('#song-link', spotifyLinkPlaylist);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Viva Latino');
    expect(searchCardText).toContain('Viva Latino · Playlist');
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

    expect(youtubeLink).toBe('https://www.youtube.com/playlist?list=PLgzTt0k8mXzEwr38NTt-4CgJBAAdhTtOD');
    expect(deezerLink).toBe('https://www.deezer.com/playlist/1948184026');
    expect(appleMusicLink).toBe('https://music.apple.com/us/playlist/latino-replay/pl.0ae77df4825640b68cf6485a4ba8bc67');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Viva%20Latino%20Playlist');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Viva%20Latino%20Playlist');
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
    // deezer API doesn't support episodes searches
    expect(searchCardText).not.toContain('Listen on Deezer');
    // apple has a different service for Podcasts only
    expect(searchCardText).not.toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/watch?v=p5IuRLOer6E');
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
    expect(searchCardText).toContain('Listen on Deezer');
    // apple has a different service for Podcasts only
    expect(searchCardText).not.toContain('Listen on Apple Music');
    expect(searchCardText).toContain('Listen on Tidal');
    expect(searchCardText).toContain('Listen on SoundCloud');

    const youtubeLink = await page.getByText('Listen on Youtube').getAttribute('href');
    const deezerLink = await page.getByText('Listen on Deezer').getAttribute('href');
    const tidalLink = await page.getByText('Listen on Tidal').getAttribute('href');
    const soundcloudLink = await page.getByText('Listen on SoundCloud').getAttribute('href');

    expect(youtubeLink).toBe('https://www.youtube.com/channel/UCEcrRXW3oEYfUctetZTAWLw');
    expect(deezerLink).toBe('https://www.deezer.com/show/1437252');
    expect(tidalLink).toBe('https://listen.tidal.com/search?q=Waveform%3A%20The%20MKBHD%20Podcast');
    expect(soundcloudLink).toBe('https://soundcloud.com/search/sounds?q=Waveform%3A%20The%20MKBHD%20Podcast');
  });

  test('should return "Not available on other platforms" with a valid spotifyLink - Spotify exclusive content', async ({ page }) => {
    const searchCard = page.getByTestId('search-card');

    const exclusiveContentSpotifyLink = 'https://open.spotify.com/episode/5dNTXSZtkQLm6HuVdboFtx';

    await page.fill('#song-link', exclusiveContentSpotifyLink);
    await page.press('#song-link', 'Enter');

    const searchCardText = await searchCard.textContent() ?? '';

    expect(searchCardText).toContain('Not available on other platforms');
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
