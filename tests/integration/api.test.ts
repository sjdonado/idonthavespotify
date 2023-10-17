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

import youtubeSongResponseMock from '../fixtures/song/youtubeResponseMock.json';
import youtubeAlbumResponseMock from '../fixtures/album/youtubeResponseMock.json';
import youtubePlaylistResponseMock from '../fixtures/playlist/youtubeResponseMock.json';
import youtubeArtistResponseMock from '../fixtures/artist/youtubeResponseMock.json';

import deezerSongResponseMock from '../fixtures/song/deezerResponseMock.json';
import deezerAlbumResponseMock from '../fixtures/album/deezerResponseMock.json';
import deezerPlaylistResponseMock from '../fixtures/playlist/deezerResponseMock.json';
import deezerArtistResponseMock from '../fixtures/artist/deezerResponseMock.json';

import { app } from '~/index';

const API_ENDPOINT = 'http://localhost/api';

const [
  spotifySongHeadResponseMock,
  spotifyAlbumHeadResponseMock,
  spotifyPlaylistHeadResponseMock,
  spotifyArtistHeadResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/song/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/album/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/playlist/spotifyHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/artist/spotifyHeadResponseMock.html').text(),
]);

const [
  appleMusicSongResponseMock,
  appleMusicAlbumResponseMock,
  appleMusicPlaylistResponseMock,
  appleMusicArtistResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/song/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/album/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/playlist/appleMusicResponseMock.html').text(),
  Bun.file('tests/fixtures/artist/appleMusicResponseMock.html').text(),
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
  });

  afterAll(() => {
    mock.restore();
  });

  describe('GET /search', () => {
    const endpoint = `${API_ENDPOINT}/search`;

    it('should return 200 - Song', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do%20Not%20Disturb%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}&type=video&key=${config.services.youtube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerSongResponseMock);

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
        source: spotifyLink,
        links: [
          {
            type: 'appleMusic',
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          },
          {
            type: 'youtube',
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
            url: 'https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Album', async () => {
      const spotifyLink = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
      const query = 'For%20All%20The%20Dogs%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}&type=playlist&key=${config.services.youtube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/album?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyAlbumHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicAlbumResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeAlbumResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerAlbumResponseMock);

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
            type: 'youtube',
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
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=For%20All%20The%20Dogs%20Drake',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Playlist', async () => {
      const spotifyLink = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
      const query = 'This%20Is%20Bad%20Bunny%20Playlist';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}&type=playlist&key=${config.services.youtube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/playlist?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyPlaylistHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicPlaylistResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubePlaylistResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerPlaylistResponseMock);

      redisGetMock.mockResolvedValue(0);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        id: '37i9dQZF1DX2apWzyECwyZ',
        type: 'music.playlist',
        title: 'This Is Bad Bunny',
        description: 'This Is Bad Bunny · Playlist · 109 songs · 5.2M likes',
        image: 'https://i.scdn.co/image/ab67706f000000029c0eb2fdff534f803ea018e1',
        source: 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ',
        links: [
          {
            type: 'youtube',
            url: 'https://www.youtube.com/playlist?list=PLIqoag_AY7ykvJKLrUzfvX7pXS-YMIDfR',
            isVerified: true,
          },
          {
            type: 'deezer',
            url: 'https://www.deezer.com/playlist/3370896142',
            isVerified: true,
          },
          {
            type: 'soundCloud',
            url: 'https://soundcloud.com/search/sounds?q=This%20Is%20Bad%20Bunny%20Playlist',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=This%20Is%20Bad%20Bunny%20Playlist',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 - Artist', async () => {
      const spotifyLink = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';
      const query = 'J.%20Cole';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}%20official&type=channel&key=${config.services.youtube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/artist?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifyArtistHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicArtistResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeArtistResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerArtistResponseMock);

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
            type: 'youtube',
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
            url: 'https://soundcloud.com/search/sounds?q=J.%20Cole',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=J.%20Cole',
          },
        ],
      });

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(2);
    });

    it('should return 200 from cache', async () => {
      const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
      const query = 'Do%20Not%20Disturb%20Drake';

      const appleMusicQuery = `${config.services.appleMusic.baseUrl}${query}`;
      const youtubeQuery = `${config.services.youtube.apiSearchUrl}${query}&type=video&key=${config.services.youtube.apiKey}`;
      const deezerQuery = `${config.services.deezer.apiUrl}/track?q=${query}&limit=1`;

      const request = new Request(`${endpoint}?spotifyLink=${spotifyLink}`);

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);
      mock.onGet(appleMusicQuery).reply(200, appleMusicSongResponseMock);
      mock.onGet(youtubeQuery).reply(200, youtubeSongResponseMock);
      mock.onGet(deezerQuery).reply(200, deezerSongResponseMock);

      const cachedResponse = {
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
            type: 'youtube',
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
            url: 'https://soundcloud.com/search/sounds?q=Do%20Not%20Disturb%20Drake',
          },
          {
            type: 'tidal',
            url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
          },
        ],
      };

      redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
      redisGetMock.mockResolvedValue(1);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual(cachedResponse);
      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
    });

    it('should return bad request', async () => {
      const request = new Request(`${endpoint}?foo=bar`);
      const response = await app.handle(request).then(res => res.json());

      expect(response).toEqual({
        code: 'UNKNOWN',
        message:
          'ValueCreate.String: String types with patterns must specify a default value',
      });
    });
  });
});
