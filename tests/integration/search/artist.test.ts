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

import youtubeArtistResponseMock from '../../fixtures/youtube/youtubeArtistResponseMock.json';
import deezerArtistResponseMock from '../../fixtures/deezer/deezerArtistResponseMock.json';

const [spotifyArtistHeadResponseMock, appleMusicArtistResponseMock] = await Promise.all([
  Bun.file('tests/fixtures/spotify/spotifyArtistHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/appleMusicArtistResponseMock.html').text(),
]);

describe('GET /search - Artist', () => {
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
    const spotifyLink = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';
    const query = 'J. Cole';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYoutubeSearchLink(`${query} official`, 'channel');
    const deezerSearchLink = getDeezerSearchLink(query, 'artist');

    const request = JSONRequest(SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyArtistHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicArtistResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeArtistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerArtistResponseMock);

    redisGetMock.mockResolvedValue(0);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '6l3HvQ5sa6mXTsMTB19rO5',
      type: 'profile',
      title: 'J. Cole',
      description: 'Artist · 45.1M monthly listeners.',
      image: 'https://i.scdn.co/image/ab6761610000e5ebadd503b411a712e277895c8a',
      source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
      links: [
        {
          type: 'appleMusic',
          url: 'https://music.apple.com/us/artist/j-cole/73705833',
          isVerified: true,
        },
        {
          type: 'youTube',
          url: 'https://www.youtube.com/channel/UCnc6db-y3IU7CkT_yeVXdVg',
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/artist/339209',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/search/sounds?q=J.+Cole',
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=J.+Cole',
        },
      ],
    });

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
  });
});
