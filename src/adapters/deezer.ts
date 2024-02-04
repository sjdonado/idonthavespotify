import * as config from '~/config/default';
import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { responseMatchesQuery } from '~/utils/compare';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

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
  [SpotifyMetadataType.Song]: 'track',
  [SpotifyMetadataType.Album]: 'album',
  [SpotifyMetadataType.Playlist]: 'playlist',
  [SpotifyMetadataType.Artist]: 'artist',
  [SpotifyMetadataType.Show]: 'podcast',
  [SpotifyMetadataType.Podcast]: undefined,
};

export async function getDeezerLink(query: string, metadata: SpotifyMetadata) {
  const searchType = DEEZER_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return;
  }

  const params = new URLSearchParams({
    q: query,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(`${config.services.deezer.apiUrl}/${searchType}`);
  url.search = params.toString();

  try {
    const response = await HttpClient.get<DeezerSearchResponse>(url.toString());

    if (response.total === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const [{ title, name, link }] = response.data;

    if (!responseMatchesQuery(title ?? name ?? '', query)) {
      throw new Error(`Query does not match: ${JSON.stringify({ title, name })}`);
    }

    return {
      type: SpotifyContentLinkType.Deezer,
      url: link,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (error) {
    logger.error(`[Deezer] (${url}) ${error}`);
  }
}
