import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import { SearchMetadata, SearchResultLink } from '~/services/search';
import { responseMatchesQuery } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface DeezerSearchResponse {
  total: number;
  data: [
    {
      title?: string;
      name?: string;
      link: string;
    },
  ];
}

const DEEZER_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'podcast',
  [MetadataType.Podcast]: undefined,
};

export async function getDeezerLink(query: string, metadata: SearchMetadata) {
  const searchType = DEEZER_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return null;
  }

  const params = new URLSearchParams({
    q: query,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(`${ENV.adapters.deezer.apiUrl}/${searchType}`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[Deezer] (${url}) cache hit`);
    return cache;
  }

  try {
    const response = await HttpClient.get<DeezerSearchResponse>(url.toString());

    if (response.total === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const [{ title, name, link }] = response.data;

    const searchResultLink = {
      type: Adapter.Deezer,
      url: link,
      isVerified: responseMatchesQuery(title ?? name ?? '', query),
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (error) {
    logger.error(`[Deezer] (${url}) ${error}`);
    return null;
  }
}
