import * as config from '~/config/default';

import { logger } from '~/utils/logger';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';
import { getLinkWithPuppeteer } from '~/utils/scraper';

const YOUTUBE_SEARCH_TYPES = {
  [SpotifyMetadataType.Song]: 'song',
  [SpotifyMetadataType.Album]: 'album',
  [SpotifyMetadataType.Playlist]: '',
  [SpotifyMetadataType.Artist]: 'channel',
  [SpotifyMetadataType.Podcast]: '',
  [SpotifyMetadataType.Show]: '',
};

export async function getYouTubeLink(query: string, metadata: SpotifyMetadata) {
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
      type: SpotifyContentLinkType.YouTube,
      url: link,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (error) {
    logger.error(`[YouTube] (${url}) ${error}`);
  }
}
