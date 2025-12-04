import { describe, expect, test } from 'bun:test';

import { Parser } from '~/config/enum';
import { getSearchParser } from '~/parsers/link';

describe('Apple Music Link Parser', () => {
  test('Should preserve query parameters in source', () => {
    const link = 'https://music.apple.com/de/album/berghain/1848167516?i=1848167528&l=en-GB';
    const result = getSearchParser(link);

    expect(result.type).toBe(Parser.AppleMusic);
    expect(result.id).toBe('1848167516');
    expect(result.source).toBe(link); // Full URL with query params
    expect(result.source).toContain('?i=1848167528');
    expect(result.source).toContain('&l=en-GB');
  });

  test('Should work with album URL without query params', () => {
    const link = 'https://music.apple.com/us/album/1848167516';
    const result = getSearchParser(link);

    expect(result.type).toBe(Parser.AppleMusic);
    expect(result.id).toBe('1848167516');
    expect(result.source).toBe(link);
  });

  test('Should handle geo.music.apple.com URLs (after normalization)', () => {
    const link = 'https://music.apple.com/de/album/berghain/1848167516?i=1848167528';
    const result = getSearchParser(link);

    expect(result.type).toBe(Parser.AppleMusic);
    expect(result.source).toContain('?i=1848167528');
  });

  test('Should extract correct ID from URL with song parameter', () => {
    const link = 'https://music.apple.com/de/album/berghain/1848167516?i=1848167528';
    const result = getSearchParser(link);

    // ID should be the album ID (1848167516), not the song parameter
    expect(result.id).toBe('1848167516');
  });
});
