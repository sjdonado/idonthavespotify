import * as config from '~/config/default';
import { MetadataType, ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';

import { SearchMetadata, SearchResultLink } from '~/services/search';
import { getLinkWithPuppeteer } from '~/utils/scraper';

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

  try {
    const youtubeCookie = {
      domain: '.youtube.com',
      path: '/',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      secure: true,
    };

    const cookies = config.services.youTube.cookies.split('|').map(cookie => {
      const [name, value] = cookie.split(':');
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

    return {
      type: ServiceType.YouTube,
      url: link,
      isVerified: true,
    } as SearchResultLink;
  } catch (error) {
    logger.error(`[YouTube] (${url}) ${error}`);
  }
}
