import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';

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

import youtubeSongResponseMock from '../fixtures/youtube/songResponseMock.json';
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

describe('Api router', () => {
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

  describe('GET /search', () => {
    it('should return 200 when adapter returns error - Apple Music', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(500);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
        source: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        links: [
          {
            type: 'youTube',
            url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
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

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
      expect(mock.history.get).toHaveLength(5);
    });

    it('should return 200 when adapter returns error - Youtube', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(400, {
        error: {
          errors: [
            {
              domain: 'youtube.parameter',
              reason: 'invalidValue',
              message: "Invalid value for parameter 'videoId'",
            },
          ],
          code: 400,
          message: "Invalid value for parameter 'videoId'",
        },
      });
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
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

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
      expect(mock.history.get).toHaveLength(5);
    });

    it('should return 200 when adapter returns error - Deezer', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerSearchLink).reply(500);
      mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
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
            type: 'youTube',
            url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
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

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
      expect(mock.history.get).toHaveLength(5);
    });

    it('should return 200 when adapter returns error - SoundCloud', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do Not Disturb Drake';

      const appleMusicSearchLink = getAppleMusicSearchLink(query);
      const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
      const deezerSearchLink = getDeezerSearchLink(query, 'track');
      const soundCloudSearchLink = getSoundCloudSearchLink(query);

      const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
      mock.onGet(soundCloudSearchLink).reply(500);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '2KvHC9z14GSl4YpkNMX384',
        type: 'music.song',
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
            type: 'youTube',
            url: 'https://www.youtube.com/watch?v=zhY_0DoQCQs',
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

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
      expect(mock.history.get).toHaveLength(5);
    });

    it('should return unknown error - could not parse Spotify metadata', async () => {
      const request = JSONRequest(API_SEARCH_ENDPOINT, {
        spotifyLink: cachedSpotifyLink,
      });

      mock.onGet(cachedSpotifyLink).reply(200, '<html></html>');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message:
          '[parseSpotifyMetadata] (https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384) Error: Spotify metadata not found',
      });
    });

    it('should return bad request - invalid spotifyLink', async () => {
      const spotifyLink = 'https://open.spotify.com/invalid';

      const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });

    it('should return bad request - unknown body param', async () => {
      const request = JSONRequest(API_SEARCH_ENDPOINT, { foo: 'bar' });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Invalid spotify link',
      });
    });

    it('should return bad request - unsupported API version', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search?v=2`, {
        spotifyLink: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });

    it('should return bad request - missing API version query param', async () => {
      const request = JSONRequest(`${API_ENDPOINT}/search`, {
        spotifyLink: cachedSpotifyLink,
      });
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'VALIDATION',
        message: 'Unsupported API version',
      });
    });
  });
});
