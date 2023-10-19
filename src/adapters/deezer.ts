import axios from 'axios';

import * as config from '~/config/default';

import { logger } from '~/utils/logger';
import { responseMatchesQuery } from '~/utils/compare';
import { getQueryFromMetadata } from '~/utils/query';

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

export async function getDeezerLink(
  metadata: SpotifyMetadata
): Promise<SpotifyContentLink | undefined> {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);

  const searchTypes = {
    [SpotifyMetadataType.Song]: '/track',
    [SpotifyMetadataType.Album]: '/album',
    [SpotifyMetadataType.Playlist]: '/playlist',
    [SpotifyMetadataType.Artist]: '/artist',
    [SpotifyMetadataType.Show]: '/podcast',
    [SpotifyMetadataType.Podcast]: '',
  };

  const url = `${config.services.deezer.apiUrl}${
    searchTypes[metadata.type]
  }?q=${query}&limit=1`;

  try {
    const response = (await axios.get(url)).data as DeezerSearchResponse;

    if (response.total === 0) {
      logger.error('[Deezer] No results found', url);
      return undefined;
    }

    const [{ title, name, link }] = response.data;

    if (!responseMatchesQuery(title ?? name ?? '', query)) {
      return undefined;
    }

    return {
      type: SpotifyContentLinkType.Deezer,
      url: link,
      isVerified: true,
    };
  } catch (error) {
    logger.error(`[Deezer] (${query}) ${error}`);
    return undefined;
  }
}
