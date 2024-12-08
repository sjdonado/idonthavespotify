import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { beforeAll, beforeEach, describe, expect, it, jest, mock } from 'bun:test';

import { app } from '~/index';
import { getUniversalMetadataFromTidal } from '~/parsers/tidal-universal-link';
import { cacheStore } from '~/services/cache';

import deezerShowResponseMock from '../../fixtures/deezer/showResponseMock.json';
import { JSONRequest } from '../../utils/request';
import {
  API_SEARCH_ENDPOINT,
  getAppleMusicSearchLink,
  getDeezerSearchLink,
  getYouTubeSearchLink,
  urlShortenerLink,
  urlShortenerResponseMock,
} from '../../utils/shared';

const [spotifyShowHeadResponseMock, appleMusicShowResponseMock] = await Promise.all([
  Bun.file('tests/fixtures/spotify/showHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/showResponseMock.html').text(),
]);

mock.module('~/parsers/tidal-universal-link', () => ({
  getUniversalMetadataFromTidal: jest.fn(),
}));

describe('GET /search - Podcast Show', () => {
  let mock: AxiosMockAdapter;
  const getUniversalMetadataFromTidalMock = getUniversalMetadataFromTidal as jest.Mock;

  beforeAll(() => {
    mock = new AxiosMockAdapter(axios);
  });

  beforeEach(() => {
    getUniversalMetadataFromTidalMock.mockReset();
    mock.reset();
    cacheStore.reset();
  });

  it('should return 200', async () => {
    const link = 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc';
    const query = 'Waveform: The MKBHD Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'channel');
    const deezerSearchLink = getDeezerSearchLink(query, 'podcast');

    const request = JSONRequest(API_SEARCH_ENDPOINT, { link });

    mock.onGet(link).reply(200, spotifyShowHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicShowResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerShowResponseMock);
    mock.onPost(urlShortenerLink).reply(200, urlShortenerResponseMock);

    const mockedYoutubeLink =
      'https://music.youtube.com/watch?v=v4FYdo-oZQk&list=PL70yIS6vx_Y2xaKD3w2qb6Eu06jNBdNJb';
    getLinkWithPuppeteerMock.mockResolvedValueOnce(mockedYoutubeLink);

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
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
          type: 'youTube',
          url: mockedYoutubeLink,
          isVerified: true,
        },
        {
          type: 'deezer',
          url: 'https://www.deezer.com/show/1437252',
          isVerified: true,
        },
        {
          type: 'tidal',
          url: 'https://listen.tidal.com/search?q=Waveform%3A+The+MKBHD+Podcast',
        },
      ],
    });

    expect(mock.history.get).toHaveLength(2);
    expect(getLinkWithPuppeteerMock).toHaveBeenCalledTimes(1);
    // expect(getLinkWithPuppeteerMock).toHaveBeenCalledWith(
    //   expect.stringContaining(youtubeSearchLink),
    //   'ytmusic-card-shelf-renderer a',
    //   expect.any(Array)
    // );
  });
});
