import { MetadataType, ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';

import { getSearchService } from '~/parsers/link';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import { getYouTubeMetadata, getYouTubeQueryFromMetadata } from '~/parsers/youtube';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYouTubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';
import { getTidalLink } from '~/adapters/tidal';
import { getSpotifyLink } from '~/adapters/spotify';

export type SearchMetadata = {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
};

export type SearchResultLink = {
  type: ServiceType;
  url: string;
  isVerified?: boolean;
};

export type SearchResult = {
  id: string;
  type: MetadataType;
  title: string;
  description: string;
  image: string;
  audio?: string;
  source: string;
  links: SearchResultLink[];
};

export const search = async (link?: string, searchId?: string) => {
  const searchService = await getSearchService(link, searchId);

  let metadata, query;

  if (searchService.type === ServiceType.Spotify) {
    metadata = await getSpotifyMetadata(searchService.id, link!);
    query = getSpotifyQueryFromMetadata(metadata);
  }

  if (searchService.type === ServiceType.YouTube) {
    metadata = await getYouTubeMetadata(searchService.id, link!);
    query = getYouTubeQueryFromMetadata(metadata);
  }

  if (!metadata || !query) {
    throw new Error('Adapter not implemented yet');
  }

  logger.info(
    `[${search.name}] (params) ${JSON.stringify({ searchService, metadata, query }, null, 2)}`
  );

  const searchResults = await Promise.all([
    searchService.type !== ServiceType.Spotify ? getSpotifyLink(query, metadata) : null,
    searchService.type !== ServiceType.YouTube ? getYouTubeLink(query, metadata) : null,
    getAppleMusicLink(query, metadata),
    getDeezerLink(query, metadata),
    getSoundCloudLink(query, metadata),
  ]);

  const links = searchResults.filter(Boolean);

  logger.info(`[${search.name}] (results) ${JSON.stringify(links, null, 2)}`);

  // add no-verified links if at least one link is verified
  const tidalLink = getTidalLink(query);
  if (links.some(link => link?.isVerified)) {
    links.push(tidalLink);
  }

  const searchResult: SearchResult = {
    id: searchService.id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: searchService.source,
    links: links as SearchResultLink[],
  };

  return searchResult;
};
