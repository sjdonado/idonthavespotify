import { beforeAll, afterEach, describe, expect, it, mock, jest } from 'bun:test';

import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';

import { app } from '~/index';
import { getLinkWithPuppeteer } from '~/utils/scraper';

import { JSONRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getSoundCloudSearchLink,
  getYouTubeSearchLink,
} from '../../utils/shared';

import deezerPlaylistResponseMock from '../../fixtures/deezer/playlistResponseMock.json';

const [
  spotifyPlaylistHeadResponseMock,
  appleMusicPlaylistResponseMock,
  soundCloudPlaylistResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/playlistHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/playlistResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/playlistResponseMock.html').text(),
]);

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('GET /search - Playlist', () => {
  let mock: AxiosMockAdapter;
  const getLinkWithPuppeteerMock = getLinkWithPuppeteer as jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    getLinkWithPuppeteerMock.mockClear();
    mock.reset();
  });

  it('should return 200', async () => {
    const spotifyLink = 'https://open.spotify.com/playlist/37i9dQZF1DX2apWzyECwyZ';
    const query = 'This Is Bad Bunny Playlist';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, '');
    const deezerSearchLink = getDeezerSearchLink(query, 'playlist');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyPlaylistHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicPlaylistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerPlaylistResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudPlaylistResponseMock);

    const mockedYoutubeLink =
      'https://music.youtube.com/playlist?list=RDCLAK5uy_k3jElZuYeDhqZsFkUnRf519q4CD52CaRY';
    getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

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
          type: 'youTube',
          url: mockedYoutubeLink,
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/playlist/3370896142',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/rafael-moreno-180913328/sets/this-is-bad-bunny',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=This+Is+Bad+Bunny+Playlist',
        },
      ],
    });

    expect(mock.history.get).toHaveLength(4);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
      expect.stringContaining(youtubeSearchLink),
      'ytmusic-card-shelf-renderer a',
      expect.any(Array)
    );
  });
});
