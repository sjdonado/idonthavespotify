import { Adapter } from '~/config/enum';
import {
  cacheTidalUniversalLinkResponse,
  getCachedTidalUniversalLinkResponse,
} from '~/services/cache';
import { fetchMetadata } from '~/services/metadata';
import type { SearchResultLink } from '~/services/search';
import { logger } from '~/utils/logger';
import { getCheerioDoc } from '~/utils/scraper';

export const getUniversalMetadataFromTidal = async (
  link: string,
  isVerified: boolean
): Promise<Record<Adapter, SearchResultLink | null> | undefined> => {
  const cached = await getCachedTidalUniversalLinkResponse(link);
  if (cached) {
    logger.info(`[Tidal] (${link}) universalLink metadata cache hit`);
    return cached;
  }

  try {
    const html = await fetchMetadata(link);
    const doc = getCheerioDoc(html);

    const extractLink = (selector: string, type: Adapter): SearchResultLink | null => {
      const url = doc(selector).attr('href');
      return url
        ? {
            type,
            url,
            isVerified,
          }
        : null;
    };

    const adapterLinks: Record<Adapter, SearchResultLink | null> = {
      [Adapter.Spotify]: extractLink('a[href*="spotify.com"]', Adapter.Spotify),
      [Adapter.YouTube]: extractLink('a[href*="music.youtube.com"]', Adapter.YouTube),
      [Adapter.AppleMusic]: extractLink('a[href*="music.apple.com"]', Adapter.AppleMusic),
      [Adapter.Deezer]: null,
      [Adapter.SoundCloud]: null,
      [Adapter.Tidal]: null,
      [Adapter.Qobuz]: null,
      [Adapter.Bandcamp]: null,
    };

    await cacheTidalUniversalLinkResponse(link, adapterLinks);

    return adapterLinks;
  } catch (err) {
    logger.error(`[${getUniversalMetadataFromTidal.name}] (${link}) ${err}`);
  }
};
