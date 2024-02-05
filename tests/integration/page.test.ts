import { beforeAll, afterEach, describe, expect, it, spyOn, jest } from 'bun:test';

import axios from 'axios';
import Redis from 'ioredis';
import AxiosMockAdapter from 'axios-mock-adapter';

import { getCheerioDoc } from '~/utils/scraper';
import { formDataRequest } from '../utils/request';

import { app } from '~/index';

const INDEX_ENDPOINT = 'http://localhost';

const spotifySongHeadResponseMock = await Bun.file(
  'tests/fixtures/spotify/songHeadResponseMock.html'
).text();

describe('Page router', () => {
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

  describe('GET /', () => {
    it('should return landing page', async () => {
      const request = new Request(`${INDEX_ENDPOINT}`);

      redisGetMock.mockResolvedValue(1);

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      expect(doc('h1').text()).toEqual("I don't have Spotify");
      expect(doc('h2').text()).toEqual(
        'Paste a Spotify link and listen on other platforms.'
      );

      const footerText = doc('footer').text();
      expect(footerText).toContain('Status');
      expect(footerText).toContain('View on Raycast');
      expect(footerText).toContain('View on Github');

      expect(redisGetMock).toHaveBeenCalledTimes(1);
      expect(redisSetMock).toHaveBeenCalledTimes(0);
    });

    it('should return error message if searchCount returns error', async () => {
      const request = new Request(`${INDEX_ENDPOINT}`);

      redisGetMock.mockRejectedValueOnce(new Error('Something went wrong'));

      const response = app.handle(request).then(res => res.text());

      expect(response).resolves.toEqual(
        '<p class="mt-8 text-center">Something went wrong, try again later.</p>'
      );
    });
  });

  describe('POST /search', () => {
    const endpoint = `${INDEX_ENDPOINT}/search`;
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

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
          url: 'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake',
        },
      ],
    };

    it('should return search card with a valid spotifyLink', async () => {
      const request = formDataRequest(endpoint, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);

      redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedResponse));
      redisGetMock.mockResolvedValue(1);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const searchCardText = doc('#search-card').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div > ul > li >a').toArray();

      expect(searchLinks).toHaveLength(5);
      expect(searchLinks[0].attribs['aria-label']).toContain('Listen on Apple Music');
      expect(searchLinks[0].attribs['href']).toBe(
        'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237'
      );
      expect(searchLinks[1].attribs['aria-label']).toContain('Listen on YouTube');
      expect(searchLinks[1].attribs['href']).toBe(
        'https://www.youtube.com/watch?v=zhY_0DoQCQs'
      );
      expect(searchLinks[2].attribs['aria-label']).toContain('Listen on Deezer');
      expect(searchLinks[2].attribs['href']).toBe(
        'https://www.deezer.com/track/144572248'
      );
      expect(searchLinks[3].attribs['aria-label']).toContain('Listen on SoundCloud');
      expect(searchLinks[3].attribs['href']).toBe(
        'https://soundcloud.com/octobersveryown/drake-do-not-disturb'
      );
      expect(searchLinks[4].attribs['aria-label']).toContain('Listen on Tidal');
      expect(searchLinks[4].attribs['href']).toBe(
        'https://listen.tidal.com/search?q=Do%20Not%20Disturb%20Drake'
      );

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
      expect(mock.history.get).toHaveLength(0);
    });

    it('should return search card when searchLinks are empty', async () => {
      const cachedResponseWithEmptySearchLinks = {
        ...cachedResponse,
        links: [],
      };

      const request = formDataRequest(endpoint, { spotifyLink });

      mock.onGet(spotifyLink).reply(200, spotifySongHeadResponseMock);

      redisGetMock.mockResolvedValueOnce(
        JSON.stringify(cachedResponseWithEmptySearchLinks)
      );
      redisGetMock.mockResolvedValue(1);
      redisSetMock.mockResolvedValue('');

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const searchCardText = doc('#search-card').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div > ul > li >a').toArray();

      expect(searchLinks).toHaveLength(0);

      expect(redisGetMock).toHaveBeenCalledTimes(2);
      expect(redisSetMock).toHaveBeenCalledTimes(1);
      expect(mock.history.get).toHaveLength(0);
    });

    it('should return error message when sent an invalid spotifyLink', async () => {
      const request = formDataRequest(endpoint, {
        spotifyLink: 'https://open.spotify.com/invalid',
      });

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, try again later.');
    });

    it('should return error message when internal server error', async () => {
      const request = formDataRequest(endpoint, { spotifyLink });

      mock.onGet(spotifyLink).reply(500);

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, try again later.');
      expect(mock.history.get).toHaveLength(1);
    });
  });
});
