import { beforeEach, beforeAll, describe, expect, it, mock, jest } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';
import { getLinkWithPuppeteer } from '~/utils/scraper';
import { cacheStore } from '~/services/cache';

import { JSONRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
} from '../../utils/shared';

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

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('GET /search - Album', () => {
  let mock: AxiosMockAdapter;
  const getLinkWithPuppeteerMock = getLinkWithPuppeteer as jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    getLinkWithPuppeteerMock.mockClear();
    mock.reset();
    cacheStore.reset();
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
    const query = 'For All The Dogs Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'album');
    const deezerSearchLink = getDeezerSearchLink(query, 'album');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyAlbumHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicAlbumResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerAlbumResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudAlbumResponseMock);

    const mockedYoutubeLink =
      'https://music.youtube.com/watch?v=k20wnICXpps&list=OLAK5uy_lRly1oG8OVTI3C2gZv0pPjYxH-Q3U6GrM';
    getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '4czdORdCWP9umpbhFXK2fW',
      type: 'album',
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
          url: mockedYoutubeLink,
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

    expect(mock.history.get).toHaveLength(4);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      expect.stringContaining(youtubeSearchLink),
      'ytmusic-card-shelf-renderer a',
      expect.any(Array)
    );
  });
});
