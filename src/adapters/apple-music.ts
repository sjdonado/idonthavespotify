import { ENV } from '~/config/env';
import { MetadataType, ServiceType } from '~/config/enum';
import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';
import { getResultWithBestScore } from '~/utils/compare';

import { SearchMetadata, SearchResultLink } from '~/services/search';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';

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

  const url = new URL(`${ENV.services.appleMusic.apiUrl}/search?${params}`);

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[Apple Music] (${url}) cache hit`);
    return cache;
  }

  try {
    const html = await HttpClient.get<string>(url.toString());
    const doc = getCheerioDoc(html);

    const listElements = doc(
      `${searchType ? 'div[aria-label="' + searchType + '"]' : ''} a[href^="https://music.apple.com/"]:lt(3)`
    );

    const { href, score } = getResultWithBestScore(doc, listElements, query);

    const searchResultLink = {
      type: ServiceType.AppleMusic,
      url: href,
      isVerified: score > RESPONSE_COMPARE_MIN_SCORE,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (err) {
    logger.error(`[Apple Music] (${url}) ${err} `);
  }
}
