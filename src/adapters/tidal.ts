import * as config from '~/config/default';

import { getQueryFromMetadata } from '~/utils/query';

import { SpotifyMetadata } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const getTidalLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);
  const url = `${config.services.tidal.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.Tidal, url } as SpotifyContentLink;
};
