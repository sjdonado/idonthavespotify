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

      axiosMock.onGet().passThrough();

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
            url: 'https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
            isVerified: true,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Mobile link', async () => {
      const mobileSpotifyLink =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=c3hmDTxcTNWuUy0c92WaUw';

      axiosMock.onGet().passThrough();

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: mobileSpotifyLink }),
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
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
            isVerified: true,
          },
        ],
      });

      expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(0);
    });

    it('should return 200 - Extra query params', async () => {
      const link =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D';

      axiosMock.onGet().passThrough();

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
            url: 'https://music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
            isVerified: true,
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
      axiosMock.onGet().passThrough();

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hbGJ1bS83ZHFmdEoza2FzNkQwVkFkbXQzazNW',
        type: 'album',
        title: 'Stories',
        description: 'Avicii · Album · 2015 · 14 songs',
        image: 'https://i.scdn.co/image/ab67616d0000b2735393c5d3cac806092a9bc468',
        source: 'https://open.spotify.com/album/7dqftJ3kas6D0VAdmt3k3V',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/ca/album/stories/1440834059',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/album/11192186',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/aviciiofficial/sets/stories-253',
            isVerified: true,
          },
        ],
      });
    });
  });

  describe('GET /search - Artist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';

      axiosMock.onGet().passThrough();

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hcnRpc3QvNmwzSHZRNXNhNm1YVHNNVEIxOXJPNQ%3D%3D',
        type: 'artist',
        title: 'J. Cole',
        description: 'Artist · 36.2M monthly listeners.',
        image: 'https://i.scdn.co/image/ab6761610000e5eb4b053c29fd4b317ff825f0dc',
        source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/ca/artist/j-cole/73705833',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/artist/339209',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/j-cole',
            isVerified: true,
          },
        ],
      });
    });
  });

  describe('GET /search - Playlist', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';

      axiosMock.onGet().passThrough();

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
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'appleMusic',
            url: 'https://music.apple.com/ca/playlist/bad-bunny-essentials/pl.1c35ac10cfe848aaa19f68ebe62ea46e',
          },
          {
            isVerified: true,
            type: 'deezer',
            url: 'https://www.deezer.com/playlist/10737811462',
          },
          {
            isVerified: true,
            type: 'soundCloud',
            url: 'https://soundcloud.com/domingos-odemar/sets/this-is-bad-bunny',
          },
        ],
      });
    });
  });

  describe('GET /search - Podcast Show', () => {
    it('should return 200', async () => {
      const link =
        'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q?si=-eioJkIhREuPjvD16kyEAQ';

      axiosMock.onGet().passThrough();

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzJ1dk9mcEpSUmxpQ1dwYmlDWEtmNFE%3D',
        type: 'podcast',
        title: '¿Dónde estabas el 6 de noviembre del año 1985?',
        description: 'Tercera Vuelta · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8a85c9dd1468476ba33d95f0e9',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/6omeNtNZD86P8h4edCGXRl/clip_176359_236359.mp3',
        source: 'https://open.spotify.com/episode/2uvOfpJRRliCWpbiCXKf4Q',
        universalLink: 'http://localhost:4000/2saYhYg',
        links: [],
      });
    });
  });

  describe('GET /search - Podcast Episode', () => {
    it('should return 200', async () => {
      const link = 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT';

      axiosMock.onGet().passThrough();

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS9lcGlzb2RlLzQzVENyZ21QMjNxa0xjQVhaUU44cVQ%3D',
        type: 'podcast',
        title: 'The End of Twitter as We Know It',
        description: 'Waveform: The MKBHD Podcast · Episode',
        image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
        audio:
          'https://podz-content.spotifycdn.com/audio/clips/0Dijh26Vc2UoFrsXfkACQ8/clip_2900584_2965529.mp3',
        source: 'https://open.spotify.com/episode/43TCrgmP23qkLcAXZQN8qT',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'soundCloud',
            url: 'https://soundcloud.com/rem-official/its-the-end-of-the-world-as-4',
          },
        ],
      });
    });
  });
});
