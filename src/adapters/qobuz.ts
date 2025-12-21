import { compareTwoStrings } from 'string-similarity';

import {
  ADAPTERS_QUERY_LIMIT,
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface QobuzSearchResponse {
  [index: string]: Array<any>,
  albums: Array<QobuzSearchResponseAlbum>,
  artists: Array<QobuzSearchResponseArtist>,
  tracks: Array<QobuzSearchResponseTrack>,
  labels: [],
}

type QobuzSearchResponseAlbum = {
  [index: string]: {
    id: string,
    title: string,
    artist: string,
    image: string,
    url: string,
    url_encoded: string,
    is_hires: boolean,
    is_dsd: boolean,
    is_dxd: boolean,
  }
}

type QobuzSearchResponseArtist = {
  [index: number]: {
    id: string | number,
    slug: string,
    name: string,
    image: string,
    albumsCount: number,
    url: string,
    url_encoded: string,
  }
}

type QobuzSearchResponseTrack = {
  [index: number]: {
    id: string | number,
    title: string,
    album: string,
    artist: string,
    image: string,
    url: string,
    url_encoded: string,
  }
}

const QOBUZ_SEARCH_TYPES = {
  [MetadataType.Song]: 'tracks',
  [MetadataType.Album]: 'albums',
  [MetadataType.Playlist]: undefined,
  [MetadataType.Artist]: 'artists',
  [MetadataType.Show]: undefined,
  [MetadataType.Podcast]: undefined,
};

function qobuzSpecificComparison(title: string, query: string): number {
  return compareTwoStrings(
    // Strip commas here because we aggressively stripped them when creating the query
    title.toLowerCase().replace(',', ''),
    query.toLowerCase()
  )
}

export async function getQobuzLink(query: string, metadata: SearchMetadata) {
  const searchType = QOBUZ_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params = new URLSearchParams({
    q: query,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  // We need to convert from (e.g.):
  //   https://www.qobuz.com/us-en
  // to:
  //   https://www.qobuz.com/v4/us-en/catalog/search/autosuggest
  const url = new URL(`${ENV.adapters.qobuz.storeUrl.replace('qobuz.com/', 'qobuz.com/v4/')}/catalog/search/autosuggest`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[Qobuz] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<QobuzSearchResponse>(url.toString(), {
      headers: {
        // The request will 404 without this header
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    if (!response.hasOwnProperty(searchType)) {
      throw new Error(`No ${searchType} node found: ${JSON.stringify(response, null, 2)}`);
    }

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    let items;
    if (response[searchType].length) {
      // The response node is already an iterable array of possible matches (artists, tracks)
      items = response[searchType];
    } else {
      // The response is one or more keyed objects, but the keys are as-yet-unknown IDs (albums)
      items = Object.values(response[searchType]);
    }

    for (const item of items) {
      // NOTE: Albums and Tracks have `title` keys, while Artists have `name` keys

      // The query we're matching against for albums and tracks is: "{Album|Track Title} {Artist}"
      // so we can boost our match chances by mirroring that format here
      // (this also helps greatly with self-titled albums)
      const title = (searchType === 'artists') ? item.name : `${item.title} ${item.artist}`;

      const score = searchType === 'albums' ? qobuzSpecificComparison(title, query) : compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Qobuz,
          url: item.url,
          isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
          notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
        };
      }
    }

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Qobuz] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(url, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Qobuz] (${url}) ${error}`);
    return null;
  }
}
