import { ENV } from '~/config/env';
import { MetadataType, ServiceType } from '~/config/enum';
import { RESPONSE_COMPARE_MIN_SCORE } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';
import { getResultWithBestScore } from '~/utils/compare';

import { SearchMetadata, SearchResultLink } from '~/services/search';
import { cacheSearchResultLink, getCachedSearchResultLink } from '~/services/cache';

export async function getSoundCloudLink(query: string, metadata: SearchMetadata) {
  if (metadata.type === MetadataType.Show) {
    return;
  }

  const params = new URLSearchParams({
    q: query,
  });

  const url = new URL(`${ENV.services.soundCloud.baseUrl}/search`);
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

    if (score <= RESPONSE_COMPARE_MIN_SCORE) {
      return;
    }

    const searchResultLink = {
      type: ServiceType.SoundCloud,
      url: `${ENV.services.soundCloud.baseUrl}${href}`,
      isVerified: true,
    } as SearchResultLink;

    await cacheSearchResultLink(url, searchResultLink);

    return searchResultLink;
  } catch (err) {
    logger.error(`[SoundCloud] (${url}) ${err}`);
  }
}
