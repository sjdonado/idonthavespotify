import { SpotifyContentLink, SpotifyContentLinkType, SpotifyMetadataType } from '~/@types/global';

import * as ENV from '~/config/env/server';

import { SpotifyMetadata } from '~/server/services/spotify';

import { getQueryFromMetadata } from '~/utils/query';
import { compareResponseWithQuery } from '~/utils/compare';

interface DeezerSearchResponse {
  total: number;
  data: [{
    title: string,
    link: string,
    album: {
      title: string,
      link: string,
    },
    artist: {
      name: string,
      link: string,
    },
  }];
}

export const getDeezerLink = async (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);
  const url = `${ENV.services.deezer.apiUrl}?q=${encodeURIComponent(query)}&limit=1`;

  const response = (await fetch(url).then((res) => res.json()) as DeezerSearchResponse);

  if (response.total === 0) {
    return undefined;
  }

  const [{ album, artist, ...track }] = response.data;

  const deezerData = { title: track.title, link: track.link };

  if (metadata.type === SpotifyMetadataType.Album) {
    Object.assign(deezerData, album);
  }

  if (metadata.type === SpotifyMetadataType.Artist) {
    Object.assign(deezerData, {
      title: artist.name,
      link: artist.link,
    });
  }

  if (compareResponseWithQuery(deezerData.title, query)) {
    return undefined;
  }

  return { type: SpotifyContentLinkType.Deezer, url: deezerData.link } as SpotifyContentLink;
};
