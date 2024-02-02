import * as config from '~/config/default';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const getSoundCloudLink = (query: string) => {
  const url = `${config.services.soundCloud.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.SoundCloud, url } as SpotifyContentLink;
};
