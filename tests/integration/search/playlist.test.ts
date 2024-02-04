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

import youtubePlaylistResponseMock from '../../fixtures/youtube/youtubePlaylistResponseMock.json';
import deezerPlaylistResponseMock from '../../fixtures/deezer/deezerPlaylistResponseMock.json';

const [spotifyPlaylistHeadResponseMock, appleMusicPlaylistResponseMock] =
  await Promise.all([
    Bun.file('tests/fixtures/spotify/spotifyPlaylistHeadResponseMock.html').text(),
    Bun.file('tests/fixtures/apple-music/appleMusicPlaylistResponseMock.html').text(),
  ]);

describe('GET /search - Playlist', () => {
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

  it('should return 200', async () => {
    const spotifyLink = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
    const query = 'This%20Is%20Bad%20Bunny%20Playlist';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYoutubeSearchLink(query, 'playlist');
    const deezerSearchLink = getDeezerSearchLink(query, 'playlist');

    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyPlaylistHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicPlaylistResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubePlaylistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerPlaylistResponseMock);

    redisGetMock.mockResolvedValue(0);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '37i9dQZF1DX2apWzyECwyZ',
      type: 'music.playlist',
      title: 'This Is Bad Bunny',
      description: 'This Is Bad Bunny · Playlist · 109 songs · 5.2M likes',
      image: 'https://i.scdn.co/image/ab67706f000000029c0eb2fdff534f803ea018e1',
      source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
      links: [
        {
          type: 'youTube',
          url: 'https://www.youtube.com/playlist?list=PLIqoag_AY7ykvJKLrUzfvX7pXS-YMIDfR',
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/playlist/3370896142',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/search/sounds?q=This%20Is%20Bad%20Bunny%20Playlist',
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=This%20Is%20Bad%20Bunny%20Playlist',
        },
      ],
    });

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
  });
});
