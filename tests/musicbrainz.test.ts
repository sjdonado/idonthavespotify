import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';

import { Adapter, MetadataType } from '~/config/enum';
import { cacheStore } from '~/services/cache';
import { resolveMusicBrainzLinks } from '~/services/musicbrainz';
import HttpClient from '~/utils/http-client';
import { getServiceGuard } from '~/utils/service-guard';

import { HttpMock } from './utils/http-mock';

describe('MusicBrainz fallback', () => {
  let httpMock: HttpMock;

  beforeEach(() => {
    cacheStore.reset();
    httpMock = new HttpMock();
  });

  afterEach(() => {
    httpMock.restore();
    mock.restore();
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

  it('checks every returned hit for relations', async () => {
    // Same-title hits score ties, so the linked recording can sit deep
    // in the list; only the first three used to be checked.
    httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
      recordings: [
        { id: 'bare-1', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] },
        { id: 'bare-2', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] },
        { id: 'bare-3', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] },
        { id: 'bare-4', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] },
        {
          id: 'rich-mbid',
          title: 'Wake Me Up',
          'artist-credit': [{ name: 'Avicii' }],
        },
      ],
    });
    httpMock.onGet('rich-mbid?inc=url-rels').reply(200, {
      relations: [
        { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
      ],
    });
    httpMock.onGet('inc=url-rels').reply(200, { relations: [] });

    const links = await resolveMusicBrainzLinks({
      query: 'Wake Me Up Avicii',
      metadata: {
        title: 'Wake Me Up',
        description: 'Avicii · Song · 2013',
        type: MetadataType.Song,
      },
      missing: [Adapter.Tidal],
    });

    expect(links).toEqual([
      {
        type: Adapter.Tidal,
        url: 'https://tidal.com/browse/track/182603678',
        isVerified: true,
      },
    ]);
  });

  describe('ISRC first', () => {
    const song = {
      title: 'Wake Me Up',
      description: 'Avicii · Song · 2013',
      type: MetadataType.Song,
    };
    const requested = () =>
      (HttpClient.get as unknown as { mock: { calls: unknown[][] } }).mock.calls.map(
        call => call[0] as string
      );

    it('resolves from the ISRC recordings without a title search', async () => {
      httpMock.onGet('musicbrainz.org/ws/2/isrc/SEUM71301326').reply(200, {
        recordings: [
          { id: 'a', relations: [] },
          {
            id: 'b437fbda-9c32-4078-afa2-1afb98ff0d74',
            relations: [
              { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
            ],
          },
        ],
      });

      const links = await resolveMusicBrainzLinks({
        query: 'Wake Me Up Avicii',
        metadata: song,
        missing: [Adapter.Tidal, Adapter.ApplePodcasts, Adapter.PodcastFeed],
        isrc: 'SEUM71301326',
      });

      expect(links).toEqual([
        { type: Adapter.Tidal, url: 'https://tidal.com/browse/track/182603678', isVerified: true },
      ]);
      expect(requested()).toHaveLength(1);
      expect(requested()[0]).toContain('/isrc/SEUM71301326?inc=url-rels');
    });

    it('falls back to the title search when the ISRC is unknown', async () => {
      const recordFailure = spyOn(getServiceGuard('musicBrainz'), 'recordFailure');
      httpMock.onGet('musicbrainz.org/ws/2/isrc/').reply(404, { error: 'Not Found' });
      httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
        recordings: [{ id: 'rec-1', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] }],
      });
      httpMock.onGet('/recording/rec-1?inc=url-rels').reply(200, {
        relations: [
          { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
        ],
      });

      const links = await resolveMusicBrainzLinks({
        query: 'Wake Me Up Avicii',
        metadata: song,
        missing: [Adapter.Tidal],
        isrc: 'XX0000000000',
      });

      expect(links.map(link => link.type)).toEqual([Adapter.Tidal]);
      expect(recordFailure).not.toHaveBeenCalled();
    });

    it('keeps the title search when the ISRC request fails', async () => {
      const recordFailure = spyOn(getServiceGuard('musicBrainz'), 'recordFailure');
      httpMock.onGet('musicbrainz.org/ws/2/isrc/').reply(503, { error: 'rate limited' });
      httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
        recordings: [{ id: 'rec-1', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] }],
      });
      httpMock.onGet('/recording/rec-1?inc=url-rels').reply(200, {
        relations: [
          { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
        ],
      });

      const links = await resolveMusicBrainzLinks({
        query: 'Wake Me Up Avicii',
        metadata: song,
        missing: [Adapter.Tidal],
        isrc: 'SEUM71301326',
      });

      expect(links.map(link => link.type)).toEqual([Adapter.Tidal]);
      expect(recordFailure).toHaveBeenCalledTimes(1);
    });

    it('runs the title search only for what the ISRC left missing', async () => {
      httpMock.onGet('musicbrainz.org/ws/2/isrc/SEUM71301326').reply(200, {
        recordings: [
          {
            id: 'b437',
            relations: [
              { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
            ],
          },
        ],
      });
      httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
        recordings: [{ id: 'rec-1', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] }],
      });
      httpMock.onGet('/recording/rec-1?inc=url-rels').reply(200, {
        relations: [
          { type: 'streaming', url: { resource: 'https://tidal.com/track/999' } },
          { type: 'streaming', url: { resource: 'https://www.qobuz.com/us-en/album/x/abc' } },
        ],
      });

      const links = await resolveMusicBrainzLinks({
        query: 'Wake Me Up Avicii',
        metadata: song,
        missing: [Adapter.Tidal, Adapter.Qobuz],
        isrc: 'SEUM71301326',
      });

      // The ISRC's Tidal link wins; the title search only adds Qobuz.
      expect(links).toEqual([
        { type: Adapter.Tidal, url: 'https://tidal.com/browse/track/182603678', isVerified: true },
        { type: Adapter.Qobuz, url: 'https://www.qobuz.com/us-en/album/x/abc', isVerified: true },
      ]);
    });

    it('stops title-search lookups once the budget is spent', async () => {
      httpMock.onGet('musicbrainz.org/ws/2/recording/?query=').reply(200, {
        recordings: [{ id: 'rec-1', title: 'Wake Me Up', 'artist-credit': [{ name: 'Avicii' }] }],
      });
      httpMock.onGet('/recording/rec-1?inc=url-rels').reply(200, {
        relations: [
          { type: 'streaming', url: { resource: 'https://tidal.com/track/182603678' } },
        ],
      });

      const links = await resolveMusicBrainzLinks({
        query: 'Wake Me Up Avicii',
        metadata: song,
        missing: [Adapter.Tidal],
        budgetMs: 0,
      });

      expect(links).toEqual([]);
      expect(requested().some(url => url.includes('inc=url-rels'))).toBe(false);
    });
  });
});
