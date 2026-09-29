import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { MetadataType, Parser } from '~/config/enum';
import {
  getApplePodcastsMetadata,
  getApplePodcastsQueryFromMetadata,
  parseApplePodcastsLink,
} from '~/parsers/apple-podcasts';
import { getSearchParser } from '~/parsers/link';
import { cacheStore } from '~/services/cache';

import { HttpMock } from '../utils/http-mock';

const SHOW_LINK =
  'https://podcasts.apple.com/us/podcast/this-american-life/id201671138';
const EPISODE_LINK =
  'https://podcasts.apple.com/us/podcast/an-argument/id201671138?i=1000791700308';

const showLookup = {
  resultCount: 1,
  results: [
    {
      wrapperType: 'collection',
      collectionName: 'This American Life',
      artistName: 'This American Life',
      collectionViewUrl:
        'https://podcasts.apple.com/us/podcast/this-american-life/id201671138?uo=4',
      artworkUrl100: 'https://example.com/art100.jpg',
      artworkUrl600: 'https://example.com/art600.jpg',
    },
  ],
};

const episodeLookup = {
  resultCount: 2,
  results: [
    {
      wrapperType: 'collection',
      collectionName: 'This American Life',
    },
    {
      kind: 'podcast-episode',
      trackId: 1000791700308,
      trackName: 'An Argument',
      collectionName: 'This American Life',
      feedUrl: 'https://www.thisamericanlife.org/podcast/rss.xml',
      trackViewUrl:
        'https://podcasts.apple.com/us/podcast/an-argument/id201671138?i=1000791700308&uo=4',
      artworkUrl100: 'https://example.com/art100.jpg',
    },
  ],
};

describe('Apple Podcasts link parser', () => {
  it('extracts show ids and episode ids', () => {
    expect(parseApplePodcastsLink(SHOW_LINK)).toEqual({
      showId: '201671138',
      episodeId: undefined,
    });
    expect(parseApplePodcastsLink(EPISODE_LINK)).toEqual({
      showId: '201671138',
      episodeId: '1000791700308',
    });
    expect(parseApplePodcastsLink('https://podcasts.apple.com/us/podcast/id201671138')).toEqual({
      showId: '201671138',
      episodeId: undefined,
    });
    expect(parseApplePodcastsLink('https://music.apple.com/us/album/x/123')).toBeNull();
  });

  it('routes show and episode links to the ApplePodcasts parser', () => {
    expect(getSearchParser(SHOW_LINK)).toMatchObject({
      type: Parser.ApplePodcasts,
      id: '201671138',
    });
    expect(getSearchParser(EPISODE_LINK)).toMatchObject({
      type: Parser.ApplePodcasts,
      id: '1000791700308',
    });
  });
});

describe('Apple Podcasts metadata', () => {
  let httpMock: HttpMock;

  beforeAll(() => {
    httpMock = new HttpMock();
  });

  afterAll(() => {
    cacheStore.reset();
    httpMock.restore();
  });

  it('parses show details', async () => {
    httpMock.onGet(/lookup/).reply(200, showLookup);

    const metadata = await getApplePodcastsMetadata('201671138', SHOW_LINK);

    expect(metadata).toEqual({
      title: 'This American Life',
      description: 'This American Life',
      type: MetadataType.Show,
      image: 'https://example.com/art600.jpg',
    });
    expect(getApplePodcastsQueryFromMetadata(metadata)).toBe('This American Life');
    httpMock.reset();
  });

  it('parses episode details', async () => {
    httpMock.onGet(/lookup/).reply(200, episodeLookup);

    const metadata = await getApplePodcastsMetadata('1000791700308', EPISODE_LINK);

    expect(metadata).toEqual({
      title: 'An Argument This American Life',
      description: 'This American Life',
      type: MetadataType.Podcast,
      image: 'https://example.com/art100.jpg',
    });
    httpMock.reset();
  });
});
