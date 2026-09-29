import type { Server } from 'bun';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { getApplePodcastsLink, getPodcastFeedLink } from '~/adapters/apple-podcasts';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { cacheStore } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';

import { HttpMock } from './utils/http-mock';
import { createTestApp, nodeFetch } from './utils/request';
import { apiSearchEndpoint } from './utils/shared';

const SHOW_LINK =
  'https://podcasts.apple.com/us/podcast/this-american-life/id201671138';

const showLookup = {
  resultCount: 1,
  results: [
    {
      wrapperType: 'collection',
      collectionName: 'This American Life',
      artistName: 'This American Life',
      collectionViewUrl:
        'https://podcasts.apple.com/us/podcast/this-american-life/id201671138?uo=4',
      feedUrl: 'https://www.thisamericanlife.org/podcast/rss.xml',
      artworkUrl100: 'https://example.com/art100.jpg',
    },
  ],
};

const showSearch = {
  resultCount: 1,
  results: [
    {
      collectionName: 'This American Life',
      artistName: 'This American Life',
      collectionViewUrl:
        'https://podcasts.apple.com/us/podcast/this-american-life/id201671138?uo=4',
      feedUrl: 'https://www.thisamericanlife.org/podcast/rss.xml',
    },
  ],
};

const songMetadata: SearchMetadata = {
  title: 'Kesariya',
  description: 'Brahmastra',
  type: MetadataType.Song,
  image: 'https://example.com/i.jpg',
};

describe('Apple Podcasts adapters', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    cacheStore.reset();
    httpMock = new HttpMock();
  });

  afterEach(() => {
    httpMock.restore();
  });

  it('finds the show page', async () => {
    httpMock.onGet(/itunes\.apple\.com\/search/).reply(200, showSearch);

    const link = await getApplePodcastsLink(
      'This American Life',
      {
        title: 'This American Life',
        description: 'This American Life',
        type: MetadataType.Show,
      },
      Parser.Spotify,
      'show-id'
    );

    expect(link).toEqual({
      type: Adapter.ApplePodcasts,
      url: 'https://podcasts.apple.com/us/podcast/this-american-life/id201671138?uo=4',
      isVerified: expect.any(Boolean),
      notAvailable: false,
    });
  });

  it('finds the RSS feed', async () => {
    httpMock.onGet(/itunes\.apple\.com\/search/).reply(200, showSearch);

    const link = await getPodcastFeedLink(
      'This American Life',
      {
        title: 'This American Life',
        description: 'This American Life',
        type: MetadataType.Show,
      },
      Parser.Spotify,
      'show-id'
    );

    expect(link).toEqual({
      type: Adapter.PodcastFeed,
      url: 'https://www.thisamericanlife.org/podcast/rss.xml',
      isVerified: expect.any(Boolean),
      notAvailable: false,
    });
  });

  it('skips feeds for music', async () => {
    const link = await getPodcastFeedLink(
      'Kesariya',
      songMetadata,
      Parser.Spotify,
      'song-id'
    );

    expect(link).toBeNull();
  });
});

describe('Podcasts end to end', () => {
  let app: Server<undefined>;
  let searchEndpointUrl: string;
  let httpMock: HttpMock;

  beforeAll(() => {
    app = createTestApp();
    searchEndpointUrl = apiSearchEndpoint(app.url);
    httpMock = new HttpMock();
  });

  afterAll(() => {
    app.stop();
    cacheStore.reset();
    httpMock.restore();
  });

  beforeEach(() => {
    cacheStore.reset();
    httpMock.reset();
  });

  it('converts an Apple Podcasts show link with page and feed rows', async () => {
    httpMock.onGet(/itunes\.apple\.com\/lookup/).reply(200, showLookup);
    httpMock.onGet(/itunes\.apple\.com\/search/).reply(200, showSearch);

    const response = await nodeFetch(searchEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: SHOW_LINK }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.source).toBe(SHOW_LINK);
    expect(data.type).toBe('show');
    expect(data.links).toContainEqual({
      type: 'podcastFeed',
      url: 'https://www.thisamericanlife.org/podcast/rss.xml',
      isVerified: expect.any(Boolean),
      notAvailable: false,
    });
    const page = data.links.find(
      (link: { type: string }) => link.type === 'applePodcasts'
    );
    // Same-type source: the origin row echoes the input URL.
    expect(page?.url).toBe(SHOW_LINK);
  });
});
