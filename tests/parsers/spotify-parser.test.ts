import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import { cacheStore } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';

import { HttpMock } from '../utils/http-mock';

describe('Spotify Parser', () => {
  describe('getSpotifyQueryFromMetadata', () => {
    // Metadata comes from the embed JSON: plain titles and our own
    // "<artists> · <Type> · <year>" description, in any locale.
    const query = (title: string, description: string, type: MetadataType) =>
      getSpotifyQueryFromMetadata({ title, description, type, image: '' } as SearchMetadata);

    it('appends the artists for songs and albums', () => {
      expect(query('Like a Rolling Stone', 'Bob Dylan · Song · 1965', MetadataType.Song)).toBe(
        'Like a Rolling Stone Bob Dylan'
      );
      expect(
        query('La Plena - W Sound 05', 'W Sound, Beéle, Ovy On The Drums · Album', MetadataType.Album)
      ).toBe('La Plena - W Sound 05 W Sound, Beéle, Ovy On The Drums');
    });

    it('appends the show for episodes', () => {
      expect(
        query(
          'The End of Twitter as We Know It',
          'Waveform: The MKBHD Podcast · Episode · 2023',
          MetadataType.Podcast
        )
      ).toBe('The End of Twitter as We Know It Waveform: The MKBHD Podcast');
    });

    it('keeps the title alone for playlists and artists', () => {
      expect(query('This Is Bad Bunny', 'Spotify · Playlist', MetadataType.Playlist)).toBe(
        'This Is Bad Bunny'
      );
      expect(query('J. Cole', 'Top tracks · Artist', MetadataType.Artist)).toBe('J. Cole');
    });

    it('leaves the type word out when there are no artists', () => {
      expect(query('Untitled', 'Song · 2023', MetadataType.Song)).toBe('Untitled');
    });

    it('strips emoji from titles', () => {
      expect(query('lofi beats 🎧', 'Spotify · Playlist', MetadataType.Playlist)).toBe('lofi beats');
    });
  });

  describe('getSpotifyMetadata locale links', () => {
    const link = 'https://open.spotify.com/intl-de/track/3AhXZa8sUQht0UEdBJgpGc';
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

    it('resolves intl-prefixed links through the embed page', async () => {
      httpMock
        .onGet('https://open.spotify.com/embed/track/3AhXZa8sUQht0UEdBJgpGc')
        .reply(
          200,
          '<script id="__NEXT_DATA__" type="application/json">{"name":"Like a Rolling Stone","uri":"spotify:track:3AhXZa8sUQht0UEdBJgpGc","type":"track","artists":[{"name":"Bob Dylan"}],"visualIdentity":{"image":[{"url":"https://example.com/cover.jpg","maxWidth":640}]},"audioPreview":{"url":"https://example.com/preview.mp3"},"releaseDate":{"isoString":"1965-01-01T00:00:00.000Z"}}</script>'
        );

      const metadata = await getSpotifyMetadata('intl-track', link);

      expect(metadata.title).toBe('Like a Rolling Stone');
      expect(metadata.type).toBe(MetadataType.Song);
      expect(metadata.audio).toBe('https://example.com/preview.mp3');
    });

    it('resolves episode art from relatedEntityCoverArt', async () => {
      httpMock
        .onGet('https://open.spotify.com/embed/episode/6IlLXh2N2aHXJpW1DVzTwz')
        .reply(
          200,
          '<script id="__NEXT_DATA__" type="application/json">{"name":"How to Love Criticism","uri":"spotify:episode:6IlLXh2N2aHXJpW1DVzTwz","type":"episode","subtitle":"Worklife with Molly Graham","visualIdentity":{"backgroundBase":{"red":32}},"coverArt":null,"relatedEntityCoverArt":[{"url":"https://example.com/ep640.jpg","maxWidth":640},{"url":"https://example.com/ep300.jpg","maxWidth":300}],"audioPreview":{"url":"https://example.com/clip.mp3"}}</script>'
        );

      const metadata = await getSpotifyMetadata(
        'episode-id',
        'https://open.spotify.com/episode/6IlLXh2N2aHXJpW1DVzTwz'
      );

      expect(metadata.title).toBe('How to Love Criticism');
      expect(metadata.type).toBe(MetadataType.Podcast);
      expect(metadata.image).toBe('https://example.com/ep640.jpg');
      expect(metadata.audio).toBe('https://example.com/clip.mp3');
    });

    it('titles a show by the show, not its latest episode', async () => {
      httpMock
        .onGet('https://open.spotify.com/embed/show/6o81QuW22s5m2nfcXWjucc')
        .reply(
          200,
          '<script id="__NEXT_DATA__" type="application/json">{"name":"The Xiaomi Fold and New Meta VR Glasses","uri":"spotify:episode:3hwHvUW8sMcl0vGWHutIR8","type":"episode","subtitle":"Waveform: The MKBHD Podcast","visualIdentity":{"image":[{"url":"https://example.com/latest-episode.jpg","maxWidth":640}]},"relatedEntityCoverArt":[{"url":"https://example.com/show640.jpg","maxWidth":640}],"releaseDate":{"isoString":"2026-09-30T00:00:00.000Z"}}</script>'
        );

      const metadata = await getSpotifyMetadata(
        'show-id',
        'https://open.spotify.com/show/6o81QuW22s5m2nfcXWjucc'
      );

      expect(metadata).toMatchObject({
        title: 'Waveform: The MKBHD Podcast',
        description: 'Show',
        type: MetadataType.Show,
        image: 'https://example.com/show640.jpg',
      });
    });

    it('falls back to the episode name when a show embed has no subtitle', async () => {
      httpMock
        .onGet('https://open.spotify.com/embed/show/noSubtitleShow')
        .reply(
          200,
          '<script id="__NEXT_DATA__" type="application/json">{"name":"Latest Episode","uri":"spotify:episode:x","type":"episode","relatedEntityCoverArt":[{"url":"https://example.com/show640.jpg","maxWidth":640}]}</script>'
        );

      const metadata = await getSpotifyMetadata(
        'show-no-subtitle',
        'https://open.spotify.com/show/noSubtitleShow'
      );

      expect(metadata.title).toBe('Latest Episode');
    });
  });
});
