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

import { JSONRequest } from '../../utils/request';
import {
  SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getYoutubeSearchLink,
} from '../../utils/shared';

import youtubeSongResponseMock from '../../fixtures/youtube/youtubeSongResponseMock.json';
import deezerSongResponseMock from '../../fixtures/deezer/deezerSongResponseMock.json';

const spotifySongHeadResponseMock = await Bun.file(
  'tests/fixtures/spotify/spotifySongHeadResponseMock.html'
).text();

describe('Adapter - Apple Music', () => {
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

  it('should return 200 when adapter returns error', async () => {
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
    const query = 'Do%20Not%20Disturb%20Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYoutubeSearchLink(query, 'video');
    const deezerSearchLink = getDeezerSearchLink(query, 'track');

    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(500);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);

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
          type: 'youTube',
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

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
  });
});
