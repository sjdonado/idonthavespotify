import * as config from '~/config/default';
import { MetadataType, ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';

import { SearchMetadata, SearchResultLink } from '~/services/search';
import { getLinkWithPuppeteer } from '~/utils/scraper';
import HttpClient from '~/utils/http-client';

import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';

const YOUTUBE_SEARCH_TYPES = {
  [MetadataType.Song]: 'song',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: '',
  [MetadataType.Artist]: 'channel',
  [MetadataType.Podcast]: '',
  [MetadataType.Show]: '',
};

export async function getYouTubeLink(query: string, metadata: SearchMetadata) {
  const params = new URLSearchParams({
    q: `${query} ${YOUTUBE_SEARCH_TYPES[metadata.type]}`,
  });

  const url = new URL(config.services.youTube.musicUrl);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[YouTube] (${url}) cache hit`);
    return cache;
  }

  try {
    const youtubeCookie = {
      domain: '.youtube.com',
      path: '/',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      secure: true,
    };

    const cookies = config.services.youTube.cookies.split(';').map(cookie => {
      const [name, value] = cookie.split('=');
      return {
        ...youtubeCookie,
        name,
        value,
      };
    });

    const link = await getLinkWithPuppeteer(
      url.toString(),
      'ytmusic-card-shelf-renderer a',
      cookies
    );

    if (!link) {
      return;
    }

    const searchResultLink = {
      type: ServiceType.YouTube,
      url: link,
      isVerified: true,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (error) {
    logger.error(`[YouTube] (${url}) ${error}`);
  }
}

export async function fetchYoutubeMetadata(youtubeLink: string) {
  logger.info(`[${fetchYoutubeMetadata.name}] parse metadata (desktop): ${youtubeLink}`);

  const html = await HttpClient.get<string>(youtubeLink, {
    headers: {
      Cookie: config.services.youTube.cookies,
    },
  });

  return html;
}
