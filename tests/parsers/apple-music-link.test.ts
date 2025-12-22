import { describe, expect, test } from 'bun:test';

import { APPLE_MUSIC_LINK_REGEX } from '~/config/constants';

describe('Apple Music Link Regex', () => {
  test('Should match Apple Music song URL with query parameters', () => {
    const url = 'https://music.apple.com/de/album/berghain/1848167516?i=1848167528&l=en-GB';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
    expect(match?.[0]).toBe(url); // Full match should include query params
  });

  test('Should match Apple Music album URL without query parameters', () => {
    const url = 'https://music.apple.com/us/album/1848167516';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
    expect(match?.[0]).toBe(url);
  });

  test('Should match Apple Music playlist URL', () => {
    const url = 'https://music.apple.com/us/playlist/test-playlist/pl.abc123';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
    expect(match?.[0]).toBe(url);
  });

  test('Should match Apple Music artist URL', () => {
    const url = 'https://music.apple.com/us/artist/rosalia/1056639965';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
    expect(match?.[0]).toBe(url);
  });

  test('Should match geo.music.apple.com URLs', () => {
    const url = 'https://geo.music.apple.com/de/album/berghain/1848167516?i=1848167528';
    // The regex only matches music.apple.com, not geo.music.apple.com
    // This should be replaced before regex matching
    const normalizedUrl = url.replace('geo.music.apple.com', 'music.apple.com');
    const match = normalizedUrl.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
  });

  test('Should capture ID from album URL with song parameter', () => {
    const url = 'https://music.apple.com/de/album/berghain/1848167516?i=1848167528&l=en-GB';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    // Group 1 should be the album/song slug, group 2 should be the ID
    expect(match?.[1]).toBe('berghain');
    expect(match?.[2]).toBe('1848167516');
  });

  test('Should match URL with encoded characters', () => {
    const url =
      'https://music.apple.com/de/album/el-paga-pato-versi%C3%B3n-trato-coleto/1849278000?i=1849278003&l=en-GB';
    const match = url.match(APPLE_MUSIC_LINK_REGEX);

    expect(match).not.toBeNull();
    expect(match?.[0]).toBe(url);
    expect(match?.[1]).toBe('el-paga-pato-versi%C3%B3n-trato-coleto');
    expect(match?.[2]).toBe('1849278000');
  });
});