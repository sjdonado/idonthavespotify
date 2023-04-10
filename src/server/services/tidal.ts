import { SpotifyContentLink, SpotifyContentLinkType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';

export const getTidalLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);
  const url = `${ENV.services.tidal.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.Tidal, url } as SpotifyContentLink;
};
