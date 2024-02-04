import {
  beforeAll,
  afterEach,
  afterAll,
  describe,
  expect,
  it,
  spyOn,
  jest,
} from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';

import { JSONRequest } from '../utils/request';
import { SEARCH_ENDPOINT, cachedResponse, cachedSpotifyLink } from '../utils/shared';

const spotifySongHeadResponseMock = await Bun.file(
  'tests/fixtures/spotify/spotifySongHeadResponseMock.html'
).text();

describe('Searches cache', () => {
  let mock: AxiosMockAdapter;
  let redisSetMock: jest.Mock;
  let redisGetMock: jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);

    redisSetMock = spyOn(Redis.prototype, 'set');
    redisGetMock = spyOn(Redis.prototype, 'get');
  });

  afterEach(() => {
    redisGetMock.mockReset();
    redisSetMock.mockReset();
  });

  afterAll(() => {
    mock.restore();
  });

  it('should return 200 from cache', async () => {
    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });

    mock.onGet(cachedSpotifyLink).reply(200, spotifySongHeadResponseMock);

    redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
    redisGetMock.mockResolvedValue(1);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual(cachedResponse);

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisGetMock.mock.calls).toEqual([
      ['idonthavespotify:cache::2KvHC9z14GSl4YpkNMX384'],
      ['idonthavespotify:searchCount'],
    ]);
    expect(redisSetMock).toHaveBeenCalledTimes(1);
  });

  it('should return 200 from cache and increase search count', async () => {
    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });
    const searchCount = 2;

    mock.onGet(cachedSpotifyLink).reply(200, spotifySongHeadResponseMock);

    redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
    redisGetMock.mockResolvedValue(searchCount);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual(cachedResponse);

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisGetMock.mock.calls).toEqual([
      ['idonthavespotify:cache::2KvHC9z14GSl4YpkNMX384'],
      ['idonthavespotify:searchCount'],
    ]);
    expect(redisSetMock).toHaveBeenCalledTimes(1);
    expect(redisSetMock.mock.calls).toEqual([
      ['idonthavespotify:searchCount', `${searchCount + 1}`],
    ]);
  });
});
