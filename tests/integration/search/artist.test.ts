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

import deezerArtistResponseMock from '../../fixtures/deezer/artistResponseMock.json';

const [
  spotifyArtistHeadResponseMock,
  appleMusicArtistResponseMock,
  soundCloudArtistResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/artistHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/artistResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/artistResponseMock.html').text(),
]);

mock.module('~/utils/scraper', () => ({
  getLinkWithPuppeteer: jest.fn(),
}));

describe('GET /search - Artist', () => {
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
    const spotifyLink = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';
    const query = 'J. Cole';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'channel');
    const deezerSearchLink = getDeezerSearchLink(query, 'artist');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyArtistHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicArtistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerArtistResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudArtistResponseMock);

    const mockedYoutubeLink =
      'https://music.youtube.com/channel/UC0ajkOzj8xE3Gs3LHCE243A';
    getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

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
          type: 'youTube',
          url: mockedYoutubeLink,
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/artist/339209',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/j-cole',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=J.+Cole',
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
