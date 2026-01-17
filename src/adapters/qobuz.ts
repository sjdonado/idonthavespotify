import { compareTwoStrings } from 'string-similarity';

import {
  ADAPTERS_QUERY_LIMIT,
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

type QobuzAlbumItem = {
  id: string;
  title: string;
  artist: string;
  image: string;
  url: string;
  url_encoded: string;
  is_hires: boolean;
  is_dsd: boolean;
  is_dxd: boolean;
};

type QobuzArtistItem = {
  id: string | number;
  slug: string;
  name: string;
  image: string;
  albumsCount: number;
  url: string;
  url_encoded: string;
};

type QobuzTrackItem = {
  id: string | number;
  title: string;
  album: string;
  artist: string;
  image: string;
  url: string;
  url_encoded: string;
};

type QobuzSearchResponse = {
  albums: Record<string, QobuzAlbumItem> | QobuzAlbumItem[];
  artists: QobuzArtistItem[];
  tracks: QobuzTrackItem[];
  labels: [];
};

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
  );
}

export async function getQobuzLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
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
  const url = new URL(
    `${ENV.adapters.qobuz.storeUrl.replace('qobuz.com/', 'qobuz.com/v4/')}/catalog/search/autosuggest`
  );
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(Adapter.Qobuz, sourceParser, sourceId);
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

    if (!(searchType in response)) {
      throw new Error(
        `No ${searchType} node found: ${JSON.stringify(response, null, 2)}`
      );
    }

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    const evaluateMatch = (title: string, url: string, isAlbumSearch: boolean) => {
      const score = isAlbumSearch
        ? qobuzSpecificComparison(title, query)
        : compareTwoStrings(title.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Qobuz,
          url,
          isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
          notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
        };
      }
    };

    if (searchType === 'artists') {
      for (const artist of response.artists ?? []) {
        evaluateMatch(artist.name, artist.url, false);
      }
    } else if (searchType === 'albums') {
      const albums = Array.isArray(response.albums)
        ? response.albums
        : Object.values(response.albums ?? {});

      for (const album of albums) {
        evaluateMatch(`${album.title} ${album.artist}`, album.url, true);
      }
    } else {
      for (const track of response.tracks ?? []) {
        evaluateMatch(`${track.title} ${track.artist}`, track.url, false);
      }
    }

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    const match = bestMatch as SearchResultLink;

    logger.info(
      `[Qobuz] Best match score: ${highestScore.toFixed(3)} (verified: ${match.isVerified ? 'yes' : 'no'}, available: ${!match.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Qobuz, sourceParser, sourceId, match);

    return match;
  } catch (error) {
    logger.error(`[Qobuz] (${url}) ${error}`);
    return null;
  }
}
