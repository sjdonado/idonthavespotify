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
  });
});
