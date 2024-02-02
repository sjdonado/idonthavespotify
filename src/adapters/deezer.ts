import * as config from '~/config/default';

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
  [SpotifyMetadataType.Song]: '/track',
  [SpotifyMetadataType.Album]: '/album',
  [SpotifyMetadataType.Playlist]: '/playlist',
  [SpotifyMetadataType.Artist]: '/artist',
  [SpotifyMetadataType.Show]: '/podcast',
  [SpotifyMetadataType.Podcast]: '',
};

export async function getDeezerLink(query: string, metadata: SpotifyMetadata) {
  const params = new URLSearchParams({
    q: query,
    type: DEEZER_SEARCH_TYPES[metadata.type],
    limit: '1',
  });

  const url = new URL(config.services.deezer.apiUrl);
  url.search = params.toString();

  try {
    const response = await HttpClient.get<DeezerSearchResponse>(url.toString());

    if (response.total === 0) {
      logger.error('[Deezer] No results found', url);
      return;
    }

    const [{ title, name, link }] = response.data;

    if (!responseMatchesQuery(title ?? name ?? '', query)) {
      return;
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
