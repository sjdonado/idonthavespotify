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

import * as config from '~/config/default';

import { app } from '~/index';

import { JSONRequest } from '../../utils/request';
import {
  SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getTidalSearchLink,
  getYoutubeSearchLink,
} from '../../utils/shared';

import youtubeAlbumResponseMock from '../../fixtures/album/youtubeResponseMock.json';
import deezerAlbumResponseMock from '../../fixtures/album/deezerResponseMock.json';
import tidalAuthResponseMock from '../../fixtures/auth/tidalResponseMock.json';

const [spotifyAlbumHeadResponseMock, appleMusicAlbumResponseMock] = await Promise.all([
  Bun.file('tests/fixtures/album/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/album/appleMusicResponseMock.html').text(),
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
  });

  afterAll(() => {
    mock.restore();
  });

  it('should return 200', async () => {
    const spotifyLink = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
    const query = 'For%20All%20The%20Dogs%20Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYoutubeSearchLink(query, 'playlist');
    const deezerSearchLink = getDeezerSearchLink(query, 'album');
    const tidalSearchLink = getTidalSearchLink(query, 'ALBUMS');

    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyAlbumHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicAlbumResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeAlbumResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerAlbumResponseMock);

    mock.onPost(config.services.tidal.authUrl).reply(200, tidalAuthResponseMock);
    mock.onGet(tidalSearchLink).reply(200, {});

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
          url: 'https://soundcloud.com/search/sounds?q=For%20All%20The%20Dogs%20Drake',
        },
      ],
    });

    expect(redisGetMock).toHaveBeenCalledTimes(3);
    expect(redisSetMock).toHaveBeenCalledTimes(3);
  });
});
