import type { Server } from 'bun';
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import * as linkParser from '~/parsers/link';
import {
  cacheSearchMetadata,
  cacheSearchResultLink,
  cacheShortenLink,
  cacheStore,
} from '~/services/cache';
import { getCheerioDoc } from '~/utils/scraper';

import { createTestApp, formDataFromObject, nodeFetch } from './utils/request';
import { pageSearchEndpoint, urlShortenerResponseMock } from './utils/shared';

describe('Page router', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = pageSearchEndpoint(app.url);
  });

  afterAll(() => {
    app.stop();
  });

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
        `${ENV.app.url}?id=2KvHC9z14GSl4YpkNMX384`,
        urlShortenerResponseMock.data.refer
      ),
    ]);
  });

  describe('GET /', () => {
    it('should return landing page', async () => {
      const response = await nodeFetch(app.url.toString());

      const html = await response.text();

      const doc = getCheerioDoc(html);

      expect(doc('h1').text()).toEqual("I Don't Have Spotify");
      expect(doc('p').text()).toContain(
        'Paste a link from Spotify, YouTube Music, Apple Music, Deezer, SoundCloud or Tidal to start.'
      );

      const footerText = doc('footer').text();

      expect(footerText).toContain('@sjdonado');
      expect(footerText).toContain('Status');
      expect(footerText).toContain('Source');
      expect(footerText).toContain('Spooky Planning');
    });
  });

  describe('POST /search', () => {
    const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    it('should return search card with a valid link', async () => {
      const endpoint = `${app.url}/search`;
      await Promise.all([
        cacheSearchResultLink(
          new URL(
            'https://content-youtube.googleapis.com/youtube/v3/search?type=video&regionCode=US&q=Do+Not+Disturb+Drake&part=id&safeSearch=none&key=youtube_api_key'
          ),
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
            url: 'https://geo.music.apple.com/de/album/do-not-disturb/1440890708?i=1440892237&app=music&ls=1',
            isVerified: true,
          }
        ),
        cacheSearchResultLink(
          new URL('https://api.deezer.com/search/track?q=Do+Not+Disturb+Drake&limit=4'),
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

      const response = await nodeFetch(endpoint, {
        method: 'POST',
        body: formDataFromObject({ link }),
      });
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
      expect(searchLinks[3].attribs['aria-label']).toContain('Listen on Spotify');
      expect(searchLinks[3].attribs['href']).toBe(
        'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384'
      );
      expect(searchLinks[4].attribs['aria-label']).toContain('Listen on YouTube Music');
      expect(searchLinks[4].attribs['href']).toBe(
        'https://music.youtube.com/watch?v=zhY_0DoQCQs'
      );
    });

    it('should return search card with a valid link - From Universal link', async () => {
      const endpoint = `${app.url}/search`;
      await Promise.all([
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
        cacheSearchResultLink(
          new URL('https://api.deezer.com/search/track?q=Do+Not+Disturb+Drake&limit=4'),
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

      const response = await nodeFetch(endpoint, {
        method: 'POST',
        body: formDataFromObject({ link }),
      });
      const data = await response.text();

      const doc = getCheerioDoc(data);

      const searchCardText = doc('[data-controller="search-card"]').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('[data-controller="search-link"] > a').toArray();

      expect(searchLinks.length).toBeGreaterThanOrEqual(2);

      // Test that we have the cached links that we know should exist
      const deezerLink = searchLinks.find(
        link => link.attribs['href'] === 'https://www.deezer.com/track/144572248'
      );
      const soundCloudLink = searchLinks.find(
        link =>
          link.attribs['href'] ===
          'https://soundcloud.com/octobersveryown/drake-do-not-disturb'
      );

      expect(deezerLink).toBeDefined();
      expect(deezerLink!.attribs['aria-label']).toContain('Listen on Deezer');
      expect(soundCloudLink).toBeDefined();
      expect(soundCloudLink!.attribs['aria-label']).toContain('Listen on SoundCloud');
    });

    it('should return search card when searchLinks are empty', async () => {
      const endpoint = `${app.url}/search`;
      const response = await nodeFetch(endpoint, {
        method: 'POST',
        body: formDataFromObject({ link }),
      });
      const data = await response.text();

      const doc = getCheerioDoc(data);

      const searchCardText = doc('[data-controller="search-card"]').text();

      expect(searchCardText).toContain('Do Not Disturb');
      expect(searchCardText).toContain('Drake · Song · 2017');

      const searchLinks = doc('#search-card > div.flex-1 > ul > a').toArray();

      expect(searchLinks).toHaveLength(0);
    });

    it('should return error message when sent an invalid link', async () => {
      const endpoint = `${app.url}/search`;
      const response = await nodeFetch(endpoint, {
        method: 'POST',
        body: formDataFromObject({
          link: 'https://open.spotify.com/invalid',
        }),
      });
      const data = await response.text();

      const doc = getCheerioDoc(data);
      const errorMessage = doc('p').text();
      expect(errorMessage).toContain(
        'Invalid link, please try with Spotify, YouTube, Apple Music, Deezer, SoundCloud, Tidal, or Google Music Share links.'
      );
    });

    it('should return error message when internal app error', async () => {
      const endpoint = `${app.url}/search`;
      const getSearchParserMock = spyOn(linkParser, 'getSearchParser');

      getSearchParserMock.mockImplementationOnce(() => {
        throw new Error();
      });

      const response = await nodeFetch(`${endpoint}?test=1`, {
        method: 'POST',
        body: formDataFromObject({
          link,
        }),
      });
      const data = await response.text();

      const doc = getCheerioDoc(data);
      const errorMessage = doc('p').text();
      expect(errorMessage).toContain('Something went wrong, please try again later.');
      expect(getSearchParserMock).toHaveBeenCalledTimes(1);
    });
  });
});
