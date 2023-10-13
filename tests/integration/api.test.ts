import { beforeAll, describe, expect, it, jest, spyOn, jest } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import * as config from '~/config/default';

import youtubeResponseMock from '../fixtures/youtubeResponseMock.json';
import deezerResponseMock from '../fixtures/deezerResponseMock.json';

import { app } from '~/index';
import Redis from 'ioredis';

const API_ENDPOINT = 'http://localhost/api';

const spotifyHeadResponseMock = await Bun.file(
  'tests/fixtures/spotifyHeadResponseMock.html'
).text();

const appleMusicResponseMock = await Bun.file(
  'tests/fixtures/appleMusicResponseMock.html'
).text();

describe('Api router', () => {
  let mock: AxiosMockAdapter;
  let redisSetMock: jest.Mock;
  let redisGetMock: jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);

    redisSetMock = spyOn(Redis.prototype, 'set');
    redisGetMock = spyOn(Redis.prototype, 'get');
  });

  describe('GET /search', () => {
    const endpoint = `${API_ENDPOINT}/search`;
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
    const query = 'Do%20Not%20Disturb%20Drake';

    const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
    const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}&type=video&key=${config.services.youtube.apiKey}`;
    const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

    it('should return 200', async () => {
      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          },
          {
            type: 'youtube',
            url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/144572248',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
          },
        ],
      });

      expect(redisSetMock).toHaveBeenCalledTimes(2);
      expect(redisGetMock).toHaveBeenCalledTimes(1);
    });

    it('should return bad request', async () => {
      const request = new Request(`${endpoint}?foo=bar`);
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message:
          'ValueCreate.String: String types with patterns must specify a default value',
      });
    });
  });
});
