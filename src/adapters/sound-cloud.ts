import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';
import { Adapter, MetadataType } from '~/config/enum';
import { ENV } from '~/config/env';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';
import type { SearchMetadata, SearchResultLink } from '~/services/search';
import { getResultWithBestScore } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

export async function getSoundCloudLink(query: string, metadata: SearchMetadata) {
  if (metadata.type === MetadataType.Show) {
    return null;
  }

  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${ENV.adapters.soundCloud.baseUrl}/search`);
  url.search = params.toString();

  const cache = await getCachedSearchResultLink(url);
  if (cache) {
    logger.info(`[SoundCloud] (${url}) cache hit`);
    return cache;
  }

  try {
    const html = await HttpClient.get<string>(url.toString());
    const doc = getCheerioDoc(html);

    // Extract contents of noscript
    const noscriptHTML = doc('noscript').eq(1).html();
    const noscriptDoc = getCheerioDoc(noscriptHTML ?? '');

    const listElements = noscriptDoc('ul:nth-of-type(2) li:lt(3) h2 a');

    const { href, score } = getResultWithBestScore(noscriptDoc, listElements, query);

    const searchResultLink = {
      type: Adapter.SoundCloud,
      url: `${ENV.adapters.soundCloud.baseUrl}${href}`,
      isVerified: score > RESPONSE_COMPARE_MIN_SCORE,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (err) {
    logger.error(`[SoundCloud] (${url}) ${err}`);
    return null;
  }
}
