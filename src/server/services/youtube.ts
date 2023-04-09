import { compareTwoStrings } from 'string-similarity';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/@types/global';

import { SpotifyMetadata } from '~/server/services/spotify';
import { getQueryFromMetadata } from '~/utils/query';

import * as ENV from '~/config/env/server';
import { getCheerioDoc, metaTagContent } from '~/utils/metaContent';

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
  const url = `${apiSearchUrl}?q=${encodeURIComponent(query)}&maxResults=1&key=${apiKey}`;

  const response = (await fetch(url).then((res) => res.json()) as YoutubeSearchListResponse);

  if (response.error) {
    throw new Error(response.error.message);
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

  if (compareTwoStrings(youtubeVideoTitle, query) < 0.5) {
    return undefined;
  }

  return { type: SpotifyContentLinkType.Youtube, url: youtubeLink } as SpotifyContentLink;
};
