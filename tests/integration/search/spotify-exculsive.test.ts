import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerExclusiveContentResponseMock from '../../fixtures/deezer/emptyResponseMock.json';
import youtubeEmptyResponseMock from '../../fixtures/youtube/emptyResponseMock.json';
import { jsonRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

const [
  spotifyExclusiveContentHeadResponseMock,
  appleMusicExclusiveContentResponseMock,
  soundCloudExclusiveContentResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/exclusiveContentHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/emptyResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/emptyResponseMock.html').text(),
]);

describe('GET /search - Spotify Exclusive Content', () => {
  let mock: AxiosMockAdapter;
  const getUniversalMetadataFromTidalMock = spyOn(
    tidalUniversalLinkParser,
    'getUniversalMetadataFromTidal'
  );

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    getUniversalMetadataFromTidalMock.mockReset();
    mock.reset();
    cacheStore.reset();

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
    mock.onPost(ENV.adapters.spotify.authUrl).reply(200, {});
    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj';
    const query = 'The Louis Theroux Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Podcast);
    const deezerSearchLink = getDeezerSearchLink(query, 'podcast');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyExclusiveContentHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicExclusiveContentResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeEmptyResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerExclusiveContentResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudExclusiveContentResponseMock);
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    const response = await app.handle(request);
    const data = await response.json();

    expect(data).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9zaG93LzdMdVF2NDAwSkZ6emxKck91TXVrUmo%3D',
      type: 'show',
      title: 'The Louis Theroux Podcast',
      description:
        'Listen to The Louis Theroux Podcast on Spotify. Join Louis Theroux as he embarks on a series of in-depth and freewheeling conversations with a curated collection of fascinating figures from across the globe. The Louis Theroux Podcast is a Spotify Exclusive podcast from Mindhouse.',
      image: 'https://i.scdn.co/image/ab6765630000ba8a9f6908102653db4d1d168c59',
      source: 'https://open.spotify.com/show/7LuQv400JFzzlJrOuMukRj',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [],
    });

    expect(mock.history.get).toHaveLength(2);
  });
});
