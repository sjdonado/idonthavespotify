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
import { createApp } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import { nodeFetch } from '../../utils/request';
import {
  apiSearchEndpoint,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

describe('GET /search - Album', () => {
  let app: Server;
  let searchEndpointUrl: string;

  let axiosMock: InstanceType<typeof AxiosMockAdapter>;
  let getUniversalMetadataFromTidalMock: Mock<
    typeof tidalUniversalLinkParser.getUniversalMetadataFromTidal
  >;

  beforeAll(() => {
    app = createApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);
    axiosMock = new AxiosMockAdapter(axios);
    getUniversalMetadataFromTidalMock = spyOn(
      tidalUniversalLinkParser,
      'getUniversalMetadataFromTidal'
    );
  });

  afterAll(() => {
    app.stop(true);
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
        id: 'b3Blbi5zcG90aWZ5LmNvbS9hbGJ1bS83ZHFmdEoza2FzNkQwVkFkbXQzazNWP3NpPWUzTUdCUmp3U0F1cTdWdVVONTlIcEE%3D',
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
});
