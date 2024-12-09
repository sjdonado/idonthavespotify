import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerPlaylistResponseMock from '../../fixtures/deezer/playlistResponseMock.json';
import tidalEmptyResponseMock from '../../fixtures/tidal/emptyResponseMock.json';
import youtubePlaylistResponseMock from '../../fixtures/youtube/playlistResponseMock.json';
import { jsonRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getTidalSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

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
    const link = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
    const query = 'This Is Bad Bunny Playlist';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Playlist);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Playlist);
    const deezerSearchLink = getDeezerSearchLink(query, 'playlist');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyPlaylistHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalEmptyResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicPlaylistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerPlaylistResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudPlaylistResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubePlaylistResponseMock);

    const response = await app.handle(request);
    const data = await response.json();

    expect(data).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9wbGF5bGlzdC8zN2k5ZFFaRjFEWDJhcFd6eUVDd3la',
      type: 'playlist',
      title: 'This Is Bad Bunny',
      description: 'This Is Bad Bunny · Playlist · 109 songs · 5.2M likes',
      image: 'https://i.scdn.co/image/ab67706f000000029c0eb2fdff534f803ea018e1',
      source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [],
    });

    expect(mock.history.get).toHaveLength(6);
  });
});
