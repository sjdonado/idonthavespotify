import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { getAppleMusicMetadata } from '~/parsers/apple-music';
import { cacheStore } from '~/services/cache';

import { HttpMock } from '../utils/http-mock';

describe('Apple Music metadata catalog fallback', () => {
  let httpMock: HttpMock;

  beforeAll(() => {
    httpMock = new HttpMock();
  });

  beforeEach(() => {
    cacheStore.reset();
    httpMock.reset();
  });

  afterAll(() => {
    httpMock.restore();
  });

  it('picks the same-album song, not the first hit', async () => {
    const link = 'https://music.apple.com/us/album/bohemian-rhapsody/1440650428?i=1440650450';
    httpMock
      .onGet(link)
      .reply(
        200,
        '<html><head><meta property="og:title" content="Apple&#160;Music Web Player" /></head></html>'
      );
    httpMock.onGet('music.apple.com/us/search').reply(
      200,
      `<div data-testid="top-search-result" aria-label="Under Pressure · Song · Queen">
         <a data-testid="click-action" href="https://music.apple.com/us/album/greatest-hits-i-ii-iii/111?i=222"></a>
         <picture><source srcset="https://example.com/wrong-110.jpg 110w, https://example.com/wrong-220.jpg 220w" /></picture>
       </div>
       <div data-testid="top-search-result" aria-label="Bohemian Rhapsody · Song · Queen">
         <a data-testid="click-action" href="https://music.apple.com/us/album/bohemian-rhapsody/1440650428?i=1440650450"></a>
         <picture><source srcset="https://example.com/right-110.jpg 110w, https://example.com/right-220.jpg 220w" /></picture>
       </div>`
    );

    const metadata = await getAppleMusicMetadata('catalog-song-ambiguity', link);

    expect(metadata).toEqual({
      title: 'Bohemian Rhapsody',
      description: 'Bohemian Rhapsody Queen',
      type: MetadataType.Song,
      image: 'https://example.com/right-220.jpg',
      audio: undefined,
    });
  });

  it('resolves artists by ID match, not name', async () => {
    const link = 'https://music.apple.com/us/artist/j-cole/73705833';
    httpMock
      .onGet(link)
      .reply(
        200,
        '<html><head><meta property="og:title" content="Apple&#160;Music Web Player" /></head></html>'
      );
    httpMock.onGet('music.apple.com/us/search').reply(
      200,
      `<div data-testid="top-search-result" aria-label="J. Cole · Artist">
         <a data-testid="click-action" href="https://music.apple.com/us/artist/not-j-cole/123"></a>
       </div>
       <div data-testid="top-search-result" aria-label="J. Cole · Artist">
         <a data-testid="click-action" href="https://music.apple.com/us/artist/j-cole/73705833"></a>
         <picture><source srcset="https://example.com/jcole-110.jpg 110w" /></picture>
       </div>`
    );

    const metadata = await getAppleMusicMetadata('catalog-artist-id', link);

    expect(metadata).toEqual({
      title: 'J. Cole',
      description: 'J. Cole',
      type: MetadataType.Artist,
      image: 'https://example.com/jcole-110.jpg',
      audio: undefined,
    });
  });

  it('resolves albums straight from oEmbed', async () => {
    const link = 'https://music.apple.com/us/album/nevermind/1440783617';
    httpMock
      .onGet(link)
      .reply(
        200,
        '<html><head><meta property="og:title" content="Apple&#160;Music Web Player" /></head></html>'
      );
    httpMock.onGet('music.apple.com/api/oembed').reply(200, {
      title: 'Nevermind',
      author_name: 'Nirvana',
      thumbnail_url: 'https://example.com/300x300bb.jpg',
    });

    const metadata = await getAppleMusicMetadata('catalog-album-oembed', link);

    expect(metadata).toEqual({
      title: 'Nevermind',
      description: 'Nevermind Nirvana',
      type: MetadataType.Album,
      image: 'https://example.com/600x600bb.jpg',
      audio: undefined,
    });
  });

  it('keeps the original error when the catalog yields nothing', async () => {
    const link = 'https://music.apple.com/us/album/bohemian-rhapsody/1440650428?i=1440650450';
    httpMock.onGet(link).reply(200, '<html><body>bot wall</body></html>');
    httpMock.onGet('music.apple.com/us/search').reply(200, '<div></div>');

    await expect(getAppleMusicMetadata('catalog-broken', link)).rejects.toThrow(
      'AppleMusic metadata not found'
    );
  });
});
