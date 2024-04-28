import { beforeAll, beforeEach, describe, expect, it, mock, jest } from 'bun:test';

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

import deezerExclusiveContentResponseMock from '../../fixtures/deezer/emptyResponseMock.json';

const [
  spotifyExclusiveContentHeadResponseMock,
  appleMusicExclusiveContentResponseMock,
  soundCloudExclusiveContentResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/exclusiveContentHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/emptyResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/emptyResponseMock.html').text(),
]);

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('GET /search - Spotify Exclusive Content', () => {
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
    const spotifyLink = 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj';
    const query = 'The Louis Theroux Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, '');
    const deezerSearchLink = getDeezerSearchLink(query, 'podcast');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyExclusiveContentHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicExclusiveContentResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerExclusiveContentResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudExclusiveContentResponseMock);

    getLinkWithPuppeteerMock.mockResolvedValueOnce(undefined);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '7LuQv400JFzzlJrOuMukRj',
      type: 'website',
      title: 'The Louis Theroux Podcast',
      description:
        'Listen to The Louis Theroux Podcast on Spotify. Join Louis Theroux as he embarks on a series of in-depth and freewheeling conversations with a curated collection of fascinating figures from across the globe. The Louis Theroux Podcast is a Spotify Exclusive podcast from Mindhouse.',
      image: 'https://i.scdn.co/image/ab6765630000ba8a9f6908102653db4d1d168c59',
      source: 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj',
      links: [],
    });

    expect(mock.history.get).toHaveLength(2);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      expect.stringContaining(youtubeSearchLink),
      'ytmusic-card-shelf-renderer a',
      expect.any(Array)
    );
  });
});
