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

import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import { loadHeadSnapshots, loadSearchSnapshots } from './mocks/snapshots';
import { createTestApp, nodeFetch } from './utils/request';
import {
  apiSearchEndpoint,
  cachedSpotifyLink,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getTidalSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from './utils/shared';

const headSnapshots = loadHeadSnapshots();
const searchSnapshots = loadSearchSnapshots();

describe('Api router', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;

  let axiosMock: InstanceType<typeof AxiosMockAdapter>;
  let getUniversalMetadataFromTidalaxiosMock: Mock<
    typeof tidalUniversalLinkParser.getUniversalMetadataFromTidal
  >;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);

    axiosMock = new AxiosMockAdapter(axios);
    getUniversalMetadataFromTidalaxiosMock = spyOn(
      tidalUniversalLinkParser,
      'getUniversalMetadataFromTidal'
    );
  });

  afterAll(() => {
    app.stop();
    axiosMock.reset();
    getUniversalMetadataFromTidalaxiosMock.mockReset();
  });

  beforeEach(() => {
    cacheStore.reset();
    axiosMock.reset();

    getUniversalMetadataFromTidalaxiosMock.mockResolvedValue(undefined);
    axiosMock.onPost(ENV.adapters.spotify.authUrl).reply(200, {});
    axiosMock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    axiosMock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  afterEach(() => {
    axiosMock.reset();
  });

  describe('GET /search', () => {
    const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';

    it('should return 200', async () => {
      const query = 'Like a Rolling Stone Bob Dylan';

      axiosMock.onGet(getTidalSearchLink(query, MetadataType.Song)).reply(404);
      axiosMock.onGet(getYouTubeSearchLink(query, MetadataType.Song)).reply(404);
      axiosMock
        .onGet(getAppleMusicSearchLink(query))
        .reply(200, searchSnapshots.appleMusicRollingStone);
      axiosMock
        .onGet(getDeezerSearchLink(query, 'track'))
        .reply(200, JSON.parse(searchSnapshots.deezerRollingStone));
      axiosMock
        .onGet(getSoundCloudSearchLink(query))
        .reply(200, searchSnapshots.soundCloudRollingStone);
      axiosMock
        .onGet('https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc')
        .reply(200, headSnapshots.spotifyTrackRollingStone);

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
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            notAvailable: false,
            type: 'appleMusic',
            url: 'https://geo.music.apple.com/ca/album/like-a-rolling-stone/192688369?i=192688675',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'deezer',
            url: 'https://www.deezer.com/track/14477354',
          },
          {
            isVerified: true,
            notAvailable: false,
            type: 'soundCloud',
            url: 'https://soundcloud.com/bobdylan/like-a-rolling-stone-1',
          },
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
          },
        ],
      });
    });

    it('should return 200 when adapter returns error', async () => {
      const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';
      const query = 'Like a Rolling Stone Bob Dylan';

      axiosMock.onGet(getTidalSearchLink(query, MetadataType.Song)).reply(500);
      axiosMock.onGet(getAppleMusicSearchLink(query)).reply(500);
      axiosMock.onGet(getYouTubeSearchLink(query, MetadataType.Song)).reply(500);
      axiosMock.onGet(getDeezerSearchLink(query, 'track')).reply(500);
      axiosMock.onGet(getSoundCloudSearchLink(query)).reply(500);
      // Mock Spotify metadata API
      axiosMock
        .onGet('https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc')
        .reply(200, headSnapshots.spotifyTrackRollingStone);

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
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source: link,
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
          },
        ],
      });
    });

    it('should return 200 when adapter adapter matches the parser type', async () => {
      axiosMock
        .onGet('https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc')
        .reply(200, headSnapshots.spotifyTrackRollingStone);

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link, adapters: [Adapter.Spotify] }),
      });

      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdj',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b2730cb0884829c5503b2e242541',
        audio: 'https://p.scdn.co/mp3-preview/62c229b1cadd22b991df9aeaedd38e873ddaccbe',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            isVerified: true,
            type: 'spotify',
            url: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
          },
        ],
      });
    });

    it('should return unknown error - could not parse Spotify metadata', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      axiosMock.onGet(cachedSpotifyLink).reply(200, '<html></html>');

      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link }),
      });

      const data = await response.json();

      expect(data).toEqual({
        error:
          '[getSpotifyMetadata] (https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384) Error: Spotify metadata not found',
      });
    });

    it('should return bad request - invalid link', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ link: 'https://open.spotify.com/invalid' }),
      });

      const data = await response.json();

      expect(data).toEqual({
        error: 'Invalid link, please check ALLOWED_LINKS_REGEX',
      });
    });

    it('should return bad request - invalid searchId', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ searchId: 123 }),
      });

      const data = await response.json();

      expect(data).toEqual({
        error: 'Invalid link, field is required',
      });
    });

    it('should return bad request - unknown body param', async () => {
      const response = await nodeFetch(searchEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ foo: 'bar' }),
      });

      const data = await response.json();

      expect(data).toEqual({
        error: 'Invalid link, field is required',
      });
    });

    it('should return bad request - unsupported API version', async () => {
      const response = await nodeFetch(`${app.url}api/search?v=2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      expect(data).toEqual({
        error: 'Unsupported API version',
      });
    });

    it('should return bad request - missing API version query param', async () => {
      const response = await nodeFetch(`${app.url}api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      expect(data).toEqual({
        error: 'API version required',
      });
    });
  });
});
