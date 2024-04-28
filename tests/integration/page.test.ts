import { beforeEach, describe, expect, it, mock, jest } from 'bun:test';

import { getCheerioDoc } from '~/utils/scraper';
import { formDataRequest } from '../utils/request';

import { app } from '~/index';
import { getCachedSearchResult } from '~/services/cache';

import { cachedResponse } from '../utils/shared';

const INDEX_ENDPOINT = 'http://localhost';

mock.module('~/services/cache', () => ({
  getCachedSearchResult: jest.fn(),
}));

describe('Page router', () => {
  const getCachedSearchResultMock = getCachedSearchResult as jest.Mock;

  beforeEach(() => {
    getCachedSearchResultMock.mockReset();
  });

  describe('GET /', () => {
    it('should return landing page', async () => {
      const request = new Request(`${INDEX_ENDPOINT}`);
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      expect(doc('h1').text()).toEqual("I don't have Spotify");
      expect(doc('h2').text()).toEqual(
        'Paste a Spotify link and listen on other platforms.'
      );

      const footerText = doc('footer').text();

      expect(footerText).toContain('@sjdonado');
      expect(footerText).toContain('Status');
      expect(footerText).toContain('View on Raycast');
      expect(footerText).toContain('Source Code');
    });
  });

  describe('POST /search', () => {
    const endpoint = `${INDEX_ENDPOINT}/search`;
    const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    it('should return search card with a valid link', async () => {
      getCachedSearchResultMock.mockResolvedValueOnce(cachedResponse);

      const request = formDataRequest(endpoint, { link });
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
        'https://music.youtube.com/watch?v=zhY_0DoQCQs'
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
        'https://listen.tidal.com/search?q=Do+Not+Disturb+Drake'
      );

      expect(getCachedSearchResultMock).toHaveBeenCalledTimes(1);
    });

    it('should return search card when searchLinks are empty', async () => {
      getCachedSearchResultMock.mockResolvedValueOnce({
        ...cachedResponse,
        links: [],
      });

      const request = formDataRequest(endpoint, { link });
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      const searchCardText = doc('#search-card').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div > ul > li >a').toArray();

      expect(searchLinks).toHaveLength(0);

      expect(getCachedSearchResultMock).toHaveBeenCalledTimes(1);
    });

    it('should return error message when sent an invalid link', async () => {
      const request = formDataRequest(endpoint, {
        link: 'https://open.spotify.com/invalid',
      });

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, try again later.');
    });

    it('should return error message when internal server error', async () => {
      getCachedSearchResultMock.mockImplementationOnce(() => {
        throw new Error('Injected Error');
      });

      const request = formDataRequest(endpoint, { link });
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, try again later.');

      expect(getCachedSearchResultMock).toHaveBeenCalledTimes(1);
    });
  });
});
