import * as config from '~/config/default';

import { getQueryFromMetadata } from '~/utils/query';

import { SpotifyMetadata } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';

export const getSoundCloudLink = (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);
  const url = `${config.services.soundCloud.baseUrl}${query}`;

  return { type: SpotifyContentLinkType.SoundCloud, url } as SpotifyContentLink;
};
