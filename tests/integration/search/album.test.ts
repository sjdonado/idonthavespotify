import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerAlbumResponseMock from '../../fixtures/deezer/albumResponseMock.json';
import tidalAlbumResponseMock from '../../fixtures/tidal/albumResponseMock.json';
import youtubeAlbumResponseMock from '../../fixtures/youtube/albumResponseMock.json';
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
  spotifyAlbumHeadResponseMock,
  appleMusicAlbumResponseMock,
  soundCloudAlbumResponseMock,
] = await Promise.all([
  Bun.file('tests/fixtures/spotify/albumHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/albumResponseMock.html').text(),
  Bun.file('tests/fixtures/soundcloud/albumResponseMock.html').text(),
]);

describe('GET /search - Album', () => {
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

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW';
    const query = 'For All The Dogs Drake';

    const tidalSearchLink = getTidalSearchLink(query, MetadataType.Album);
    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, MetadataType.Album);
    const deezerSearchLink = getDeezerSearchLink(query, 'album');
    const soundCloudSearchLink = getSoundCloudSearchLink(query);

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyAlbumHeadResponseMock);

    mock.onGet(tidalSearchLink).reply(200, tidalAlbumResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicAlbumResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerAlbumResponseMock);
    mock.onGet(soundCloudSearchLink).reply(200, soundCloudAlbumResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeAlbumResponseMock);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9hbGJ1bS80Y3pkT1JkQ1dQOXVtcGJoRlhLMmZX',
      type: 'album',
      title: 'For All The Dogs',
      description: 'Drake · Album · 2023 · 23 songs.',
      image: 'https://i.scdn.co/image/ab67616d0000b2730062621987df634efede0e6c',
      source: 'https://open.spotify.com/album/4czdORdCWP9umpbhFXK2fW',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [
        {
          type: 'appleMusic',
          url: 'https://music.apple.com/us/album/for-all-the-dogs/1710685602',
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/album/496789121',
          isVerified: true,
        },
        {
          type: 'soundCloud',
          url: 'https://soundcloud.com/octobersveryown/sets/for-all-the-dogs-3',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://tidal.com/browse/album/320189583',
          isVerified: true,
        },
        {
          type: 'youTube',
          url: 'https://music.youtube.com/playlist?list=PLbUIPZJL6vw-7ef4PuuPJhaK3K-0UxRKO',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(6);
  });
});
