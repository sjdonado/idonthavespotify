import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { getAppleMusicMetadata } from '~/parsers/apple-music';
import { cacheStore } from '~/services/cache';

import { HttpMock } from '../utils/http-mock';

describe('Apple Music metadata Lookup fallback', () => {
  const link = 'https://music.apple.com/us/album/bohemian-rhapsody/1440650428?i=1440650450';
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

  it('falls back to Lookup plus song search when the page is bot-walled', async () => {
    httpMock
      .onGet(link)
      .reply(
        200,
        '<html><head><meta property="og:title" content="Apple&#160;Music Web Player" /></head></html>'
      );
    httpMock.onGet('itunes.apple.com/lookup').reply(200, {
      resultCount: 1,
      results: [
        {
          collectionName: 'A Night At The Opera',
          artistName: 'Queen',
          artworkUrl100: 'https://example.com/100x100bb.jpg',
        },
      ],
    });
    httpMock.onGet('itunes.apple.com/search').reply(200, {
      resultCount: 1,
      results: [
        {
          trackName: 'Bohemian Rhapsody',
          artistName: 'Queen',
          artworkUrl100: 'https://example.com/100x100bb.jpg',
          previewUrl: 'https://example.com/preview.m4a',
        },
      ],
    });

    const metadata = await getAppleMusicMetadata('lookup-fallback-song', link);

    expect(metadata).toEqual({
      title: 'Bohemian Rhapsody',
      description: 'Bohemian Rhapsody Queen',
      type: MetadataType.Song,
      image: 'https://example.com/600x600bb.jpg',
      audio: 'https://example.com/preview.m4a',
    });
  });

  it('keeps the original error when Lookup is unusable too', async () => {
    httpMock.onGet(link).reply(200, '<html><body>bot wall</body></html>');
    httpMock.onGet('itunes.apple.com/lookup').reply(200, { resultCount: 0, results: [] });

    await expect(getAppleMusicMetadata('lookup-fallback-broken', link)).rejects.toThrow(
      'AppleMusic metadata not found'
    );
  });
});
