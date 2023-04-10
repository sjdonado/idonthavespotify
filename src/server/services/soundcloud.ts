import { SpotifyContentLink, SpotifyContentLinkType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';

export const getSoundCloudLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${ENV.services.soundCloud.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.SoundCloud, url } as SpotifyContentLink;
};
