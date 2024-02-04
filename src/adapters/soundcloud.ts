import * as config from '~/config/default';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const getSoundCloudLink = (query: string) => {
  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${config.services.soundCloud.baseUrl}/search/sounds`);
  url.search = params.toString();

  return {
    type: SpotifyContentLinkType.SoundCloud,
    url: url.toString(),
  } as SpotifyContentLink;
};
