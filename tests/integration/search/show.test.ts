import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { ENV } from '~/config/env';
import { app } from '~/index';
import * as tidalUniversalLinkParser from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerShowResponseMock from '../../fixtures/deezer/showResponseMock.json';
import { jsonRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

const [spotifyShowHeadResponseMock, appleMusicShowResponseMock] = await Promise.all([
  Bun.file('tests/fixtures/spotify/showHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/showResponseMock.html').text(),
]);

describe('GET /search - Podcast Show', () => {
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
    mock.onPost(ENV.adapters.spotify.authUrl).reply(200, {});
    mock.onPost(ENV.adapters.tidal.authUrl).reply(200, {});
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc';
    const query = 'Waveform: The MKBHD Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const deezerSearchLink = getDeezerSearchLink(query, 'podcast');

    const request = jsonRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyShowHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicShowResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerShowResponseMock);
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    const response = await app.handle(request);
    const data = await response.json();

    expect(data).toEqual({
      id: 'b3Blbi5zcG90aWZ5LmNvbS9zaG93LzZvODFRdVcyMnM1bTJuZmNYV2p1Y2M%3D',
      type: 'show',
      title: 'Waveform: The MKBHD Podcast',
      description:
        'Listen to Waveform: The MKBHD Podcast on Spotify. A tech podcast for the gadget lovers and tech heads among us from the mind of Marques Brownlee, better known as MKBHD. MKBHD has made a name for himself on YouTube reviewing everything from the newest smartphones to cameras to electric cars. Pulling from over 10 years of experience covering the tech industry, MKBHD and co-hosts Andrew Manganelli and David Imel will keep you informed and entertained as they take a deep dive into the latest and greatest in tech and what deserves your hard earned cash. New episodes every week. Waveform is part of the Vox Media Podcast Network. We wanna make the podcast even better, help us learn how we can: https://bit.ly/2EcYbu4 ',
      image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
      source: 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc',
      universalLink: urlShortenerResponseMock.data.refer,
      links: [
        {
          type: 'deezer',
          url: 'https://www.deezer.com/show/1437252',
          isVerified: true,
        },
      ],
    });

    expect(mock.history.get).toHaveLength(2);
  });
});
