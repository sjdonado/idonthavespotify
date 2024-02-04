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
import { API_ENDPOINT, SEARCH_ENDPOINT, cachedSpotifyLink } from '../utils/shared';

describe('Api router', () => {
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

  describe('GET /search', () => {
    it('should return unknown error - could not parse Spotify metadata', async () => {
      const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink: cachedSpotifyLink });

      mock.onGet(cachedSpotifyLink).reply(200, '<html></html>');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message:
          '[parseSpotifyMetadata] (https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384) Error: Spotify metadata not found',
      });
    });

    it('should return bad request - invalid spotifyLink', async () => {
      const spotifyLink = 'https://open.spotify.com/invalid';

      const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });

    it('should return bad request - unknown body param', async () => {
      const request = JSONRequest(SEARCH_ENDPOINT, { foo: 'bar' });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });

    it('should return bad request - unsupported API version', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search?v=1`, {
        spotifyLink: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });

    it('should return bad request - missing API version query param', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search`, {
        spotifyLink: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });
  });
});
