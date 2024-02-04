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

import youtubeAlbumResponseMock from '../../fixtures/youtube/albumResponseMock.json';
import deezerAlbumResponseMock from '../../fixtures/deezer/albumResponseMock.json';

const [
  spotifyAlbumHeadResponseMock,
  appleMusicAlbumResponseMock,
  soundCloudAlbumResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/albumHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/albumResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/albumResponseMock.html').text(),
]);

describe('GET /search - Album', () => {
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
    const spotifyLink = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
    const query = 'For All The Dogs Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'playlist');
    const deezerSearchLink = getDeezerSearchLink(query, 'album');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyAlbumHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicAlbumResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeAlbumResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerAlbumResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudAlbumResponseMock);

    redisGetMock.mockResolvedValue(0);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '4czdORdCWP9umpbhFXK2fW',
      type: 'music.album',
      title: 'For All The Dogs',
      description: 'Drake · Album · 2023 · 23 songs.',
      image: 'https://i.scdn.co/image/ab67616d0000b2730062621987df634efede0e6c',
      source: 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW',
      links: [
        {
          type: 'appleMusic',
          url: 'https://music.apple.com/us/album/for-all-the-dogs/1710685602',
          isVerified: true,
        },
        {
          type: 'youTube',
          url: 'https://www.youtube.com/playlist?list=PLF4zOU-_1sldqZIv8UEvE2ChFHLkkneT1',
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/album/496789121',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/octobersveryown/sets/for-all-the-dogs-3',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=For+All+The+Dogs+Drake',
        },
      ],
    });

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
    expect(mock.history.get).toHaveLength(5);
  });
});
