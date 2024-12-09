import { beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { app } from '~/index';
import * as linkParser from '~/parsers/link';
import {
  cacheSearchMetadata,
  cacheSearchResultLink,
  cacheShortenLink,
  cacheStore,
  cacheTidalUniversalLinkResponse,
} from '~/services/cache';
import { getCheerioDoc } from '~/utils/scraper';

import { formDataRequest } from '../utils/request';
import { urlShortenerResponseMock } from '../utils/shared';

const INDEX_ENDPOINT = 'http://localhost';

describe('Page router', () => {
  beforeEach(async () => {
    cacheStore.reset();

    await Promise.all([
      cacheSearchMetadata('2KvHC9z14GSl4YpkNMX384', Parser.Spotify, {
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

      expect(doc('h1').text()).toEqual("I Don't Have Spotify");
      expect(doc('p').text()).toContain(
        'Paste a link from Spotify, YouTube Music, Apple Music, Deezer or SoundCloud to start.'
      );

      const footerText = doc('footer').text();

      expect(footerText).toContain('@sjdonado');
      expect(footerText).toContain('Status');
      expect(footerText).toContain('Source Code');
      expect(footerText).toContain('Raycast Extension');
    });
  });

  describe('POST /search', () => {
    const endpoint = `${INDEX_ENDPOINT}/search`;
    const spotifyLink = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    it('should return search card with a valid link', async () => {
      await Promise.all([
        cacheTidalUniversalLinkResponse('https://tidal.com/browse/track/71717750/u', {
          spotify: null,
          youTube: null,
          appleMusic: null,
          deezer: null,
          soundCloud: null,
          tidal: null,
        }),
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
        cacheSearchResultLink(
          new URL(
            'https://openapi.tidal.com/v2/searchresults/Do%20Not%20Disturb%20Drake/relationships/tracks?countryCode=US&include=tracks'
          ),
          {
            type: Adapter.Tidal,
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          }
        ),
      ]);

      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request);
      const data = await response.text();

      const doc = getCheerioDoc(data);

      const searchCardText = doc('[data-controller="search-card"]').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('[data-controller="search-link"] > a').toArray();

      expect(searchLinks).toHaveLength(5);
      expect(searchLinks[0].attribs['aria-label']).toContain('Listen on Apple Music');
      expect(searchLinks[0].attribs['href']).toBe(
        'https://music.apple.com/us/album/do-not-disturb/1440890708?i=1440892237'
      );
      expect(searchLinks[1].attribs['aria-label']).toContain('Listen on Deezer');
      expect(searchLinks[1].attribs['href']).toBe(
        'https://www.deezer.com/track/144572248'
      );
      expect(searchLinks[2].attribs['aria-label']).toContain('Listen on SoundCloud');
      expect(searchLinks[2].attribs['href']).toBe(
        'https://soundcloud.com/octobersveryown/drake-do-not-disturb'
      );
      expect(searchLinks[3].attribs['aria-label']).toContain('Listen on Tidal');
      expect(searchLinks[3].attribs['href']).toBe(
        'https://tidal.com/browse/track/71717750'
      );
      expect(searchLinks[4].attribs['aria-label']).toContain('Listen on YouTube');
      expect(searchLinks[4].attribs['href']).toBe(
        'https://music.youtube.com/watch?v=vVd4T5NxLgI'
      );
    });

    it('should return search card with a valid link - From Universal link', async () => {
      await Promise.all([
        cacheTidalUniversalLinkResponse('https://tidal.com/browse/track/71717750/u', {
          spotify: {
            type: Adapter.Spotify,
            url: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
            isVerified: true,
          },
          youTube: {
            type: Adapter.YouTube,
            url: 'https://music.youtube.com/watch?v=zhY_0DoQCQs',
            isVerified: true,
          },
          appleMusic: {
            type: Adapter.AppleMusic,
            url: 'https://geo.music.apple.com/de/album/do-not-disturb/1440890708?i=1440892237&app=music&ls=1',
            isVerified: true,
          },
          deezer: null,
          soundCloud: null,
          tidal: null,
        }),
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
        cacheSearchResultLink(
          new URL(
            'https://openapi.tidal.com/v2/searchresults/Do%20Not%20Disturb%20Drake/relationships/tracks?countryCode=US&include=tracks'
          ),
          {
            type: Adapter.Tidal,
            url: 'https://tidal.com/browse/track/71717750',
            isVerified: true,
          }
        ),
      ]);

      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request);
      const data = await response.text();

      const doc = getCheerioDoc(data);

      const searchCardText = doc('[data-controller="search-card"]').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('[data-controller="search-link"] > a').toArray();

      expect(searchLinks).toHaveLength(5);
      expect(searchLinks[0].attribs['aria-label']).toContain('Listen on Apple Music');
      expect(searchLinks[0].attribs['href']).toBe(
        'https://geo.music.apple.com/de/album/do-not-disturb/1440890708?i=1440892237&app=music&ls=1'
      );
      expect(searchLinks[1].attribs['aria-label']).toContain('Listen on Deezer');
      expect(searchLinks[1].attribs['href']).toBe(
        'https://www.deezer.com/track/144572248'
      );
      expect(searchLinks[2].attribs['aria-label']).toContain('Listen on SoundCloud');
      expect(searchLinks[2].attribs['href']).toBe(
        'https://soundcloud.com/octobersveryown/drake-do-not-disturb'
      );
      expect(searchLinks[3].attribs['aria-label']).toContain('Listen on Tidal');
      expect(searchLinks[3].attribs['href']).toBe(
        'https://tidal.com/browse/track/71717750'
      );
      expect(searchLinks[4].attribs['aria-label']).toContain('Listen on YouTube');
      expect(searchLinks[4].attribs['href']).toBe(
        'https://music.youtube.com/watch?v=zhY_0DoQCQs'
      );
    });

    it('should return search card when searchLinks are empty', async () => {
      const request = formDataRequest(endpoint, { link: spotifyLink });
      const response = await app.handle(request);
      const data = await response.text();

      const doc = getCheerioDoc(data);

      const searchCardText = doc('[data-controller="search-card"]').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div.flex-1 > ul > a').toArray();

      expect(searchLinks).toHaveLength(0);
    });

    it('should return error message when sent an invalid link', async () => {
      const request = formDataRequest(endpoint, {
        link: 'https://open.spotify.com/invalid',
      });

      const response = await app.handle(request);

      const data = await response.text();
      const doc = getCheerioDoc(data);
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
      const response = await app.handle(request);
      const data = await response.text();

      const doc = getCheerioDoc(data);
      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, please try again later.');
      expect(getSearchParserMock).toHaveBeenCalledTimes(1);
    });
  });
});
