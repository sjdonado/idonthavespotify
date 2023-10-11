import { beforeAll, describe, expect, it } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import * as config from '~/config/default';

import { app } from '~/index';

const API_ENDPOINT = 'http://localhost/api';

const spotifyHeadResponseMock = await Bun.file(
  'tests/fixtures/spotifyHeadResponseMock.html'
).text();

const appleMusicResponseMock = await Bun.file(
  'tests/fixtures/appleMusicResponseMock.html'
).text();

describe('Api router', () => {
  let mock: AxiosMockAdapter;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  describe('GET /search', () => {
    const endpoint = `${API_ENDPOINT}/search`;
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
    const query = 'Do%20Not%20Disturb%20Drake';

    it('should return 200', async () => {
      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyHeadResponseMock);
      mock
        .onGet(`${config.services.appleMusic.baseUrl}${query}`)
        .reply(200, appleMusicResponseMock);

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
        ],
      });
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
