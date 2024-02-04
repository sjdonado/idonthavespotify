import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';

import { JSONRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
} from '../../utils/shared';

import youtubePlaylistResponseMock from '../../fixtures/youtube/playlistResponseMock.json';
import deezerPlaylistResponseMock from '../../fixtures/deezer/playlistResponseMock.json';

const [
  spotifyPlaylistHeadResponseMock,
  appleMusicPlaylistResponseMock,
  soundCloudPlaylistResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/playlistHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/playlistResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/playlistResponseMock.html').text(),
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
    mock.reset();
  });

  it('should return 200', async () => {
    const spotifyLink = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
    const query = 'This Is Bad Bunny Playlist';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'playlist');
    const deezerSearchLink = getDeezerSearchLink(query, 'playlist');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyPlaylistHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicPlaylistResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubePlaylistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerPlaylistResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudPlaylistResponseMock);

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
          url: 'https://soundcloud.com/rafael-moreno-180913328/sets/this-is-bad-bunny',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=This+Is+Bad+Bunny+Playlist',
        },
      ],
    });

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
    expect(mock.history.get).toHaveLength(5);
  });
});
