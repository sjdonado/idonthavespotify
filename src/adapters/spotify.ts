import * as config from '~/config/default';

import {
  ADAPTERS_QUERY_LIMIT,
  DEFAULT_TIMEOUT,
  SPOTIFY_LINK_DESKTOP_REGEX,
  SPOTIFY_LINK_MOBILE_REGEX,
} from '~/config/constants';
import { MetadataType, ServiceType } from '~/config/enum';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';
import { SearchMetadata, SearchResultLink } from '~/services/search';
import { responseMatchesQuery } from '~/utils/compare';
import { cacheSpotifyAccessToken, getCachedSpotifyAccessToken } from '~/services/cache';

interface SpotifyAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  [type: string]: {
    total: number;
    items: [
      {
        name: string;
        external_urls: {
          spotify: string;
        };
      },
    ];
  };
}

const SPOTIFY_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'show',
  [MetadataType.Podcast]: 'episode',
};

export async function getSpotifyLink(query: string, metadata: SearchMetadata) {
  const searchType = SPOTIFY_SEARCH_TYPES[metadata.type];

  if (!searchType) {
    return;
  }

  const params = new URLSearchParams({
    q: query,
    type: searchType,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(config.services.spotify.apiUrl);
  url.search = params.toString();

  try {
    const response = await HttpClient.get<SpotifySearchResponse>(url.toString(), {
      headers: {
        Authorization: `Bearer ${await getOrUpdateSpotifyAccessToken()}`,
      },
    });

    console.log('spotify response', response);

    const [[, data]] = Object.entries(response);

    if (data.total === 0) {
      throw new Error(`No results found: ${JSON.stringify(response)}`);
    }

    const [{ name, external_urls }] = data.items;

    if (!responseMatchesQuery(name ?? '', query)) {
      throw new Error(`Query does not match: ${JSON.stringify({ name })}`);
    }

    return {
      type: ServiceType.Spotify,
      url: external_urls.spotify,
      isVerified: true,
    } as SearchResultLink;
  } catch (error) {
    logger.error(`[Spotify] (${url}) ${error}`);
  }
}

export async function fetchSpotifyMetadata(spotifyLink: string) {
  let url = spotifyLink;

  const spotifyHeaders = {
    'User-Agent': `${config.services.spotify.clientVersion} (Macintosh; Apple Silicon)`,
  };

  let html = await HttpClient.get<string>(url, {
    headers: spotifyHeaders,
    timeout: DEFAULT_TIMEOUT / 2,
  });

  logger.info(`[${fetchSpotifyMetadata.name}] parse metadata: ${url}`);

  if (SPOTIFY_LINK_MOBILE_REGEX.test(spotifyLink)) {
    url = html.match(SPOTIFY_LINK_DESKTOP_REGEX)?.[0] ?? '';

    if (!url) {
      throw new Error('Invalid mobile spotify link');
    }

    // wait a random amount of time to avoid rate limiting
    await new Promise(res => setTimeout(res, Math.random() * 1000));

    logger.info(`[${fetchSpotifyMetadata.name}] parse metadata (desktop): ${url}`);

    html = await HttpClient.get<string>(url, {
      headers: spotifyHeaders,
      timeout: DEFAULT_TIMEOUT / 2,
      retries: 2,
    });
  }

  return html;
}

export async function getOrUpdateSpotifyAccessToken() {
  const cache = await getCachedSpotifyAccessToken();

  if (cache) {
    return cache;
  }

  const data = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const response = await HttpClient.post<SpotifyAuthResponse>(
    config.services.spotify.authUrl,
    data,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            config.services.spotify.clientId + ':' + config.services.spotify.clientSecret
          ).toString('base64'),
      },
    }
  );

  await cacheSpotifyAccessToken(response.access_token, response.expires_in);

  return response.access_token;
}
