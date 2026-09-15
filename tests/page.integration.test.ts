import type { Server } from 'bun';
import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { Adapter, MetadataType, Parser } from '~/config/enum';
import * as linkParser from '~/parsers/link';
import {
  cacheSearchMetadata,
  cacheSearchResultLink,
  cacheStore,
} from '~/services/cache';
import { getCheerioDoc } from '~/utils/scraper';

import { HttpMock } from './utils/http-mock';
import { createTestApp, formDataFromObject, nodeFetch } from './utils/request';

describe('Page router', () => {
  let app: Server<undefined>;
  let httpMock: HttpMock;

  beforeAll(() => {
    app = createTestApp();
    httpMock = new HttpMock();
  });

  afterAll(() => {
    app.stop();
    httpMock.restore();
  });

  beforeEach(async () => {
    cacheStore.reset();

    await cacheSearchMetadata('2KvHC9z14GSl4YpkNMX384', Parser.Spotify, {
      title: 'Do Not Disturb',
      description: 'Drake · Song · 2017',
      type: MetadataType.Song,
      image: 'https://i.scdn.co/image/ab67616d0000b2734f0fd9dad63977146e685700',
      audio: 'https://p.scdn.co/mp3-preview/df989a31c8233f46b6a997c59025f9c8021784aa',
    });
  });

  describe('GET /', () => {
    it('should return landing page', async () => {
      const response = await nodeFetch(app.url.toString());

      const html = await response.text();

      const doc = getCheerioDoc(html);

      expect(doc('h1').text()).toEqual("I Don't Have Spotify");
      expect(doc('p').text()).toContain(
        'Paste a link from Spotify, YouTube Music, Apple Music, Deezer, SoundCloud, Qobuz, Bandcamp, Pandora, or Tidal to start.'
      );

      // Google pattern: hero on landing, sample-track shortcut present.
      expect(html).toContain('home-hero');
      expect(html).toContain('Try a sample track');

      const footerText = doc('footer').text();

      expect(footerText).not.toContain('@sjdonado');
      expect(footerText).not.toContain('Status');
      expect(footerText).toContain('Source');
      expect(footerText).toContain('Planning Tool');
    });
  });

  describe('POST /search', () => {
    const link = 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384';

    it('should return search card with a valid link', async () => {
      const endpoint = `${app.url}/search`;
      await Promise.all([
        cacheSearchResultLink(Adapter.YouTube, Parser.Spotify, '2KvHC9z14GSl4YpkNMX384', {
          type: Adapter.YouTube,
          url: 'https://music.youtube.com/watch?v=zhY_0DoQCQs',
          isVerified: true,
        }),
        cacheSearchResultLink(
          Adapter.AppleMusic,
          Parser.Spotify,
          '2KvHC9z14GSl4YpkNMX384',
          {
            type: Adapter.AppleMusic,
            url: 'https://geo.music.apple.com/de/album/do-not-disturb/1440890708?i=1440892237&app=music&ls=1',
            isVerified: true,
          }
        ),
        cacheSearchResultLink(Adapter.Deezer, Parser.Spotify, '2KvHC9z14GSl4YpkNMX384', {
          type: Adapter.Deezer,
          url: 'https://www.deezer.com/track/144572248',
          isVerified: true,
        }),
        cacheSearchResultLink(
          Adapter.SoundCloud,
          Parser.Spotify,
          '2KvHC9z14GSl4YpkNMX384',
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

      // The shareable URL travels in the same response via header.
      expect(response.headers.get('hx-replace-url')).toMatch(/^\/?\?id=.+/);

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
        cacheSearchResultLink(Adapter.Deezer, Parser.Spotify, '2KvHC9z14GSl4YpkNMX384', {
          type: Adapter.Deezer,
          url: 'https://www.deezer.com/track/144572248',
          isVerified: true,
        }),
        cacheSearchResultLink(
          Adapter.SoundCloud,
          Parser.Spotify,
          '2KvHC9z14GSl4YpkNMX384',
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

    it('should return an HTML error fragment when sent an invalid link', async () => {
      const endpoint = `${app.url}/search`;
      const response = await nodeFetch(endpoint, {
        method: 'POST',
        body: formDataFromObject({
          link: 'https://open.spotify.com/invalid',
        }),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get('content-type')).toContain('text/html');

      const data = await response.text();
      const doc = getCheerioDoc(data);
      expect(doc('p').text()).toContain(
        'Invalid link, please try with Spotify, YouTube, Apple Music, Deezer, SoundCloud, Tidal, Qobuz, Bandcamp, Pandora, or Google Music Share links.'
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
