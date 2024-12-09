import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, jest, mock, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerArtistResponseMock from '../../fixtures/deezer/artistResponseMock.json';
import tidalArtistResponseMock from '../../fixtures/tidal/artistResponseMock.json';
import youtubeArtistResponseMock from '../../fixtures/youtube/artistResponseMock.json';
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
  spotifyArtistHeadResponseMock,
  appleMusicArtistResponseMock,
  soundCloudArtistResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/artistHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/artistResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/artistResponseMock.html').text(),
]);

describe('GET /search - Artist', () => {
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
    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5';
    const query = 'J. Cole';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Artist);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Artist);
    const deezerSearchLink = getDeezerSearchLink(query, 'artist');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyArtistHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalArtistResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicArtistResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeArtistResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerArtistResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudArtistResponseMock);
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9hcnRpc3QvNmwzSHZRNXNhNm1YVHNNVEIxOXJPNQ%3D%3D',
      type: 'artist',
      title: 'J. Cole',
      description: 'Artist · 45.1M monthly listeners.',
      image: 'https://i.scdn.co/image/ab6761610000e5ebadd503b411a712e277895c8a',
      source: 'https://open.spotify.com/artist/6l3HvQ5sa6mXTsMTB19rO5',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [
        {
          type: 'appleMusic',
          url: 'https://music.apple.com/us/artist/j-cole/73705833',
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
          url: 'https://tidal.com/browse/artist/3652822',
          isVerified: true,
        },
        {
          type: 'youTube',
          url: 'https://music.youtube.com/channel/UCByOQJjav0CUDwxCk-jVNRQ',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(6);
  });
});
