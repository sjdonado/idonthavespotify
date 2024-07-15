import { ENV } from '~/config/env';
import { MetadataType, Adapter } from '~/config/enum';

import { logger } from '~/utils/logger';

import { getSearchParser } from '~/parsers/link';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import { getYouTubeMetadata, getYouTubeQueryFromMetadata } from '~/parsers/youtube';

import { getAppleMusicLink } from '~/adapters/apple-music';
import { getYouTubeLink } from '~/adapters/youtube';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/soundcloud';
import { getTidalLink } from '~/adapters/tidal';
import { getSpotifyLink } from '~/adapters/spotify';
import { generateId } from '~/utils/encoding';
import { shortenLink } from '~/utils/url-shortener';

export type SearchMetadata = {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
};

export type SearchResultLink = {
  type: Adapter;
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
  universalLink: string;
  links: SearchResultLink[];
};

export const search = async ({
  link,
  searchId,
  adapters,
}: {
  link?: string;
  searchId?: string;
  adapters?: Adapter[];
}) => {
  const searchParser = await getSearchParser(link, searchId);

  let metadata, query;

  if (searchParser.type === Adapter.Spotify) {
    metadata = await getSpotifyMetadata(searchParser.id, link!);
    query = getSpotifyQueryFromMetadata(metadata);
  }

  if (searchParser.type === Adapter.YouTube) {
    metadata = await getYouTubeMetadata(searchParser.id, link!);
    query = getYouTubeQueryFromMetadata(metadata);
  }

  if (!metadata || !query) {
    throw new Error('Adapter not implemented yet');
  }

  logger.info(
    `[${search.name}] (params) ${JSON.stringify({ searchParser, metadata, query }, null, 2)}`
  );

  const id = generateId(searchParser.source);
  const universalLinkPromise = shortenLink(`${ENV.app.url}?id=${id}`);

  const searchResultsPromise = Promise.all([
    searchParser.type !== Adapter.Spotify ? getSpotifyLink(query, metadata) : null,
    searchParser.type !== Adapter.YouTube ? getYouTubeLink(query, metadata) : null,
    getAppleMusicLink(query, metadata),
    getDeezerLink(query, metadata),
    getSoundCloudLink(query, metadata),
  ]);

  const [searchResults, universalLink] = await Promise.all([
    searchResultsPromise,
    universalLinkPromise,
  ]);

  const links = searchResults.filter(Boolean);

  logger.info(`[${search.name}] (results) ${JSON.stringify(links, null, 2)}`);

  // add no-verified links if at least one link is verified
  const tidalLink = getTidalLink(query);
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
    source: searchParser.source,
    universalLink,
    links: links as SearchResultLink[],
  };

  return searchResult;
};
