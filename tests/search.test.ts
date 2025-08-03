import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import type { Server } from 'bun';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  spyOn,
} from 'bun:test';

import { ENV } from '~/config/env';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import { createTestApp, nodeFetch } from './utils/request';
import {
  apiSearchEndpoint,
  urlShortenerLink,
  urlShortenerResponseMock,
} from './utils/shared';

describe('GET /search', () => {
  let app: Server;
  let searchEndpointUrl: string;

  let axiosMock: InstanceType<typeof AxiosMockAdapter>;
  let getUniversalMetadataFromTidalMock: Mock<
    typeof tidalUniversalLinkParser.getUniversalMetadataFromTidal
  >;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);

    axiosMock = new AxiosMockAdapter(axios);
    getUniversalMetadataFromTidalMock = spyOn(
      tidalUniversalLinkParser,
      'getUniversalMetadataFromTidal'
    );
  });

  afterAll(() => {
    cacheStore.reset();
    axiosMock.reset();
    getUniversalMetadataFromTidalMock.mockReset();
  });

  beforeEach(() => {
    cacheStore.reset();
    axiosMock.reset();

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
    axiosMock.onPost(ENV.adapters.spotify.authUrl).reply(200, {});
    axiosMock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    axiosMock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  describe('GET /search - Song', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';

      // Mock Spotify metadata API
      axiosMock.onGet('https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc').reply(
        200,
        `
        <meta property="og:title" content="Like a Rolling Stone" />
        <meta property="og:description" content="Bob Dylan · Highway 61 Revisited · Song · 1965" />
        <meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2" />
        <meta property="og:type" content="music.song" />
        <meta property="og:audio" content="https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Songs"><a href="https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675">Like a Rolling Stone</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*track/).reply(200, {
        data: [
          {
            title: 'Like a Rolling Stone',
            link: 'https://www.deezer.com/track/14477354',
          },
        ],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/bobdylan/like-a-rolling-stone-1">Like a Rolling Stone</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdj',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2',
        audio: 'https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
            notAvailable: false,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Mobile link', async () => {
      const mobileSpotifyLink =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=c3hmDTxcTNWuUy0c92WaUw';

      // Mock Spotify metadata API
      axiosMock.onGet(/open\.spotify\.com\/track\/3AhXZa8sUQht0UEdBJgpGc/).reply(
        200,
        `
        <meta property="og:title" content="Like a Rolling Stone" />
        <meta property="og:description" content="Bob Dylan · Highway 61 Revisited · Song · 1965" />
        <meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2" />
        <meta property="og:type" content="music.song" />
        <meta property="og:audio" content="https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Songs"><a href="https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675">Like a Rolling Stone</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*track/).reply(200, {
        data: [
          {
            title: 'Like a Rolling Stone',
            link: 'https://www.deezer.com/track/14477354',
          },
        ],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/bobdylan/like-a-rolling-stone-1">Like a Rolling Stone</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: mobileSpotifyLink }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdjP3NpPWMzaG1EVHhjVE5XdVV5MGM5MldhVXc',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2',
        audio: 'https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa',
        source:
          'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=c3hmDTxcTNWuUy0c92WaUw',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
            notAvailable: false,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Extra query params', async () => {
      const link =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D';

      // Mock Spotify metadata API
      axiosMock.onGet(/open\.spotify\.com\/track\/3AhXZa8sUQht0UEdBJgpGc/).reply(
        200,
        `
        <meta property="og:title" content="Like a Rolling Stone" />
        <meta property="og:description" content="Bob Dylan · Highway 61 Revisited · Song · 1965" />
        <meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2" />
        <meta property="og:type" content="music.song" />
        <meta property="og:audio" content="https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Songs"><a href="https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675">Like a Rolling Stone</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*track/).reply(200, {
        data: [
          {
            title: 'Like a Rolling Stone',
            link: 'https://www.deezer.com/track/14477354',
          },
        ],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/bobdylan/like-a-rolling-stone-1">Like a Rolling Stone</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdjP3NpPU5iRUVWUFp2VFZ1b3ZfbkEzeWxKSlE',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2',
        audio: 'https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa',
        source:
          'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
            notAvailable: false,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });
  });

  describe('GET /search - Album', () => {
    const link =
      'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V?si=e3MGBRjwSAuq7VuUN59HpA';

    it('should return 200', async () => {
      // Mock Spotify metadata API
      axiosMock.onGet(/open\.spotify\.com\/album\/7dqftJ3kas6D0VAdmt3k3V/).reply(
        200,
        `
        <meta property="og:title" content="Stories" />
        <meta property="og:description" content="Avicii · Album · 2015 · 14 songs" />
        <meta property="og:image" content="https://i.scdn.co/image/ab67616d0000b2735393c5d3cac806092a9bc468" />
        <meta property="og:type" content="music.album" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Albums"><a href="https://music.apple.com/ca/album/stories/1440834059">Stories</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*album/).reply(200, {
        data: [
          {
            title: 'Stories',
            link: 'https://www.deezer.com/album/11192186',
          },
        ],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/aviciiofficial/sets/stories-253">Stories</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hbGJ1bS83ZHFmdEoza2FzNkQwVkFkbXQzazNWP3NpPWUzTUdCUmp3U0F1cTdWdVVONTlIcEE',
        type: 'album',
        title: 'Stories',
        description: 'Avicii · Album · 2015 · 14 songs',
        image: 'https://i.scdn.co/image/ab67616d0000b2735393c5d3cac806092a9bc468',
        source:
          'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V?si=e3MGBRjwSAuq7VuUN59HpA',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/stories/1440834059',
            isVerified: false,
            notAvailable: false,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/album/11192186',
            isVerified: false,
            notAvailable: false,
          },
        ],
      });
    });
  });

  describe('GET /search - Artist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';

      // Mock Spotify metadata API
      axiosMock.onGet('https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5').reply(
        200,
        `
        <meta property="og:title" content="J. Cole" />
        <meta property="og:description" content="Artist · 36.2M monthly listeners." />
        <meta property="og:image" content="https://i.scdn.co/image/ab6761610000e5eb4b053c29fd4b317ff825f0dc" />
        <meta property="og:type" content="profile" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Artists"><a href="https://music.apple.com/ca/artist/j-cole/73705833">J. Cole</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*artist/).reply(200, {
        data: [{ name: 'J. Cole', link: 'https://www.deezer.com/artist/339209' }],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/j-cole">J. Cole</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hcnRpc3QvNmwzSHZRNXNhNm1YVHNNVEIxOXJPNQ',
        type: 'artist',
        title: 'J. Cole',
        description: 'Artist · 36.2M monthly listeners.',
        image: 'https://i.scdn.co/image/ab6761610000e5eb4b053c29fd4b317ff825f0dc',
        source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/artist/j-cole/73705833',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/artist/339209',
          },
        ],
      });
    });
  });

  describe('GET /search - Playlist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';

      // Mock Spotify metadata API
      axiosMock.onGet('https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ').reply(
        200,
        `
        <meta property="og:title" content="This Is Bad Bunny" />
        <meta property="og:description" content="Playlist · Spotify · 129 items · 5.6M saves" />
        <meta property="og:image" content="https://i.scdn.co/image/ab67706f00000002b5c87a0cb63c40dfe1ffd68e" />
        <meta property="og:type" content="music.playlist" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(
        200,
        `
        <div aria-label="Playlists"><a href="https://music.apple.com/ca/playlist/bad-bunny-essentials/pl.1c35ac10cfe848aaa19f68ebe62ea46e">Bad Bunny Essentials</a></div>
      `
      );

      axiosMock.onGet(/api\.deezer\.com.*search.*playlist/).reply(200, {
        data: [
          {
            title: 'This Is Bad Bunny',
            link: 'https://www.deezer.com/playlist/10737811462',
          },
        ],
      });

      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/domingos-odemar/sets/this-is-bad-bunny">This Is Bad Bunny</a></h2></li></ul></noscript>
      `
      );

      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9wbGF5bGlzdC8zN2k5ZFFaRjFEWDJhcFd6eUVDd3la',
        type: 'playlist',
        title: 'This Is Bad Bunny',
        description: 'Playlist · Spotify · 129 items · 5.6M saves',
        image: 'https://i.scdn.co/image/ab67706f00000002b5c87a0cb63c40dfe1ffd68e',
        source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/playlist/10737811462',
          },
          {
            isVerified: false,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/playlist/bad-bunny-essentials/pl.1c35ac10cfe848aaa19f68ebe62ea46e',
          },
        ],
      });
    });
  });

  describe('GET /search - Podcast Show', () => {
    it('should return 200', async () => {
      const link =
        'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q?si=-eioJkIhREuPjvD16kyEAQ';

      // Mock Spotify metadata API
      axiosMock.onGet(/open\.spotify\.com\/episode\/2uvOfpJRRliCWpbiCXKf4Q/).reply(
        200,
        `
        <meta property="og:title" content="¿Dónde estabas el 6 de noviembre del año 1985?" />
        <meta property="og:description" content="Tercera Vuelta · Episode" />
        <meta property="og:image" content="https://i.scdn.co/image/ab6765630000ba8a85c9dd1468476ba33d95f0e9" />
        <meta property="og:audio" content="https://podz-content.spotifycdn.com/audio/clips/6omeNtNZD86P8h4edCGXRl/clip_176359_236359.mp3" />
      `
      );

      // Mock adapter API calls - podcasts usually don't have matches on other platforms
      axiosMock.onGet(/music\.apple\.com.*search/).reply(200, '<div></div>');
      axiosMock.onGet(/api\.deezer\.com.*search/).reply(200, { data: [] });
      axiosMock
        .onGet(/soundcloud\.com.*search/)
        .reply(200, '<noscript><ul></ul></noscript>');
      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzJ1dk9mcEpSUmxpQ1dwYmlDWEtmNFE_c2k9LWVpb0prSWhSRXVQanZEMTZreUVBUQ',
        type: 'podcast',
        title: '¿Dónde estabas el 6 de noviembre del año 1985?',
        description: 'Tercera Vuelta · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8a85c9dd1468476ba33d95f0e9',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/6omeNtNZD86P8h4edCGXRl/clip_176359_236359.mp3',
        source:
          'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q?si=-eioJkIhREuPjvD16kyEAQ',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [],
      });
    });
  });

  describe('GET /search - Podcast Episode', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT';

      // Mock Spotify metadata API
      axiosMock.onGet('https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT').reply(
        200,
        `
        <meta property="og:title" content="The End of Twitter as We Know It" />
        <meta property="og:description" content="Waveform: The MKBHD Podcast · Episode" />
        <meta property="og:image" content="https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a" />
        <meta property="og:audio" content="https://podz-content.spotifycdn.com/audio/clips/0Dijh26Vc2UoFrsXfkACQ8/clip_2900584_2965529.mp3" />
      `
      );

      // Mock adapter API calls
      axiosMock.onGet(/music\.apple\.com.*search/).reply(200, '<div></div>');
      axiosMock.onGet(/api\.deezer\.com.*search/).reply(200, { data: [] });
      axiosMock.onGet(/soundcloud\.com.*search/).reply(
        200,
        `
        <noscript><ul><li><h2><a href="/rem-official/its-the-end-of-the-world-as-4">It's the End of the World</a></h2></li></ul></noscript>
      `
      );
      axiosMock.onGet(/openapi\.tidal\.com.*searchresults/).reply(404);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzQzVENyZ21QMjNxa0xjQVhaUU44cVQ',
        type: 'podcast',
        title: 'The End of Twitter as We Know It',
        description: 'Waveform: The MKBHD Podcast · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/0Dijh26Vc2UoFrsXfkACQ8/clip_2900584_2965529.mp3',
        source: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [],
      });
    });
  });
});
