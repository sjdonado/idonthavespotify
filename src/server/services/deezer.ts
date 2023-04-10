import { SpotifyContentLink, SpotifyContentLinkType, SpotifyMetadataType } from '~/@types/global';

import * as ENV from '~/config/env/server';

import { SpotifyMetadata } from '~/server/services/spotify';

import { getQueryFromMetadata } from '~/utils/query';
import { compareResponseWithQuery } from '~/utils/compare';

interface DeezerSearchResponse {
  total: number;
  data: [{
    title?: string,
    name?: string,
    link: string,
  }];
}

export const getDeezerLink = async (metadata: SpotifyMetadata): Promise<SpotifyContentLink | undefined> => {
  const query = getQueryFromMetadata(metadata);

  const searchTypes = {
    [SpotifyMetadataType.Song]: 'track',
    [SpotifyMetadataType.Album]: 'album',
    [SpotifyMetadataType.Playlist]: 'playlist',
    [SpotifyMetadataType.Artist]: 'artist',
    [SpotifyMetadataType.Podcast]: 'podcast',
    [SpotifyMetadataType.Show]: 'radio',
  };

  const url = `${ENV.services.deezer.apiUrl}/${searchTypes[metadata.type]}?q=${query}&limit=1`;
  const response = (await fetch(url).then((res) => res.json()) as DeezerSearchResponse);

  if (response.total === 0) {
    console.error('[Deezer] No results found', url);
    return undefined;
  }

  const [{ title, name, link }] = response.data;

  if (compareResponseWithQuery(title ?? name ?? '', query)) {
    return undefined;
  }

  return {
    type: SpotifyContentLinkType.Deezer,
    url: link,
    isVerified: true,
  };
};
