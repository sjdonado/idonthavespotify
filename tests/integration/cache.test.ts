import { beforeAll, describe, expect, it, mock, jest, afterAll } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';
import { getLinkWithPuppeteer } from '~/utils/scraper';

import { JSONRequest } from '../utils/request';
import {
  API_SEARCH_ENDPOINT,
  cachedSpotifyLink,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
} from '../utils/shared';

import { cacheStore } from '~/services/cache';

import deezerSongResponseMock from '../fixtures/deezer/songResponseMock.json';

const [
  spotifySongHeadResponseMock,
  appleMusicSongResponseMock,
  soundCloudSongResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/songHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/spotify/mobileHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/songResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/songResponseMock.html').text(),
]);

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('Searches cache', () => {
  let mock: AxiosMockAdapter;
  const getLinkWithPuppeteerMock = getLinkWithPuppeteer as jest.Mock;

  beforeAll(async () => {
    cacheStore.reset();

    mock = new AxiosMockAdapter(axios);

    const query = 'Do Not Disturb Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link: cachedSpotifyLink });

    mock.onGet(cachedSpotifyLink).reply(200, spotifySongHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

    getLinkWithPuppeteerMock.mockResolvedValueOnce(
      'https://music.youtube.com/watch?v=zhY_0DoQCQs'
    );

    // fill cache
    await app.handle(request).then(res => res.json());

    expect(mock.history.get).toHaveLength(4);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
  });

  afterAll(() => {
    mock.reset();
  });

  it('should return 200 from cache', async () => {
    const request = JSONRequest(API_SEARCH_ENDPOINT, { link: cachedSpotifyLink });
    const response = await app.handle(request).then(res => res.json());

    expect(response.source).toEqual(cachedSpotifyLink);
    expect(response.links).toBeArray();
  });
});
