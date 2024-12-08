import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, jest, mock } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import { getUniversalMetadataFromTidal } from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerSongResponseMock from '../../fixtures/deezer/songResponseMock.json';
import tidalSongResponseMock from '../../fixtures/tidal/songResponseMock.json';
import youtubeSongResponseMock from '../../fixtures/youtube/songResponseMock.json';
import { JSONRequest } from '../../utils/request';
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

mock.module('~/parsers/tidal-universal-link', () => ({
  getUniversalMetadataFromTidal: jest.fn(),
}));

describe('GET /search - Song', () => {
  let mock: AxiosMockAdapter;
  const getUniversalMetadataFromTidalMock = getUniversalMetadataFromTidal as jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    getUniversalMetadataFromTidalMock.mockReset();
    mock.reset();
    cacheStore.reset();

    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    getUniversalMetadataFromTidalMock.mockResolvedValue(undefined);
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';
    const query = 'Do Not Disturb Drake';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifySongHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0',
      type: 'song',
      title: 'Do Not Disturb',
      description: 'Drake · Song · 2017',
      image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
      audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
      source: link,
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
        {
          type: 'youTube',
          url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(6);
    expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(1);
  });

  it('should return 200 - Mobile link', async () => {
    const mobileSpotifyLink = 'https://spotify.link/mOQKfqJZ1Db';
    const desktopSpotifyLink = 'https://open.spotify.com/track/3eP13S8D5m2cweMEg3ZDed';
    const query = 'Do Not Disturb Drake';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link: mobileSpotifyLink });

    mock.onGet(mobileSpotifyLink).reply(200, spotifyMobileHeadResponseMock);
    mock.onGet(desktopSpotifyLink).reply(200, spotifySongHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'c3BvdGlmeS5saW5rL21PUUtmcUpaMURi',
      type: 'song',
      title: 'Do Not Disturb',
      description: 'Drake · Song · 2017',
      image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
      audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
      source: mobileSpotifyLink,
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
        {
          type: 'youTube',
          url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
          isVerified: true,
        },
      ],
    });

    // extra call due to parsing mobile link to desktop
    expect(mock.history.get).toHaveLength(7);
    expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(1);
  });

  it('should return 200 - Extra query params', async () => {
    const link =
      'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384?si=NbEEVPZvTVuov_nA3ylJJQ&utm_source=copy-link&utm_medium=copy-link&context=spotify%3Aalbum%3A4czdORdCWP9umpbhFXK2aW&_branch_match_id=1238568162599463760&_branch_referrer=H2sIAAAAAAAAA8soKSkottLXLy7IL8lMq9TLyczL1q%2Fy8nHxLLXwM3RJAgDKC3LnIAAAAA%3D%3D';
    const query = 'Do Not Disturb Drake';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Song);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Song);
    const deezerSearchLink = getDeezerSearchLink(query, 'track');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifySongHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalSongResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicSongResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerSongResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudSongResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeSongResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0P3NpPU5iRUVWUFp2VFZ1b3ZfbkEzeWxKSlE%3D',
      type: 'song',
      title: 'Do Not Disturb',
      description: 'Drake · Song · 2017',
      image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
      audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
      source: link,
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
        {
          type: 'youTube',
          url: 'https://music.youtube.com/watch?v=vVd4T5NxLgI',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(6);
    expect(getUniversalMetadataFromTidalMock).toHaveBeenCalledTimes(1);
  });
});
