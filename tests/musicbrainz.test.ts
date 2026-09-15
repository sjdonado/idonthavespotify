import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { Adapter, MetadataType } from '~/config/enum';
import { cacheStore } from '~/services/cache';
import { resolveMusicBrainzLinks } from '~/services/musicbrainz';

import { HttpMock } from './utils/http-mock';

describe('MusicBrainz fallback', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    cacheStore.reset();
    httpMock = new HttpMock();
  });

  afterEach(() => {
    httpMock.restore();
  });

  it('fills missing adapters from streaming relations', async () => {
    httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
      recordings: [
        {
          id: 'ed0d814a-634f-413e-a810-a79523850649',
          title: 'Do Not Disturb',
          'artist-credit': [{ name: 'Drake' }],
        },
      ],
    });
    httpMock.onGet('inc=url-rels').reply(200, {
      relations: [
        { type: 'streaming', url: { resource: 'https://tidal.com/track/71717750' } },
        {
          type: 'streaming',
          url: { resource: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384' },
        },
        { type: 'streaming', url: { resource: 'https://youtu.be/zhY_0DoQCQs' } },
        {
          type: 'streaming',
          url: { resource: 'https://music.apple.com/us/album/more-life/1440891750' },
        },
        { type: 'lyrics', url: { resource: 'https://example.com/lyrics' } },
      ],
    });

    const links = await resolveMusicBrainzLinks({
      query: 'Do Not Disturb Drake',
      metadata: {
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        type: MetadataType.Song,
      },
      missing: [Adapter.Tidal, Adapter.Spotify, Adapter.YouTube, Adapter.AppleMusic],
    });

    expect(links).toEqual([
      {
        type: Adapter.Tidal,
        url: 'https://tidal.com/browse/track/71717750',
        isVerified: true,
      },
      {
        type: Adapter.Spotify,
        url: 'https://open.spotify.com/track/2KvHC9z14GSl4YpkNMX384',
        isVerified: true,
      },
      {
        type: Adapter.YouTube,
        url: 'https://music.youtube.com/watch?v=zhY_0DoQCQs',
        isVerified: true,
      },
      {
        type: Adapter.AppleMusic,
        url: 'https://geo.music.apple.com/us/album/more-life/1440891750',
        isVerified: true,
      },
    ]);
  });

  it('falls through to the next verified hit when the top one lacks relations', async () => {
    httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
      recordings: [
        {
          id: 'bare-mbid',
          title: 'Do Not Disturb',
          'artist-credit': [{ name: 'Drake' }],
        },
        {
          id: 'linked-mbid',
          title: 'Do Not Disturb',
          'artist-credit': [{ name: 'Drake' }],
        },
      ],
    });
    httpMock.onGet('bare-mbid?inc=url-rels').reply(200, { relations: [] });
    httpMock.onGet('inc=url-rels').reply(200, {
      relations: [{ type: 'streaming', url: { resource: 'https://tidal.com/track/71717750' } }],
    });

    const links = await resolveMusicBrainzLinks({
      query: 'Do Not Disturb Drake',
      metadata: {
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        type: MetadataType.Song,
      },
      missing: [Adapter.Tidal],
    });

    expect(links).toEqual([
      {
        type: Adapter.Tidal,
        url: 'https://tidal.com/browse/track/71717750',
        isVerified: true,
      },
    ]);
  });

  it('skips unsupported types without upstream calls', async () => {
    const links = await resolveMusicBrainzLinks({
      query: 'Some Playlist',
      metadata: { title: 'Some Playlist', description: 'Playlist', type: MetadataType.Playlist },
      missing: [Adapter.Tidal],
    });

    expect(links).toEqual([]);
  });

  it('skips weak matches', async () => {
    httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
      recordings: [
        {
          id: 'other-mbid',
          title: 'Hotline Bling',
          'artist-credit': [{ name: 'Drake' }],
        },
      ],
    });

    const links = await resolveMusicBrainzLinks({
      query: 'Do Not Disturb Drake',
      metadata: {
        title: 'Do Not Disturb',
        description: 'Drake · Song · 2017',
        type: MetadataType.Song,
      },
      missing: [Adapter.Tidal],
    });

    expect(links).toEqual([]);
  });
});
