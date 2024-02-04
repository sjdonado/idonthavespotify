import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';

import { JSONRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
} from '../../utils/shared';

import youtubeSongResponseMock from '../../fixtures/youtube/songResponseMock.json';
import deezerSongResponseMock from '../../fixtures/deezer/songResponseMock.json';

const [
  spotifySongHeadResponseMock,
  spotifyMobileHeadResponseMock,
  appleMusicSongResponseMock,
  soundCloudSongResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/songHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/spotify/mobileHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/songResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/songResponseMock.html').text(),
]);

describe('GET /search - Song', () => {
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

  it('should return 200', async () => {
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
      source: spotifyLink,
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

  it('should return 200 - Mobile link', async () => {
    const mobileSpotifyLink = 'https://spotify.link/mOQKfqJZ1Db';
    const desktopSpotifyLink = 'https://open.spotify.com/track/3eP13S8D5m2cweMEg3ZDed';
    const query = 'Do Not Disturb Drake';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'video');
    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink: mobileSpotifyLink });

    mock.onGet(mobileSpotifyLink).reply(200, spotifyMobileHeadResponseMock);
    mock.onGet(desktopSpotifyLink).reply(200, spotifySongHeadResponseMock);

    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);

    redisGetMock.mockResolvedValue(0);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'mOQKfqJZ1Db',
      type: 'music.song',
      title: 'Do Not Disturb',
      description: 'Drake · Song · 2017',
      image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
      audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
      source: desktopSpotifyLink,
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
    // extra call due to parsing mobile link to desktop
    expect(mock.history.get).toHaveLength(6);
  });

  it('should return 200 - Extra query params', async () => {
    const spotifyLink =
      'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D';
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
      source: spotifyLink,
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
});
