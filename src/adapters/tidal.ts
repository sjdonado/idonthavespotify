import * as config from '~/config/default';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export function getTidalLink(query: string) {
  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${config.services.tidal.baseUrl}/search`);
  url.search = params.toString();

  return {
    type: SpotifyContentLinkType.Tidal,
    url: url.toString(),
  } as SpotifyContentLink;
}
