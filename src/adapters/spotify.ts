import { compareTwoStrings } from 'string-similarity';

import {
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

const SPOTIFY_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'show',
  [MetadataType.Podcast]: 'episode',
};

export async function getSpotifyLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const searchType = SPOTIFY_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const searchQuery = `site:open.spotify.com/${searchType} ${query}`;
  const params = new URLSearchParams({ q: searchQuery });

  const url = new URL(ENV.adapters.spotify.searchUrl);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(Adapter.Spotify, sourceParser, sourceId);
  if (cache) {
    logger.info(`[Spotify] (${url}) cache hit`);
    return cache;
  }

  try {
    const html = await HttpClient.get<string>(url.toString());
    const doc = getCheerioDoc(html);

    const resultLinks = doc('a.result__a');

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    resultLinks.each((_, el) => {
      let href = doc(el).attr('href') ?? '';
      const title = doc(el).text().trim();

      // Handle DuckDuckGo redirect URLs
      if (href.includes('duckduckgo.com/l/?uddg=')) {
        try {
          const uddg = new URL(`https:${href}`).searchParams.get('uddg');
          if (uddg) href = decodeURIComponent(uddg);
        } catch {
          return;
        }
      }

      // Filter to only matching Spotify type paths
      if (!href.includes(`open.spotify.com/${searchType}/`)) return;

      // Clean title: remove Spotify suffixes like " - song and lyrics by Artist | Spotify"
      const cleanedTitle = title
        .replace(/\s*[-–—]\s*(song and lyrics by|album by|playlist by).*$/i, '')
        .replace(/\s*\|\s*Spotify\s*$/i, '')
        .trim();

      const score = compareTwoStrings(cleanedTitle.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Spotify,
          url: href,
          isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
          notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
        };
      }
    });

    if (!bestMatch) {
      throw new Error('No matching Spotify results found');
    }

    logger.info(
      `[Spotify] Best match score: ${highestScore.toFixed(3)} (verified: ${(bestMatch as SearchResultLink).isVerified ? 'yes' : 'no'}, available: ${!(bestMatch as SearchResultLink).notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Spotify, sourceParser, sourceId, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Spotify] (${url}) ${error}`);
    return null;
  }
}
