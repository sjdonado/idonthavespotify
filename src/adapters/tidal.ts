import * as config from '~/config/default';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export function getTidalLink(query: string) {
  const url = `${config.services.tidal.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.Tidal, url } as SpotifyContentLink;
}
