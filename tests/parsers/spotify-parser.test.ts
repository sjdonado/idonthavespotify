import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import { cacheStore } from '~/services/cache';
import type { SearchMetadata } from '~/services/search';

import { HttpMock } from '../utils/http-mock';

describe('Spotify Parser', () => {
  describe('getSpotifyQueryFromMetadata', () => {
    it('should parse title with "Album by Artist"', () => {
      const metadata: SearchMetadata = {

        title: 'Light hit my face like a straight right - Album by Mallrat | Spotify',
        description: 'Mallrat · Song · 2022',
        type: MetadataType.Song,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('Light hit my face like a straight right Mallrat');
    });

    it('should parse title with "song and lyrics by Artist"', () => {
      const metadata: SearchMetadata = {

        title: 'Like a Rolling Stone - song and lyrics by Bob Dylan | Spotify',
        description: 'Bob Dylan · Song · 1965',
        type: MetadataType.Song,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('Like a Rolling Stone Bob Dylan');
    });

    it('should parse title with multiple artists and dashes in title', () => {
      const metadata: SearchMetadata = {

        title: 'La Plena - W Sound 05 - song and lyrics by W Sound, Beéle, Ovy On The Drums | Spotify',
        description: 'W Sound, Beéle, Ovy On The Drums · Song',
        type: MetadataType.Song,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('La Plena W Sound, Beéle, Ovy On The Drums');
    });

    it('should parse German title with "Album von Artist"', () => {
      const metadata: SearchMetadata = {

        title: 'Light hit my face like a straight right – Album von Mallrat | Spotify',
        description: 'Mallrat · Song · 2022',
        type: MetadataType.Song,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('Light hit my face like a straight right Mallrat');
    });

    it('should parse Spanish title with "de Artist"', () => {
      const metadata: SearchMetadata = {

        title: 'Canción Animal - Remasterizado 2007 de Soda Stereo | Spotify',
        description: 'Soda Stereo · Album',
        type: MetadataType.Album,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('Canción Animal Soda Stereo');
    });

    it('should handle titles with no artist information', () => {
      const metadata: SearchMetadata = {

        title: 'lofi beats | Spotify',
        description: 'A lofi playlist',
        type: MetadataType.Playlist,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('lofi beats');
    });

    it('should extract artist from description when not in title', () => {
      const metadata: SearchMetadata = {

        title: 'My Awesome Song | Spotify',
        description: 'My Artist · Song · 2023',
        type: MetadataType.Song,
        image: '',
      };
      const query = getSpotifyQueryFromMetadata(metadata);
      expect(query).toBe('My Awesome Song My Artist');
    });
  });

  describe('getSpotifyMetadata oEmbed fallback', () => {
    const link = 'https://open.spotify.com/track/3AhXZa8sUQht0UEdBJgpGc';
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

    it('falls back to oEmbed when the page has no OG tags', async () => {
      httpMock.onGet(link).reply(200, '<html><body>bot wall</body></html>');
      httpMock.onGet('open.spotify.com/oembed').reply(200, {
        title: 'Like a Rolling Stone',
        thumbnail_url: 'https://image-cdn-fa.spotifycdn.com/image/abc123',
      });

      const metadata = await getSpotifyMetadata('oembed-fallback-track', link);

      expect(metadata).toEqual({
        title: 'Like a Rolling Stone',
        description: 'Like a Rolling Stone',
        type: MetadataType.Song,
        image: 'https://image-cdn-fa.spotifycdn.com/image/abc123',
        audio: undefined,
      });
    });

    it('keeps the original error when oEmbed is unusable too', async () => {
      httpMock.onGet(link).reply(200, '<html><body>bot wall</body></html>');
      httpMock.onGet('open.spotify.com/oembed').reply(200, {});

      await expect(getSpotifyMetadata('oembed-fallback-broken', link)).rejects.toThrow(
        'Spotify metadata not found'
      );
    });
  });
});
