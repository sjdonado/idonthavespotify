import {
  RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
  RESPONSE_COMPARE_MIN_SCORE,
} from '~/config/constants';
import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { getResultWithBestScore } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

const APPLE_MUSIC_SEARCH_TYPES = {
  [MetadataType.Song]: 'Songs',
  [MetadataType.Album]: 'Albums',
  [MetadataType.Playlist]: 'Playlists',
  [MetadataType.Artist]: 'Artists',
  [MetadataType.Podcast]: undefined,
  [MetadataType.Show]: undefined,
};

export async function getAppleMusicLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const searchType = APPLE_MUSIC_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  // x-www-form-urlencoded encoding required for browser url
  const params = `term=${encodeURIComponent(query)}`;

  const url = new URL(`${ENV.adapters.appleMusic.apiUrl}/search?${params}`);

  const cache = await getCachedSearchResultLink(
    Adapter.AppleMusic,
    sourceParser,
    sourceId
  );
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

    // Convert music.apple.com links to geo.music.apple.com links for better results
    const geoUrl = href.replace('music.apple.com', 'geo.music.apple.com');

    if (href !== geoUrl) {
      logger.info(`[Apple Music] transformed to geo link: ${geoUrl}`);
    }

    const searchResultLink = {
      type: Adapter.AppleMusic,
      url: geoUrl,
      isVerified: score >= RESPONSE_COMPARE_MIN_SCORE,
      notAvailable: score < RESPONSE_COMPARE_MIN_INCLUSION_SCORE,
    } as SearchResultLink;

    logger.info(
      `[Apple Music] Result score: ${score.toFixed(3)} (verified: ${searchResultLink.isVerified ? 'yes' : 'no'}, available: ${!searchResultLink.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(
      Adapter.AppleMusic,
      sourceParser,
      sourceId,
      searchResultLink
    );

    return searchResultLink;
  } catch (err) {
    logger.error(`[Apple Music] (${url}) ${err} `);
    return null;
  }
}
