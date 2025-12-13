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

interface BandcampAlbumSearchResponse {
		"type": "a",
		"id": number,
		"art_id": number | null,
		"img_id": number | null,
		"name": string,
		"band_id": number,
		"band_name": string,
		"item_url_root": URL,
		"item_url_path": URL,
		"img": URL,
		"tag_names": string[] | null,
		"stat_params": string,
};

interface BandcampArtistSearchResponse {
    "type": "b",
    "id": number,
    "art_id": number | null,
    "img_id": number | null,
    "name": string,
    "item_url_root": URL,
    "location": string,
    "is_label": boolean,
    "tag_names": string[] | null,
    "img": URL,
    "genre_name": string,
    "stat_params": string,
};

interface BandcampTrackSearchResponse {
		"type": "t",
		"id": number,
		"art_id": number | null,
		"img_id": number | null,
		"name": string,
		"band_id": number,
		"band_name": string,
		"album_name": string,
		"item_url_root": URL,
		"item_url_path": URL,
		"img": URL,
		"album_id": number,
		"stat_params": string,
};

type BandcampTypedSearchResponse = BandcampAlbumSearchResponse | BandcampArtistSearchResponse | BandcampTrackSearchResponse;

type BandcampSearchResponse = {
  auto: {
    results: BandcampTypedSearchResponse[];
    stat_params_for_tag: string,
    time_ms: number,
  },
  tag: {
    matches: [],
    count: number,
    time_ms: number,
  },
  genre: {},
}
type BandcampSearchFilters = 'a' | 'b' | 't';

const BANDCAMP_SEARCH_TYPES = {
  [MetadataType.Song]: 't' as BandcampSearchFilters,
  [MetadataType.Album]: 'a' as BandcampSearchFilters,
  [MetadataType.Playlist]: undefined,
  [MetadataType.Artist]: 'b' as BandcampSearchFilters,
  [MetadataType.Show]: undefined,
  [MetadataType.Podcast]: undefined,
};

interface BandcampSearchParams {
    search_text: string,
    search_filter: BandcampSearchFilters,
    full_page: false,
    fan_id: null,
};

function BandcampQueryMatcher(i: BandcampTypedSearchResponse): [string, string] {
  let q = '';
  let u = new URL(ENV.adapters.bandcamp.baseUrl);

  if (i.type === 'a' || i.type === 't') {
    // Album and Track queries are ${album} ${artist}
    q = `${i.name} ${i.band_name}`;

    u = i.item_url_path;
  }

  if (i.type === 'b') {
    // Artist query is just ${artist}
    q = i.name;

    u = i.item_url_root;
  }

  return [q, u.toString()];
}

export async function getBandcampLink(query: string, metadata: SearchMetadata) {
  const searchType = BANDCAMP_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const params: BandcampSearchParams = {
    search_text: query,
    search_filter: searchType,
    full_page: false,
    fan_id: null,
  };

  // Our relevant URL for the API needs its params as the body of a POST
  // So caching just the URL won't contain the unique query information
  // Here we'll make a fake unique URL for the purposes of the cache ID
  const cacheurl = new URL(ENV.adapters.bandcamp.baseUrl); // `base` is considerably shorter than the API URL
  cacheurl.search = new URLSearchParams({q:query,t:searchType as string}).toString();

  const cache = await getCachedSearchResultLink(cacheurl);
  if (cache) {
    logger.info(`[Bandcamp] (${cacheurl}) cache hit`);
    return cache;
  }

  const url = new URL(ENV.adapters.bandcamp.apiUrl);
  const body = JSON.stringify(params);

  try {
    const response = await HttpClient.post<BandcampSearchResponse>(
      url.toString(),
      body,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.hasOwnProperty('auto') && !response.auto.hasOwnProperty('results')) {
      throw new Error(`Unexpected API response: ${JSON.stringify(response)}`);
    }

    if (response.auto.results.length < 1) {
      throw new Error(`No results found for query: ${JSON.stringify(body)}`);
    }

    let _results = response.auto.results;

    // Bandcamp mixes artists and labels in their results....
    // Before we slice to our query limit, make sure to filter out Labels from an Artist search
    if (searchType === 'b') {
      _results = (_results as BandcampArtistSearchResponse[]).filter((r) => r.is_label === false);
    }

    const results = _results.length > ADAPTERS_QUERY_LIMIT ? _results.slice(0, ADAPTERS_QUERY_LIMIT) : _results;

    let bestMatch: SearchResultLink | null = null;
    let highestScore = 0;

    for (const item of results) {
      const [matchedTitle, matchedUrl] = BandcampQueryMatcher(item);
      const score = compareTwoStrings(matchedTitle.toLowerCase(), query.toLowerCase());

      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          type: Adapter.Bandcamp,
          url: matchedUrl,
          isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
          notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
        };
      }
    }

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Bandcamp] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(url, bestMatch);

    return bestMatch;
  } catch (error) {
    logger.error(`[Bandcamp API] ${error}`);
    return null;
  }
}
