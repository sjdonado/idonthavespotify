import * as config from '~/config/default';
import { MetadataType, ServiceType } from '~/config/enum';
import { DEFAULT_TIMEOUT } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

import { SearchMetadata, SearchResultLink } from '~/services/search';
import { getResultWithBestScore } from '~/utils/compare';

export const APPLE_MUSIC_LINK_SELECTOR = 'a[href^="https://music.apple.com/"]';

const APPLE_MUSIC_SEARCH_TYPES = {
  [MetadataType.Song]: 'Songs',
  [MetadataType.Album]: 'Albums',
  [MetadataType.Playlist]: 'Playlists',
  [MetadataType.Artist]: 'Artists',
  [MetadataType.Podcast]: undefined,
  [MetadataType.Show]: undefined,
};

export async function getAppleMusicLink(query: string, metadata: SearchMetadata) {
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
      `${searchType ? 'div[aria-label="' + searchType + '"]' : ''} a[href^="https://music.apple.com/"]:lt(3)`
    );

    const { href } = getResultWithBestScore(doc, listElements, query);

    return {
      type: ServiceType.AppleMusic,
      url: href,
      isVerified: true,
    } as SearchResultLink;
  } catch (err) {
    logger.error(`[Apple Music](${url}) ${err} `);
  }
}
