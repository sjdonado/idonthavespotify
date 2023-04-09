import { SpotifyContentLink, SpotifyContentLinkType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';

export const getTidalLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${ENV.services.tidal.baseUrl}${encodeURIComponent(query)}`;

  return { type: SpotifyContentLinkType.Tidal, url } as SpotifyContentLink;
};
