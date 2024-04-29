import { MetadataType, ServiceType } from '~/config/enum';

import { logger } from '~/utils/logger';

import { linkToServiceType } from '~/parsers/link';
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

  let metadata, query;

  if (type === ServiceType.Spotify) {
    metadata = await getSpotifyMetadata(link);
    query = getSpotifyQueryFromMetadata(metadata);
  }

  if (type === ServiceType.YouTube) {
    metadata = await getYouTubeMetadata(link);
    query = getYouTubeQueryFromMetadata(metadata);
  }

  if (!metadata || !query) {
    throw new Error('Adapter not implemented yet');
  }

  logger.info(
    `[${search.name}] (new search) ${JSON.stringify({ link, query, metadata }, null, 2)}`
  );

  const [spotifyLink, youtubeLink, appleMusicLink, deezerLink, soundCloudLink] =
    await Promise.all([
      type !== ServiceType.Spotify ? getSpotifyLink(query, metadata) : null,
      type !== ServiceType.YouTube ? getYouTubeLink(query, metadata) : null,
      getAppleMusicLink(query, metadata),
      getDeezerLink(query, metadata),
      getSoundCloudLink(query, metadata),
    ]);

  logger.info(
    `[${search.name}] (search results) ${JSON.stringify({
      spotifyLink,
      youtubeLink,
      appleMusicLink,
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

  return searchResult;
};
