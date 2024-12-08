import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerSongResponseMock from '../fixtures/deezer/songResponseMock.json';
import tidalSongResponseMock from '../fixtures/tidal/songResponseMock.json';
import youtubeSongResponseMock from '../fixtures/youtube/songResponseMock.json';
import { jsonRequest } from '../utils/request';
import {
  API_ENDPOINT,
  API_SEARCH_ENDPOINT,
  cachedSpotifyLink,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getTidalSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../utils/shared';

const [
  spotifySongHeadResponseMock,
  appleMusicSongResponseMock,
  soundCloudSongResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/songHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/songResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/songResponseMock.html').text(),
]);

describe('Api router', () => {
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
    cacheStore.reset();
    mock.reset();

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  afterEach(() => {
    mock.reset();
  });

  describe('GET /search', () => {
    it('should return 200 when adapter returns error - Apple Music', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);

      mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
      mock.onGet(appleMusicSearchLink).reply(500);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

      const response = await app.handle(request);
      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/144572248',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
            isVerified: true,
          },
          {
            type: 'tidal',
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          },
          {
            type: 'youTube',
            url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
            isVerified: true,
          },
        ],
      });

      expect(mock.history.get).toHaveLength(7);
    });

    it('should return 200 when adapter returns error - Youtube', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);

      mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(500);

      const response = await app.handle(request);
      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/144572248',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
            isVerified: true,
          },
          {
            type: 'tidal',
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          },
        ],
      });

      expect(mock.history.get).toHaveLength(7);
    });

    it('should return 200 when adapter returns error - Deezer', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);

      mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(500);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

      const response = await app.handle(request);
      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
            isVerified: true,
          },
          {
            type: 'tidal',
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          },
          {
            type: 'youTube',
            url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
            isVerified: true,
          },
        ],
      });

      expect(mock.history.get).toHaveLength(7);
    });

    it('should return 200 when adapter returns error - SoundCloud', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);

      mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(500);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

      const response = await app.handle(request);
      const data = await response.json();

      expect(data).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        universalLink: urlShortenerResponseMock.data.refer,
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/track/144572248',
            isVerified: true,
          },
          {
            type: 'tidal',
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          },
          {
            type: 'youTube',
            url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
            isVerified: true,
          },
        ],
      });

      expect(mock.history.get).toHaveLength(7);
    });

    it('should return unknown error - could not parse Spotify metadata', async () => {
      const request = jsonRequest(API_SEARCH_ENDPOINT, {
        link: cachedSpotifyLink,
      });

      mock.onGet(cachedSpotifyLink).reply(200, '<html></html>');

      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          '[getSpotifyMetadata] (https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384) Error: Spotify metadata not found',
      });
    });

    it('should return bad request - invalid link', async () => {
      const link = 'https://open.spotify.com/invalid';

      const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - invalid searchId', async () => {
      const searchId = 123;

      const request = jsonRequest(API_SEARCH_ENDPOINT, { searchId });
      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - unknown body param', async () => {
      const request = jsonRequest(API_SEARCH_ENDPOINT, { foo: 'bar' });

      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - unsupported API version', async () => {
      const request = jsonRequest(`${API_ENDPOINT}/search?v=2`, {
        link: cachedSpotifyLink,
      });

      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });

    it('should return bad request - missing API version query param', async () => {
      const request = jsonRequest(`${API_ENDPOINT}/search`, {
        link: cachedSpotifyLink,
      });

      const response = await app.handle(request);

      expect(response.text()).resolves.toThrow({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });
  });
});
