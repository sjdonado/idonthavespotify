import { getAppleMusicLink } from '~/adapters/apple-music';
import { getDeezerLink } from '~/adapters/deezer';
import { getSoundCloudLink } from '~/adapters/sound-cloud';
import { getSpotifyLink } from '~/adapters/spotify';
import { getTidalLink } from '~/adapters/tidal';
import { getYouTubeLink } from '~/adapters/youtube';
import { Adapter, MetadataType, Parser, type StreamingServiceType } from '~/config/enum';
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
import { getTidalMetadata, getTidalQueryFromMetadata } from '~/parsers/tidal';
import { getUniversalMetadataFromTidal } from '~/parsers/tidal-universal-link';
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
  notAvailable?: boolean;
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

export type SearchProps =
  | {
      link?: string;
      searchId?: string;
      adapters?: Adapter[];
      headless: true;
    }
  | {
      link?: string;
      searchId?: string;
      adapters?: Adapter[];
      headless: false;
    };

export type SearchReturn<T extends SearchProps> = T['headless'] extends true
  ? string | string[]
  : SearchResult;

export const search = async <T extends SearchProps>({
  link,
  searchId,
  adapters,
  headless,
}: T): Promise<SearchReturn<T>> => {
  const searchParser = getSearchParser(link, searchId);

  const searchAdapters = adapters ?? [
    Adapter.Spotify,
    Adapter.YouTube,
    Adapter.AppleMusic,
    Adapter.Deezer,
    Adapter.SoundCloud,
    Adapter.Tidal,
  ];

  logger.info(`[search] (searchAdapters) ${searchAdapters}`);

  const metadataFetchersMap = {
    [Parser.Spotify]: getSpotifyMetadata,
    [Parser.YouTube]: getYouTubeMetadata,
    [Parser.AppleMusic]: getAppleMusicMetadata,
    [Parser.Deezer]: getDeezerMetadata,
    [Parser.SoundCloud]: getSoundCloudMetadata,
    [Parser.Tidal]: getTidalMetadata,
  };

  const queryExtractorsMap = {
    [Parser.Spotify]: getSpotifyQueryFromMetadata,
    [Parser.YouTube]: getYouTubeQueryFromMetadata,
    [Parser.AppleMusic]: getAppleMusicQueryFromMetadata,
    [Parser.Deezer]: getDeezerQueryFromMetadata,
    [Parser.SoundCloud]: getSoundCloudQueryFromMetadata,
    [Parser.Tidal]: getTidalQueryFromMetadata,
  };

  const linkGettersMap = {
    [Adapter.Spotify]: getSpotifyLink,
    [Adapter.YouTube]: getYouTubeLink,
    [Adapter.AppleMusic]: getAppleMusicLink,
    [Adapter.Deezer]: getDeezerLink,
    [Adapter.SoundCloud]: getSoundCloudLink,
    [Adapter.Tidal]: getTidalLink,
  };

  const metadataFetcher = metadataFetchersMap[searchParser.type];
  const queryExtractor = queryExtractorsMap[searchParser.type];

  if (!metadataFetcher || !queryExtractor) {
    throw new Error('Parser not implemented yet');
  }

  // Even if headless, we need initial metadata and query for link extraction
  const metadata = await metadataFetcher(searchParser.id, searchParser.source);
  const query = queryExtractor(metadata);
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
    logger.info(`[${search.name}] (early return) adapter is equal to parser type`);

    // If headless, return just the link as a string, else return the full object
    if (headless) {
      return link as SearchReturn<T>;
    }

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
    } as SearchReturn<T>;
  }

  const links: SearchResultLink[] = [];
  const existingAdapters = new Set<Adapter>();

  let tidalLink: SearchResultLink | null = linkSearchResult;
  if (searchAdapters.includes(Adapter.Tidal) && parserType !== Adapter.Tidal) {
    tidalLink = await getTidalLink(query, metadata);
    if (tidalLink) {
      existingAdapters.add(Adapter.Tidal);
    }
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
        // Only add the adapter if it's requested and not the parser type
        if (
          searchAdapters.includes(adapter) &&
          parserType !== adapter &&
          fromTidalULink[adapter]
        ) {
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
        const linkGetter = linkGettersMap[adapter];
        if (!linkGetter) return null;

        return linkGetter(query, metadata).then(link => {
          if (link) {
            logger.info(
              `[${search.name}] Found ${adapter} link: ${link.url}, isVerified: ${link.isVerified}, notAvailable: ${link.notAvailable || false}`
            );
            links.push({
              type: adapter,
              url: link.url,
              isVerified: link.isVerified,
              notAvailable: link.notAvailable,
            });
            existingAdapters.add(adapter);
          } else {
            logger.info(
              `[${search.name}] No ${adapter} link found for query: "${query}"`
            );
          }
        });
      })
      .filter(Boolean)
  );

  const parsedLinks = links
    .filter(link => searchAdapters.includes(link.type))
    .sort((a, b) => {
      // Prioritize verified links
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;
      return a.type.localeCompare(b.type);
    });

  // If headless is true, skip updatedMetadata and universal link shortening
  if (headless) {
    return parsedLinks.map(link => link.url) as SearchReturn<T>;
  }

  // Fetch updated metadata (for audio) from spotify if not parser type
  const spotifyLink = links.find(link => link.type === Adapter.Spotify);
  logger.info(
    `[${search.name}] Spotify link found: ${spotifyLink ? `${spotifyLink.url} (verified: ${spotifyLink.isVerified}, notAvailable: ${spotifyLink.notAvailable || false})` : 'none'}`
  );

  const [parsedMetadata, shortLink] = await Promise.all([
    parserType !== Adapter.Spotify &&
    spotifyLink &&
    spotifyLink.isVerified &&
    !spotifyLink.notAvailable
      ? (async () => {
          logger.info(
            `[${search.name}] Fetching Spotify metadata for verified available link: ${spotifyLink.url}`
          );
          const spotifySearchParser = getSearchParser(spotifyLink.url);
          const spotifyMetadata = await getSpotifyMetadata(
            spotifySearchParser.id,
            spotifyLink.url
          );
          logger.info(
            `[${search.name}] Spotify metadata - Title: "${spotifyMetadata.title}", Audio: ${spotifyMetadata.audio ? 'available' : 'none'}`
          );
          return spotifyMetadata;
        })()
      : (async () => {
          if (parserType !== Adapter.Spotify && spotifyLink) {
            if (spotifyLink.notAvailable) {
              logger.info(
                `[${search.name}] Skipping not available Spotify link for metadata: ${spotifyLink.url}`
              );
            } else if (!spotifyLink.isVerified) {
              logger.info(
                `[${search.name}] Skipping unverified Spotify link for metadata: ${spotifyLink.url}`
              );
            }
          }
          return metadata;
        })(),
    shortenLink(universalLink),
  ]);

  const searchResult: SearchResult = {
    id,
    type: parsedMetadata.type,
    title: parsedMetadata.title,
    description: parsedMetadata.description,
    image: parsedMetadata.image,
    audio: parsedMetadata.audio,
    source: searchParser.source,
    universalLink: shortLink,
    links: parsedLinks,
  };

  logger.info(`[${search.name}] (results) ${searchResult.links.map(link => link?.url)}`);

  return searchResult as SearchReturn<T>;
};
