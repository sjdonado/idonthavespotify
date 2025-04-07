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

import { createTestApp, nodeFetch } from '../utils/request';
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
} from '../utils/shared';

describe('Api router', () => {
  let app: Server;
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
    });

    it('should return 200 when adapter returns error', async () => {
      const link =
        'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc?si=different_version';
      const query = 'Like a Rolling Stone Bob Dylan';

      axiosMock.onGet(getTidalSearchLink(query, MetadataType.Song)).reply(500);
      axiosMock.onGet(getAppleMusicSearchLink(query)).reply(500);
      axiosMock.onGet(getYouTubeSearchLink(query, MetadataType.Song)).reply(500);
      axiosMock.onGet(getDeezerSearchLink(query, 'track')).reply(500);
      axiosMock.onGet(getSoundCloudSearchLink(query)).reply(500);
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
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdjP3NpPWRpZmZlcmVudF92ZXJzaW9u',
        type: 'song',
        title: 'Like a Rolling Stone',
        description: 'Bob Dylan · Highway 61 Revisited · Song · 1965',
        image: 'https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2',
        audio: 'https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa',
        source: link,
        universalLink: urlShortenerResponseMock.data.refer,
        links: [],
      });
    });

    it('should return 200 when adapter adapter matches the parser type', async () => {
      axiosMock.onGet().passThrough();

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
        image: 'https://i.scdn.co/image/ab67616d0000b27341720ef0ae31e10d39e43ca2',
        audio: 'https://p.scdn.co/mp3-preview/d48c45e3194cfe07470c85e50ca7dc7440661caa',
        source: 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc',
        universalLink:
          'http://localhost:3000?id=b3Blbi5zcG90aWZ5LmNvbS90cmFjay8zQWhYWmE4c1VRaHQwVUVkQkpncEdj',
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
