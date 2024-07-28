import { ENV } from '~/config/env';
import { MetadataType, Adapter, Parser } from '~/config/enum';

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
import {
  getAppleMusicMetadata,
  getAppleMusicQueryFromMetadata,
} from '~/parsers/appleMusic';
import { getDeezerMetadata, getDeezerQueryFromMetadata } from '~/parsers/deezer';

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
  const searchAdapters = adapters ?? [
    Adapter.Spotify,
    Adapter.YouTube,
    Adapter.AppleMusic,
    Adapter.Deezer,
    Adapter.SoundCloud,
    Adapter.Tidal,
  ];

  const searchParser = getSearchParser(link, searchId);

  let metadata, query;

  switch (searchParser.type) {
    case Parser.Spotify:
      metadata = await getSpotifyMetadata(searchParser.id, searchParser.source);
      query = getSpotifyQueryFromMetadata(metadata);
      break;
    case Parser.YouTube:
      metadata = await getYouTubeMetadata(searchParser.id, searchParser.source);
      query = getYouTubeQueryFromMetadata(metadata);
      break;
    case Parser.AppleMusic:
      metadata = await getAppleMusicMetadata(searchParser.id, searchParser.source);
      query = getAppleMusicQueryFromMetadata(metadata);
      break;
    case Parser.Deezer:
      metadata = await getDeezerMetadata(searchParser.id, searchParser.source);
      query = getDeezerQueryFromMetadata(metadata);
      break;
  }

  if (!metadata || !query) {
    throw new Error('Parser not implemented yet');
  }

  logger.info(
    `[${search.name}] (params) ${JSON.stringify({ searchParser, metadata, query }, null, 2)}`
  );

  const id = generateId(searchParser.source);
  const universalLink = `${ENV.app.url}?id=${id}`;

  if (searchAdapters.length === 1 && searchAdapters[0] === searchParser.type) {
    logger.info(`[${search.name}] early return - adapter is equal to parser type`);

    return {
      id,
      type: metadata.type,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      audio: metadata.audio,
      source: searchParser.source,
      universalLink,
      links: [
        {
          type: searchParser.type,
          url: link,
          isVerified: true,
        },
      ] as SearchResultLink[],
    };
  }

  const [
    spotifyLink,
    youtubeLink,
    appleMusicLink,
    deezerLink,
    soundCloudLink,
    shortLink,
  ] = await Promise.all([
    searchParser.type !== Parser.Spotify ? getSpotifyLink(query, metadata) : null,
    searchParser.type !== Parser.YouTube && searchAdapters.includes(Adapter.YouTube)
      ? getYouTubeLink(query, metadata)
      : null,
    searchParser.type !== Parser.AppleMusic && searchAdapters.includes(Adapter.AppleMusic)
      ? getAppleMusicLink(query, metadata)
      : null,
    searchParser.type !== Parser.Deezer && searchAdapters.includes(Adapter.Deezer)
      ? getDeezerLink(query, metadata)
      : null,
    searchAdapters.includes(Adapter.SoundCloud)
      ? getSoundCloudLink(query, metadata)
      : null,
    shortenLink(`${ENV.app.url}?id=${id}`),
  ]);

  if (searchParser.type !== Parser.Spotify && spotifyLink) {
    const spotifySearchParser = getSearchParser(spotifyLink.url);
    metadata = await getSpotifyMetadata(spotifySearchParser.id, spotifyLink.url);
  }

  const links = [
    spotifyLink,
    youtubeLink,
    appleMusicLink,
    deezerLink,
    soundCloudLink,
  ].filter(Boolean);

  logger.info(`[${search.name}] (results) ${JSON.stringify(links, null, 2)}`);

  // Add Tidal link if at least one link is verified and Tidal is included in the adapters
  if (links.some(link => link?.isVerified) && searchAdapters.includes(Adapter.Tidal)) {
    const tidalLink = getTidalLink(query);
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
    universalLink: shortLink,
    links: links as SearchResultLink[],
  };

  return searchResult;
};
