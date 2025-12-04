import { describe, expect, it } from 'bun:test';

import { MetadataType } from '~/config/enum';
import { getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import type { SearchMetadata } from '~/services/search';

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
});
