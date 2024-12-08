import { getAppleMusicLink } from '~/adapters/apple-music';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/sound-cloud';
import { getSpotifyLink } from '~/adapters/spotify';
import { getTidalLink } from '~/adapters/tidal';
import { getYouTubeLink } from '~/adapters/youtube';
import { Adapter, MetadataType, Parser, StreamingServiceType } from '~/config/enum';
import { ENV } from '~/config/env';
import {
  getAppleMusicMetadata,
  getAppleMusicQueryFromMetadata,
} from '~/parsers/apple-music';
import { getDeezerMetadata, getDeezerQueryFromMetadata } from '~/parsers/deezer';
import { getSearchParser } from '~/parsers/link';
import {
  getSoundCloudMetadata,
  getSoundCloudQueryFromMetadata,
} from '~/parsers/sound-cloud';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import {
  getTidalMetadata,
  getTidalQueryFromMetadata,
  getUniversalMetadataFromTidal,
} from '~/parsers/tidal';
import { getYouTubeMetadata, getYouTubeQueryFromMetadata } from '~/parsers/youtube';
import { generateId } from '~/utils/encoding';
import { logger } from '~/utils/logger';
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
  const searchAdapters = adapters ?? [
    Adapter.Spotify,
    Adapter.YouTube,
    Adapter.AppleMusic,
    Adapter.Deezer,
    Adapter.SoundCloud,
    Adapter.Tidal,
  ];

  const searchParser = getSearchParser(link, searchId);

  const metadataFetchers = {
    [Parser.Spotify]: getSpotifyMetadata,
    [Parser.YouTube]: getYouTubeMetadata,
    [Parser.AppleMusic]: getAppleMusicMetadata,
    [Parser.Deezer]: getDeezerMetadata,
    [Parser.SoundCloud]: getSoundCloudMetadata,
    [Parser.Tidal]: getTidalMetadata,
  };

  const queryExtractors = {
    [Parser.Spotify]: getSpotifyQueryFromMetadata,
    [Parser.YouTube]: getYouTubeQueryFromMetadata,
    [Parser.AppleMusic]: getAppleMusicQueryFromMetadata,
    [Parser.Deezer]: getDeezerQueryFromMetadata,
    [Parser.SoundCloud]: getSoundCloudQueryFromMetadata,
    [Parser.Tidal]: getTidalQueryFromMetadata,
  };

  const linkGetters = {
    [Adapter.Spotify]: getSpotifyLink,
    [Adapter.YouTube]: getYouTubeLink,
    [Adapter.AppleMusic]: getAppleMusicLink,
    [Adapter.Deezer]: getDeezerLink,
    [Adapter.SoundCloud]: getSoundCloudLink,
    [Adapter.Tidal]: getTidalLink,
  };

  const fetchMetadata = metadataFetchers[searchParser.type];
  const extractQuery = queryExtractors[searchParser.type];

  if (!fetchMetadata || !extractQuery) {
    throw new Error('Parser not implemented yet');
  }

  let metadata = await fetchMetadata(searchParser.id, searchParser.source);
  const query = extractQuery(metadata);
  const parserType = searchParser.type as StreamingServiceType;

  logger.info(
    `[${search.name}] (params) ${JSON.stringify({ searchParser, metadata, query }, null, 2)}`
  );

  const id = generateId(searchParser.source);
  const universalLink = `${ENV.app.url}?id=${id}`;
  const linkSearchResult: SearchResultLink = {
    type: parserType,
    url: link as string,
    isVerified: true,
  };

  // Early return if only one adapter matches the parser type
  if (
    searchAdapters.length === 1 &&
    searchParser.type === (searchAdapters[0] as StreamingServiceType)
  ) {
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
      links: [linkSearchResult],
    };
  }

  const links: SearchResultLink[] = [];
  const existingAdapters = new Set(links.map(link => link.type));

  let tidalLink: SearchResultLink | null = linkSearchResult;
  if (parserType !== Adapter.Tidal) {
    tidalLink = await getTidalLink(query, metadata);
    existingAdapters.add(Adapter.Tidal);
  }

  if (tidalLink) {
    links.push(tidalLink);

    // Fetch universal links from Tidal
    const fromTidalULink = await getUniversalMetadataFromTidal(
      `${tidalLink.url}/u`,
      tidalLink.isVerified as boolean
    );

    logger.info(
      `[${search.name}] (tidal universalLink results) ${Object.values(
        fromTidalULink ?? {}
      )
        .map(link => link?.url)
        .filter(Boolean)}`
    );

    if (fromTidalULink) {
      for (const adapterKey in fromTidalULink) {
        const adapter = adapterKey as Adapter;
        if (parserType !== adapter && fromTidalULink[adapter]) {
          links.push(fromTidalULink[adapter]);
          existingAdapters.add(adapter);
        }
      }
    }
  }

  // Prepare promises for remaining adapters
  const remainingAdapters = searchAdapters.filter(
    adapter => !existingAdapters.has(adapter) && parserType !== adapter
  );

  await Promise.all(
    remainingAdapters
      .map(adapter => {
        const getLink = linkGetters[adapter];
        if (!getLink) return null;

        return getLink(query, metadata).then(link => {
          if (link) {
            links.push({ type: adapter, url: link.url, isVerified: true });
            existingAdapters.add(adapter);
          }
        });
      })
      .filter(Boolean)
  );

  // Fetch metadata audio from spotify and universal link from bit
  const spotifyLink = links.find(link => link.type === Adapter.Spotify);
  const [updatedMetadata, shortLink] = await Promise.all([
    parserType !== Adapter.Spotify && spotifyLink
      ? (async () => {
          const spotifySearchParser = getSearchParser(spotifyLink.url);
          return getSpotifyMetadata(spotifySearchParser.id, spotifyLink.url);
        })()
      : metadata,
    shortenLink(universalLink),
  ]);

  metadata = updatedMetadata;
  links.sort((a, b) => {
    // Prioritize verified links
    if (a.isVerified && !b.isVerified) return -1;
    if (!a.isVerified && b.isVerified) return 1;

    return a.type.localeCompare(b.type);
  });

  logger.info(`[${search.name}] (results) ${links.map(link => link?.url)}`);

  const searchResult: SearchResult = {
    id,
    type: metadata.type,
    title: metadata.title,
    description: metadata.description,
    image: metadata.image,
    audio: metadata.audio,
    source: searchParser.source,
    universalLink: shortLink,
    links,
  };

  return searchResult;
};
