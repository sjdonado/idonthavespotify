import {
  type SpotifyContentLink,
  SpotifyContentLinkType,
  SpotifyMetadataType,
} from '~/@types/global';

import * as ENV from '~/config/env/server';

import { SpotifyMetadata } from '~/server/services/spotify';

import { getQueryFromMetadata } from '~/utils/query';
import { getCheerioDoc, metaTagContent } from '~/utils/metaContent';
import { compareResponseWithQuery } from '~/utils/compare';

const {
  apiSearchUrl,
  apiKey,
  baseUrl,
} = ENV.services.youtube;

interface YoutubeSearchListResponse {
  error?: { message: string };
  items: [{
    id: {
      videoId: string,
      channelId: string,
      playlistId: string,
    }
  }];
}

export const getYoutubeLink = async (metadata: SpotifyMetadata) => {
  const query = getQueryFromMetadata(metadata);

  let encodedQuery = encodeURIComponent(query);

  if (metadata.type === SpotifyMetadataType.Artist) {
    encodedQuery = encodeURIComponent(`${query} official channel`);
  }

  const url = `${apiSearchUrl}?q=${encodedQuery}&maxResults=1&key=${apiKey}`;

  const response = (await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse);

  if (response.error) {
    return undefined;
  }

  const { videoId, channelId, playlistId } = response.items[0].id;

  let youtubeLink = '';

  if (videoId) {
    youtubeLink = `${baseUrl}/watch?v=${videoId}`;
  }

  if (channelId) {
    youtubeLink = `${baseUrl}/channel/${channelId}`;
  }

  if (playlistId) {
    youtubeLink = `${baseUrl}/playlist?list=${playlistId}`;
  }

  const html = await fetch(youtubeLink).then((res) => res.text());
  const doc = getCheerioDoc(html);

  const youtubeVideoTitle = metaTagContent(doc, 'og:title', 'property') ?? '';

  if (compareResponseWithQuery(youtubeVideoTitle, query)) {
    return undefined;
  }

  return { type: SpotifyContentLinkType.Youtube, url: youtubeLink } as SpotifyContentLink;
};
