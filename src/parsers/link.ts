import { NotFoundError, ParseError } from 'elysia';

import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';
import { ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';
import { cacheSearchService, getCachedSearchService } from '~/services/cache';

export type SearchService = {
  id: string;
  type: string;
  source: string;
};

export const getSearchService = async (link?: string, searchId?: string) => {
  const cached = searchId ? await getCachedSearchService(searchId) : null;
  if (cached) {
    logger.info(`[${getSearchService.name}] (${searchId}) cache hit`);
    return cached;
  }

  if (!link && searchId) {
    throw new NotFoundError('SearchId does not exist');
  }

  let id, type;

  const spotifyId = link!.match(SPOTIFY_LINK_REGEX)?.[3];
  if (spotifyId) {
    id = spotifyId;
    type = ServiceType.Spotify;
  }

  const youtubeId = link!.match(YOUTUBE_LINK_REGEX)?.[1];
  if (youtubeId) {
    id = youtubeId;
    type = ServiceType.YouTube;
  }

  if (!id || !type) {
    throw new ParseError('Service id could not be extracted from link.');
  }

  const searchService = {
    id,
    type,
    source: link,
  } as SearchService;

  await cacheSearchService(id, searchService);

  return searchService;
};
