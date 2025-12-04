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
import { getGoogleMetadata, getGoogleQueryFromMetadata } from '~/parsers/google';
import { getSearchParser } from '~/parsers/link';
import {
  getSoundCloudMetadata,
  getSoundCloudQueryFromMetadata,
} from '~/parsers/sound-cloud';
import { getSpotifyMetadata, getSpotifyQueryFromMetadata } from '~/parsers/spotify';
import { getTidalMetadata, getTidalQueryFromMetadata } from '~/parsers/tidal';
import { getYouTubeMetadata, getYouTubeQueryFromMetadata } from '~/parsers/youtube';
import { generateId } from '~/utils/encoding';
import { logger } from '~/utils/logger';
import { shortenLink } from '~/utils/url-shortener';

export type SearchMetadata = {
  title: string;
  description: string;
  type: MetadataType;
  image?: string;
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
  image?: string;
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
    [Parser.Google]: getGoogleMetadata,
  };

  const queryExtractorsMap = {
    [Parser.Spotify]: getSpotifyQueryFromMetadata,
    [Parser.YouTube]: getYouTubeQueryFromMetadata,
    [Parser.AppleMusic]: getAppleMusicQueryFromMetadata,
    [Parser.Deezer]: getDeezerQueryFromMetadata,
    [Parser.SoundCloud]: getSoundCloudQueryFromMetadata,
    [Parser.Tidal]: getTidalQueryFromMetadata,
    [Parser.Google]: getGoogleQueryFromMetadata,
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

  // Google is a parser-only service (not a streaming adapter), so we don't create a link for it
  const isParserOnlyService = searchParser.type === Parser.Google;

  const linkSearchResult: SearchResultLink | null = isParserOnlyService
    ? null
    : {
        type: parserType,
        url: link as string,
        isVerified: true,
      };

  // Early return if only one adapter matches the parser type
  // Skip this for parser-only services like Google
  if (
    !isParserOnlyService &&
    searchAdapters.length === 1 &&
    searchParser.type === (searchAdapters[0] as StreamingServiceType)
  ) {
    logger.info(`[${search.name}] (early return) adapter is equal to parser type`);

    // If headless, return just the link as a string, else return the full object
    if (headless) {
      return link as SearchReturn<T>;
    }

    const shortLink = await shortenLink(universalLink);

    return {
      id,
      type: metadata.type,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      audio: metadata.audio,
      source: searchParser.source,
      universalLink: shortLink,
      links: [linkSearchResult!],
    } as SearchReturn<T>;
  }

  const links: SearchResultLink[] = linkSearchResult ? [linkSearchResult] : [];

  // Prepare promises for all adapters except the parser type
  const remainingAdapters = searchAdapters.filter(adapter => parserType !== adapter);

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

  // Fetch updated metadata (for audio and image) from Spotify if parser doesn't have them
  const spotifyLink = links.find(link => link.type === Adapter.Spotify);
  logger.info(
    `[${search.name}] Spotify link found: ${spotifyLink ? `${spotifyLink.url} (verified: ${spotifyLink.isVerified}, notAvailable: ${spotifyLink.notAvailable || false})` : 'none'}`
  );

  // Check if we need to fetch Spotify metadata
  const needsSpotifyMetadata =
    parserType !== Adapter.Spotify &&
    spotifyLink &&
    spotifyLink.isVerified &&
    !spotifyLink.notAvailable &&
    (!metadata.audio || !metadata.image); // Fetch if missing audio or image

  const [parsedMetadata, shortLink] = await Promise.all([
    needsSpotifyMetadata
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
            `[${search.name}] Spotify metadata - Title: "${spotifyMetadata.title}", Audio: ${spotifyMetadata.audio ? 'available' : 'none'}, Image: ${spotifyMetadata.image ? 'available' : 'none'}`
          );
          // Merge metadata: use Spotify's audio and image if original metadata doesn't have them
          return {
            ...metadata,
            audio: metadata.audio || spotifyMetadata.audio,
            image: metadata.image || spotifyMetadata.image,
          };
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
