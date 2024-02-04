import * as config from '~/config/default';
import { ADAPTERS_QUERY_LIMIT } from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

import { SpotifyMetadata, SpotifyMetadataType } from '~/parsers/spotify';

import { SpotifyContentLink, SpotifyContentLinkType } from '~/services/search';
import { cacheTidalAuthToken, getTidalAuthToken } from '~/services/cache';

export type TidalAuthResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type TidalResponseItem = {
  resource: {
    id: string;
    album: {
      id: string;
    };
  } | null;
};

type TidalSearchResponse = {
  albums: TidalResponseItem[];
  artists: TidalResponseItem[];
  tracks: TidalResponseItem[];
  videos: TidalResponseItem[];
};

const TIDAL_SEARCH_TYPES = {
  [SpotifyMetadataType.Song]: 'TRACKS',
  [SpotifyMetadataType.Album]: 'ALBUMS',
  [SpotifyMetadataType.Playlist]: undefined,
  [SpotifyMetadataType.Artist]: 'ARTISTS',
  [SpotifyMetadataType.Podcast]: undefined,
  [SpotifyMetadataType.Show]: undefined,
};

export async function getTidalLink(query: string, metadata: SpotifyMetadata) {
  const type = TIDAL_SEARCH_TYPES[metadata.type];

  if (!type) {
    return;
  }

  const authToken = await getAuthToken();

  const params = new URLSearchParams({
    query,
    type,
    countryCode: config.services.tidal.countryCode,
    limit: String(ADAPTERS_QUERY_LIMIT),
  });

  const url = new URL(`${config.services.tidal.apiUrl}/search`);
  url.search = params.toString();

  try {
    const response = await HttpClient.get<TidalSearchResponse>(url.toString(), {
      headers: {
        Authorization: `${authToken.token_type} ${authToken.access_token}`,
        'Content-Type': 'application/vnd.tidal.v1+json',
      },
    });

    const albumId = response.albums?.[0]?.resource?.id;
    const trackAlbumId = response.tracks?.[0]?.resource?.album?.id;
    const trackId = response.tracks?.[0]?.resource?.id;
    const artistId = response.artists?.[0]?.resource?.id;

    let tidalLinkPath;

    if (type === SpotifyMetadataType.Song && trackAlbumId) {
      tidalLinkPath = `album/${trackAlbumId}/track/${trackId}`;
    }

    if (type === SpotifyMetadataType.Album && albumId) {
      tidalLinkPath = `album/${albumId}`;
    }

    if (type === SpotifyMetadataType.Artist && artistId) {
      tidalLinkPath = `artist/${artistId}`;
    }

    if (!tidalLinkPath) {
      return;
    }

    return {
      type: SpotifyContentLinkType.Tidal,
      url: `${config.services.tidal.baseUrl}/${tidalLinkPath}`,
      isVerified: true,
    } as SpotifyContentLink;
  } catch (error) {
    logger.error(`[Tidal] (${url}) ${error}`);
  }
}

async function getAuthToken() {
  const authToken = await getTidalAuthToken();

  if (authToken) {
    return authToken;
  }

  const b64Creds = Buffer.from(
    `${config.services.tidal.clientId}:${config.services.tidal.clientSecret}`
  ).toString('base64');

  const payload = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const response = await HttpClient.post<TidalAuthResponse>(
    config.services.tidal.authUrl,
    payload,
    {
      headers: {
        Authorization: `Basic ${b64Creds}`,
      },
    }
  );

  await cacheTidalAuthToken(response);

  return response;
}
