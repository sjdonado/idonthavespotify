import { ENV } from '~/config/env';
import { Adapter } from '~/config/enum';

import { SearchResultLink } from '~/services/search';

export function getTidalLink(query: string) {
  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${ENV.adapters.tidal.baseUrl}/search`);
  url.search = params.toString();

  return {
    type: Adapter.Tidal,
    url: url.toString(),
  } as SearchResultLink;
}
