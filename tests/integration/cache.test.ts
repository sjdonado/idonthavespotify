import { beforeAll, afterEach, describe, expect, it, jest } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';

import { JSONRequest } from '../utils/request';
import { API_SEARCH_ENDPOINT, cachedResponse, cachedSpotifyLink } from '../utils/shared';

const spotifySongHeadResponseMock = await Bun.file(
  'tests/fixtures/spotify/songHeadResponseMock.html'
).text();

describe('Searches cache', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    mock.reset();
  });

  it('should return 200 from cache', async () => {
    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });

    mock.onGet(cachedSpotifyLink).reply(200, spotifySongHeadResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual(cachedResponse);

    expect(mock.history.get.length).toBe(0);
  });

  it('should return 200 from cache and increase search count', async () => {
    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });
    const searchCount = 2;

    mock.onGet(cachedSpotifyLink).reply(200, spotifySongHeadResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual(cachedResponse);

    expect(mock.history.get.length).toBe(0);
  });
});
