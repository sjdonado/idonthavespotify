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
  getYouTubeSearchLink,
} from '../../utils/shared';

import youtubeShowResponseMock from '../../fixtures/youtube/showResponseMock.json';
import deezerShowResponseMock from '../../fixtures/deezer/showResponseMock.json';

const [spotifyShowHeadResponseMock, appleMusicShowResponseMock] = await Promise.all([
  Bun.file('tests/fixtures/spotify/showHeadResponseMock.html').text(),
  Bun.file('tests/fixtures/apple-music/showResponseMock.html').text(),
]);

describe('GET /search - Podcast Show', () => {
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
    const spotifyLink = 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc';
    const query = 'Waveform: The MKBHD Podcast';

    const appleMusicSearchLink = getAppleMusicSearchLink(query);
    const youtubeSearchLink = getYouTubeSearchLink(query, 'channel');
    const deezerSearchLink = getDeezerSearchLink(query, 'podcast');

    const request = JSONRequest(API_SEARCH_ENDPOINT, { spotifyLink });

    mock.onGet(spotifyLink).reply(200, spotifyShowHeadResponseMock);
    mock.onGet(appleMusicSearchLink).reply(200, appleMusicShowResponseMock);
    mock.onGet(youtubeSearchLink).reply(200, youtubeShowResponseMock);
    mock.onGet(deezerSearchLink).reply(200, deezerShowResponseMock);

    redisGetMock.mockResolvedValue(0);
    redisSetMock.mockResolvedValue('');

    const response = await app.handle(request).then(res => res.json());

    expect(response).toEqual({
      id: '6o81QuW22s5m2nfcXWjucc',
      type: 'website',
      title: 'Waveform: The MKBHD Podcast',
      description:
        'Listen to Waveform: The MKBHD Podcast on Spotify. A tech podcast for the gadget lovers and tech heads among us from the mind of Marques Brownlee, better known as MKBHD. MKBHD has made a name for himself on YouTube reviewing everything from the newest smartphones to cameras to electric cars. Pulling from over 10 years of experience covering the tech industry, MKBHD and co-hosts Andrew Manganelli and David Imel will keep you informed and entertained as they take a deep dive into the latest and greatest in tech and what deserves your hard earned cash. New episodes every week. Waveform is part of the Vox Media Podcast Network. We wanna make the podcast even better, help us learn how we can: https://bit.ly/2EcYbu4 ',
      image: 'https://i.scdn.co/image/ab6765630000ba8aa05ac56dbc44378f45ef693a',
      source: 'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc',
      links: [
        {
          type: 'youTube',
          url: 'https://www.youtube.com/channel/UCEcrRXW3oEYfUctetZTAWLw',
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

    expect(redisGetMock).toHaveBeenCalledTimes(2);
    expect(redisSetMock).toHaveBeenCalledTimes(2);
    expect(mock.history.get).toHaveLength(3);
  });
});
