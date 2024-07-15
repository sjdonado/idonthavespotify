import { ENV } from '~/config/env';
import { beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { getCheerioDoc } from '~/utils/scraper';
import { formDataRequest } from '../utils/request';

import { app } from '~/index';

import { MetadataType, Adapter } from '~/config/enum';

import {
  cacheSearchMetadata,
  cacheSearchResultLink,
  cacheShortenLink,
  cacheStore,
} from '~/services/cache';

import * as linkParser from '~/parsers/link';
import { urlShortenerResponseMock } from '../utils/shared';

const INDEX_ENDPOINT = 'http://localhost';

describe('Page router', () => {
  beforeEach(async () => {
    cacheStore.reset();

    await Promise.all([
      cacheSearchMetadata('2KvHC9z14GSl4YpkNMX384', {
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        type: MetadataType.Song,
        image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
        audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
      }),
      cacheShortenLink(
        `${ENV.app.url}?id=b3Blbi5zcG90aWZ5LmNvbS90cmFjay8yS3ZIQzl6MTRHU2w0WXBrTk1YMzg0`,
        urlShortenerResponseMock.data.refer
      ),
    ]);
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
      expect(footerText).toContain('Install Extension');
      expect(footerText).toContain('Source Code');
    });
  });

  describe('POST /search', () => {
    const endpoint = `${INDEX_ENDPOINT}/search`;
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    it('should return search card with a valid link', async () => {
      await Promise.all([
        cacheSearchResultLink(
          new URL('https://music.youtube.com/search?q=Do+Not+Disturb+Drake+song'),
          {
            type: Adapter.YouTube,
            url: 'https://music.youtube.com/watch?v=zhY_0DoQCQs',
            isVerified: true,
          }
        ),
        cacheSearchResultLink(
          new URL('https://music.apple.com/ca/search?term=Do%20Not%20Disturb%20Drake'),
          {
            type: Adapter.AppleMusic,
            url: 'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237',
            isVerified: true,
          }
        ),
        cacheSearchResultLink(
          new URL('https://api.deezer.com/search/track?q=Do+Not+Disturb+Drake&limit=1'),
          {
            type: Adapter.Deezer,
            url: 'https://www.deezer.com/track/144572248',
            isVerified: true,
          }
        ),
        cacheSearchResultLink(
          new URL('https://soundcloud.com/search?q=Do+Not+Disturb+Drake'),
          {
            type: Adapter.SoundCloud,
            url: 'https://soundcloud.com/octobersveryown/drake-do-not-disturb',
            isVerified: true,
          }
        ),
      ]);

      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      const searchCardText = doc('#search-card').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div.flex-1 > ul > a').toArray();

      expect(searchLinks).toHaveLength(5);
      expect(searchLinks[0].attribs['aria-label']).toContain('Listen on YouTube');
      expect(searchLinks[0].attribs['href']).toBe(
        'https://music.youtube.com/watch?v=zhY_0DoQCQs'
      );
      expect(searchLinks[1].attribs['aria-label']).toContain('Listen on Apple Music');
      expect(searchLinks[1].attribs['href']).toBe(
        'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237'
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
    });

    it('should return search card when searchLinks are empty', async () => {
      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      const searchCardText = doc('#search-card').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div.flex-1 > ul > a').toArray();

      expect(searchLinks).toHaveLength(0);
    });

    it('should return error message when sent an invalid link', async () => {
      const request = formDataRequest(endpoint, {
        link: 'https://open.spotify.com/invalid',
      });

      const response = await app.handle(request).then(res => res.text());
      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain(
        'Invalid link, please try with Spotify or Youtube links.'
      );
    });

    it('should return error message when internal server error', async () => {
      const getSearchParserMock = spyOn(linkParser, 'getSearchParser');

      getSearchParserMock.mockImplementationOnce(() => {
        throw new Error('Injected Error');
      });

      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request).then(res => res.text());

      const doc = getCheerioDoc(response);

      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, try again later.');

      expect(getSearchParserMock).toHaveBeenCalledTimes(1);
    });
  });
});
