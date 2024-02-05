import * as config from '~/config/default';
import { DEFAULT_TIMEOUT } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';
import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';
import { getResultWithBestScore } from '~/utils/compare';

export const APPLE_MUSIC_LINK_SELECTOR = 'a[href^="https://music.apple.com/"]';

const APPLE_MUSIC_SEARCH_TYPES = {
  [SpotifyMetadataType.Song]: 'Songs',
  [SpotifyMetadataType.Album]: 'Albums',
  [SpotifyMetadataType.Playlist]: 'Playlists',
  [SpotifyMetadataType.Artist]: 'Artists',
  [SpotifyMetadataType.Podcast]: undefined,
  [SpotifyMetadataType.Show]: undefined,
};

export async function getAppleMusicLink(query: string, metadata: SpotifyMetadata) {
  const searchType = APPLE_MUSIC_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return;
  }

  // apple music does not support x-www-form-urlencoded encoding
  const params = `term=${encodeURIComponent(query)}`;

  const url = new URL(`${config.services.appleMusic.apiUrl}/search?${params}`);

  try {
    const html = await HttpClient.get<string>(url.toString(), {
      timeout: DEFAULT_TIMEOUT * 2,
    });
    const doc = getCheerioDoc(html);

    const listElements = doc(
      `div[aria-label="${searchType}"] a[href^="https://music.apple.com/"]:lt(3)`
    );

    const { href } = getResultWithBestScore(doc, listElements, query);

    return {
      type: SpotifyContentLinkType.AppleMusic,
      url: href,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (err) {
    logger.error(`[Apple Music](${url}) ${err} `);
  }
}
