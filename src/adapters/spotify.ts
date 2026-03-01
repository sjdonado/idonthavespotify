import { createHmac } from 'node:crypto';

import { AxiosError } from 'axios';

import { Adapter, MetadataType, Parser } from '~/config/enum';
import { ENV } from '~/config/env';
import {
  cacheSearchResultLink,
  cacheSpotifyAccessToken,
  getCachedSearchResultLink,
  getCachedSpotifyAccessToken,
} from '~/services/cache';
import type { SearchMetadata } from '~/services/search';
import { getOrUpdateAccessToken } from '~/utils/access-token';
import { findBestMatch, type MatchCandidate } from '~/utils/compare';
import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

interface SpotifyGraphQLResponse {
  data: {
    searchV2?: SpotifySearchResult;
    search?: SpotifySearchResult;
  };
}

interface SpotifySearchResult {
  tracks?: { items: Array<{ track: SpotifyTrackItem }> };
  albums?: { items: SpotifyAlbumItem[] };
  playlists?: { items: Array<{ data: SpotifyPlaylistItem }> };
  artists?: { items: Array<{ data: SpotifyArtistItem }> };
  episodes?: { items: Array<{ data: SpotifyEpisodeItem }> };
  podcasts?: { items: Array<{ data: SpotifyPodcastItem }> };
}

interface SpotifyTrackItem {
  uri: string;
  name: string;
  artists: { items: Array<{ profile: { name: string } }> };
}

interface SpotifyAlbumItem {
  uri: string;
  name: string;
  artists: { items: Array<{ profile: { name: string } }> };
}

interface SpotifyPlaylistItem {
  uri: string;
  name: string;
}

interface SpotifyArtistItem {
  uri: string;
  profile: { name: string };
}

interface SpotifyEpisodeItem {
  uri: string;
  name: string;
}

interface SpotifyPodcastItem {
  uri: string;
  name: string;
}

interface SpotifyTokenResponse {
  accessToken: string;
  accessTokenExpirationTimestampMs: number;
  isAnonymous: boolean;
}

const SPOTIFY_SEARCH_TYPES = {
  [MetadataType.Song]: 'track',
  [MetadataType.Album]: 'album',
  [MetadataType.Playlist]: 'playlist',
  [MetadataType.Artist]: 'artist',
  [MetadataType.Show]: 'show',
  [MetadataType.Podcast]: 'episode',
};

const SEARCH_DESKTOP_HASH =
  '75bbf6bfcfdf85b8fc828417bfad92b7cd66bf7f556d85670f4da8292373ebec';

const PLAYER_JS_REGEX = /"(https:\/\/[^" ]+\/(?:mobile-)?web-player\.[0-9a-f]+\.js)"/;
const SECRETS_REGEX = /\{\s*secret\s*:\s*["']([^"']+)["']\s*,\s*version\s*:\s*(\d+)\s*\}/g;

// Spotify rejects old Chrome UAs with an error page; HttpClient defaults are from 2021
const SPOTIFY_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

function uriToUrl(uri: string): string {
  // spotify:track:abc123 -> https://open.spotify.com/track/abc123
  const parts = uri.split(':');
  return `https://open.spotify.com/${parts[1]}/${parts[2]}`;
}

export async function getSpotifyLink(
  query: string,
  metadata: SearchMetadata,
  sourceParser: Parser,
  sourceId: string
) {
  const searchType = SPOTIFY_SEARCH_TYPES[metadata.type];
  if (!searchType) return null;

  const cache = await getCachedSearchResultLink(Adapter.Spotify, sourceParser, sourceId);
  if (cache) {
    logger.info(`[Spotify] cache hit`);
    return cache;
  }

  try {
    const accessToken = await getOrUpdateSpotifyAccessToken();

    const variables = {
      searchTerm: query,
      offset: 0,
      limit: 4,
      numberOfTopResults: 5,
    };
    const extensions = {
      persistedQuery: { version: 1, sha256Hash: SEARCH_DESKTOP_HASH },
    };

    const url = new URL(`${ENV.adapters.spotify.apiUrl}/query`);
    url.searchParams.set('operationName', 'searchDesktop');
    url.searchParams.set('variables', JSON.stringify(variables));
    url.searchParams.set('extensions', JSON.stringify(extensions));

    const data = await HttpClient.get<SpotifyGraphQLResponse>(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'app-platform': 'WebPlayer',
      },
    });

    const search = data.data?.searchV2 ?? data.data?.search;
    if (!search) {
      throw new Error(`No search results in response: ${JSON.stringify(data).substring(0, 200)}`);
    }

    const candidates = extractCandidates(search, searchType);

    if (candidates.length === 0) {
      throw new Error(`No ${searchType} results found for query: ${query}`);
    }

    const { bestMatch, highestScore } = findBestMatch(candidates, query, Adapter.Spotify);

    if (!bestMatch) {
      throw new Error('No valid matches found.');
    }

    logger.info(
      `[Spotify] Best match score: ${highestScore.toFixed(3)} (verified: ${bestMatch.isVerified ? 'yes' : 'no'}, available: ${!bestMatch.notAvailable ? 'yes' : 'no'})`
    );

    await cacheSearchResultLink(Adapter.Spotify, sourceParser, sourceId, bestMatch);

    return bestMatch;
  } catch (error) {
    const axiosErr = error instanceof AxiosError ? error : null;
    if (axiosErr) {
      const status = axiosErr.response?.status ?? axiosErr.code;
      const retryAfter = axiosErr.response?.headers?.['retry-after'];
      logger.error(
        `[Spotify] HTTP ${status} on ${axiosErr.config?.url}${retryAfter ? ` (retry-after: ${retryAfter}s)` : ''}`
      );
    } else {
      logger.error(`[Spotify] ${error}`);
    }
    return null;
  }
}

function extractCandidates(search: SpotifySearchResult, searchType: string): MatchCandidate[] {
  switch (searchType) {
    case 'track':
      return (search.tracks?.items ?? []).map(({ track }) => ({
        title: track.name,
        artist: track.artists?.items?.map(a => a.profile.name).join(', '),
        url: uriToUrl(track.uri),
      }));
    case 'album':
      return (search.albums?.items ?? []).map(album => ({
        title: album.name,
        artist: album.artists?.items?.map(a => a.profile.name).join(', '),
        url: uriToUrl(album.uri),
      }));
    case 'playlist':
      return (search.playlists?.items ?? []).map(({ data }) => ({
        title: data.name,
        url: uriToUrl(data.uri),
      }));
    case 'artist':
      return (search.artists?.items ?? []).map(({ data }) => ({
        title: data.profile.name,
        url: uriToUrl(data.uri),
      }));
    case 'episode':
      return (search.episodes?.items ?? []).map(({ data }) => ({
        title: data.name,
        url: uriToUrl(data.uri),
      }));
    case 'show':
      return (search.podcasts?.items ?? []).map(({ data }) => ({
        title: data.name,
        url: uriToUrl(data.uri),
      }));
    default:
      return [];
  }
}

export async function getOrUpdateSpotifyAccessToken() {
  return getOrUpdateAccessToken(
    getCachedSpotifyAccessToken,
    async () => {
      const TOKEN_FETCH_TIMEOUT = 10_000;

      const { serverTime } = await HttpClient.get<{ serverTime: number }>(
        `${ENV.adapters.spotify.baseUrl}/api/server-time`,
        { timeout: TOKEN_FETCH_TIMEOUT }
      );

      const html = await HttpClient.get<string>(ENV.adapters.spotify.baseUrl, {
        headers: { 'User-Agent': SPOTIFY_UA },
        timeout: TOKEN_FETCH_TIMEOUT,
      });

      logger.debug(
        `[Spotify] Homepage response type: ${typeof html}, length: ${typeof html === 'string' ? html.length : 'N/A'}`
      );

      const jsMatch = html.match(PLAYER_JS_REGEX);
      if (!jsMatch) {
        const anyJs =
          typeof html === 'string' ? html.match(/https:\/\/[^"'\s]+\.js/g) : null;
        throw new Error(
          `Failed to find web player JS bundle URL. ` +
            `Response type: ${typeof html}, length: ${typeof html === 'string' ? html.length : JSON.stringify(html).length}. ` +
            `JS files found: ${anyJs ? anyJs.join(', ') : 'none'}`
        );
      }

      logger.info(`[Spotify] Fetching web player JS: ${jsMatch[1]}`);
      const js = await HttpClient.get<string>(jsMatch[1], {
        timeout: TOKEN_FETCH_TIMEOUT,
      });

      let latestVersion = 0;
      let latestSecret = '';
      let match;
      while ((match = SECRETS_REGEX.exec(js)) !== null) {
        const version = parseInt(match[2]);
        if (version > latestVersion) {
          latestVersion = version;
          latestSecret = match[1];
        }
      }
      SECRETS_REGEX.lastIndex = 0;

      if (!latestSecret) {
        throw new Error(
          `Failed to extract TOTP secret from web player JS (${jsMatch[1]}), JS length: ${typeof js === 'string' ? js.length : 'not a string'}`
        );
      }

      logger.info(`[Spotify] TOTP secret version: ${latestVersion}`);
      const totp = generateTotp(serverTime, latestSecret);

      const tokenUrl = new URL(`${ENV.adapters.spotify.baseUrl}/api/token`);
      tokenUrl.searchParams.set('reason', 'init');
      tokenUrl.searchParams.set('productType', 'web-player');
      tokenUrl.searchParams.set('totp', totp);
      tokenUrl.searchParams.set('totpVer', latestVersion.toString());
      tokenUrl.searchParams.set('ts', serverTime.toString());

      const tokenData = await HttpClient.get<SpotifyTokenResponse>(tokenUrl.toString(), {
        headers: {
          Accept: 'application/json',
          Referer: `${ENV.adapters.spotify.baseUrl}/`,
          Origin: ENV.adapters.spotify.baseUrl,
        },
        timeout: TOKEN_FETCH_TIMEOUT,
      });

      if (!tokenData.accessToken) {
        throw new Error(
          `No access token in Spotify response: ${JSON.stringify(tokenData)}`
        );
      }

      logger.info(`[Spotify] Token obtained, anonymous: ${tokenData.isAnonymous}`);

      const expiresIn = Math.floor(
        (tokenData.accessTokenExpirationTimestampMs - Date.now()) / 1000
      );

      return { accessToken: tokenData.accessToken, expiresIn };
    },
    cacheSpotifyAccessToken
  );
}

function generateTotp(serverTime: number, secret: string): string {
  const secretArray = Array.from(secret, c => c.charCodeAt(0));
  const transformed = secretArray.map((element, index) => element ^ ((index % 33) + 9));

  const hexSecret = Buffer.from(transformed.join(''), 'utf8').toString('hex');
  const secretBytes = Buffer.from(hexSecret, 'hex');

  const counter = Math.floor(serverTime / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac('sha1', secretBytes);
  hmac.update(counterBuffer);
  const hmacResult = hmac.digest();

  const offset = hmacResult[hmacResult.length - 1] & 0xf;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  return (code % 10 ** 6).toString().padStart(6, '0');
}
