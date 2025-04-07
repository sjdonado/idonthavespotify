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

describe('GET /search - Artist', () => {
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
      description: 'Artist · 45.1M monthly listeners.',
      image: 'https://i.scdn.co/image/ab6761610000e5ebadd503b411a712e277895c8a',
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
