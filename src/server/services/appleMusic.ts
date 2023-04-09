import { SpotifyContentLink, SpotifyContentLinkType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';

export const getAppleMusicLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${ENV.services.appleMusic.baseUrl}${encodeURIComponent(query)}`;

  return { type: SpotifyContentLinkType.AppleMusic, url } as SpotifyContentLink;
};
