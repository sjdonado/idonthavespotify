import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  jest,
  afterEach,
} from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';
import { getLinkWithPuppeteer } from '~/utils/scraper';
import { cacheStore } from '~/services/cache';

import { JSONRequest } from '../utils/request';
import {
  API_ENDPOINT,
  API_SEARCH_ENDPOINT,
  cachedSpotifyLink,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
} from '../utils/shared';

import deezerSongResponseMock from '../fixtures/deezer/songResponseMock.json';

const [
  spotifySongHeadResponseMock,
  appleMusicSongResponseMock,
  soundCloudSongResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/songHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/songResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/songResponseMock.html').text(),
]);

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('Api router', () => {
  let mock: AxiosMockAdapter;
  const getLinkWithPuppeteerMock = getLinkWithPuppeteer as jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    cacheStore.reset();
    mock.reset();
  });

  afterEach(() => {
    mock.reset();
  });

  describe('GET /search', () => {
    it('should return 200 when adapter returns error - Apple Music', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'song');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(500);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      const mockedYoutubeLink = 'https://music.youtube.com/watch?v=zhY_0DoQCQs';
      getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        links: [
          {
            type: 'youTube',
            url: mockedYoutubeLink,
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
            url: 'https://listen.tidal.com/search?q=Do+Not+Disturb+Drake',
          },
        ],
      });

      expect(mock.history.get).toHaveLength(4);
      expect(getLinkWithPuppeteerMock).toHaveBeenCalled();
      // expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      //   expect.stringContaining(youtubeSearchLink),
      //   'ytmusic-card-shelf-renderer a',
      //   expect.any(Array)
      // );
    });

    it('should return 200 when adapter returns error - Youtube', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      // const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      getLinkWithPuppeteerMock.mockImplementationOnce(() => {
        throw new Error('Injected Error');
      });

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
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
            url: 'https://listen.tidal.com/search?q=Do+Not+Disturb+Drake',
          },
        ],
      });

      expect(mock.history.get).toHaveLength(4);
      expect(getLinkWithPuppeteerMock).toHaveBeenCalled();
      // expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      //   expect.stringContaining(youtubeSearchLink),
      //   'ytmusic-card-shelf-renderer a',
      //   expect.any(Array)
      // );
    });

    it('should return 200 when adapter returns error - Deezer', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(500);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      const mockedYoutubeLink = 'https://music.youtube.com/watch?v=zhY_0DoQCQs';
      getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        links: [
          {
            type: 'youTube',
            url: mockedYoutubeLink,
            isVerified: true,
          },
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
            url: 'https://listen.tidal.com/search?q=Do+Not+Disturb+Drake',
          },
        ],
      });

      expect(mock.history.get).toHaveLength(4);
      expect(getLinkWithPuppeteerMock).toHaveBeenCalled();
      // expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      //   expect.stringContaining(youtubeSearchLink),
      //   'ytmusic-card-shelf-renderer a',
      //   expect.any(Array)
      // );
    });

    it('should return 200 when adapter returns error - SoundCloud', async () => {
      const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

      mock.onGet(link).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(500);

      const mockedYoutubeLink = 'https://music.youtube.com/watch?v=zhY_0DoQCQs';
      getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
        type: 'song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        links: [
          {
            type: 'youTube',
            url: mockedYoutubeLink,
            isVerified: true,
          },
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
            url: 'https://listen.tidal.com/search?q=Do+Not+Disturb+Drake',
          },
        ],
      });

      expect(mock.history.get).toHaveLength(4);
      expect(getLinkWithPuppeteerMock).toHaveBeenCalled();
      // expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      //   expect.stringContaining(youtubeSearchLink),
      //   'ytmusic-card-shelf-renderer a',
      //   expect.any(Array)
      // );
    });

    it('should return unknown error - could not parse Spotify metadata', async () => {
      const request = JSONRequest(API_SEARCH_ENDPOINT, {
        link: cachedSpotifyLink,
      });

      mock.onGet(cachedSpotifyLink).reply(200, '<html></html>');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message:
          '[getSpotifyMetadata] (https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384) Error: Spotify metadata not found',
      });
    });

    it('should return bad request - invalid link', async () => {
      const link = 'https://open.spotify.com/invalid';

      const request = JSONRequest(API_SEARCH_ENDPOINT, { link });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - invalid searchId', async () => {
      const searchId = 123;

      const request = JSONRequest(API_SEARCH_ENDPOINT, { searchId });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - unknown body param', async () => {
      const request = JSONRequest(API_SEARCH_ENDPOINT, { foo: 'bar' });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid link, please try with Spotify or Youtube links.',
      });
    });

    it('should return bad request - unsupported API version', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search?v=2`, {
        link: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });

    it('should return bad request - missing API version query param', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search`, {
        link: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });
  });
});
