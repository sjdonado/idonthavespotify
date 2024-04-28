import { MetadataType, ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';
import { getQueryFromMetadata } from '~/utils/query';

import { linkToServiceType } from '~/parsers/link';
import { getSpotifyMetadata } from '~/parsers/spotify';

import { cacheSearchResult, getCachedSearchResult } from './cache';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYouTubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';
import { getTidalLink } from '~/adapters/tidal';

export type SearchMetadata = {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
};

export interface SearchResultLink {
  type: ServiceType;
  url: string;
  isVerified?: boolean;
}

export interface SearchResult {
  id: string;
  type: MetadataType;
  title: string;
  description: string;
  image: string;
  audio?: string;
  source: string;
  links: SearchResultLink[];
}

export const search = async (link: string) => {
  const { type, id } = linkToServiceType(link);

  const cache = await getCachedSearchResult(id);
  if (cache) {
    logger.info(`[${search.name}] loaded from cache: ${link}`);
    return cache;
  }

  logger.info(`[${search.name}] cache miss: ${link}`);

  let metadata;

  if (type === ServiceType.Spotify) {
    metadata = await getSpotifyMetadata(link);
  }

  if (type === ServiceType.YouTube) {
    // metadata = await parseYoutubeMetadata;
  }

  if (!metadata) {
    throw new Error('Adapter not implemented yet');
  }

  const query = getQueryFromMetadata(metadata.title, metadata.description, metadata.type);
  logger.info(`[${search.name}] link: ${link}, query: ${query}`);

  const [appleMusicLink, youtubeLink, deezerLink, soundCloudLink] = await Promise.all([
    getAppleMusicLink(query, metadata),
    getYouTubeLink(query, metadata),
    getDeezerLink(query, metadata),
    getSoundCloudLink(query, metadata),
  ]);

  logger.info(
    `[${search.name}] results: ${JSON.stringify({
      appleMusicLink,
      youtubeLink,
      deezerLink,
      soundCloudLink,
    })}`
  );

  const tidalLink = getTidalLink(query);

  const links = [appleMusicLink, youtubeLink, deezerLink, soundCloudLink].filter(Boolean);

  // add no-verified links if at least one link is verified
  if (links.some(link => link?.isVerified)) {
    links.push(tidalLink);
  }

  const searchResult: SearchResult = {
    id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: link,
    links: links as SearchResultLink[],
  };

  await cacheSearchResult(searchResult);

  return searchResult;
};
