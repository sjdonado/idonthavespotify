import * as config from '~/config/default';

import {
  DEFAULT_TIMEOUT,
  SPOTIFY_LINK_DESKTOP_REGEX,
  SPOTIFY_LINK_MOBILE_REGEX,
} from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

// TODO: https://github.com/sjdonado/idonthavespotify/issues/6
// import { cacheSpotifyAccessToken, getSpotifyAccessToken } from '~/services/cache';

// const authOptions = {
//   headers: {
//     Accept: 'application/json',
//     'Content-Type': 'application/x-www-form-urlencoded',
//     Authorization:
//       'Basic ' +
//       Buffer.from(
//         config.services.spotify.clientId + ':' + config.services.spotify.clientSecret
//       ).toString('base64'),
//   },
// };

// TODO: https://github.com/sjdonado/idonthavespotify/issues/6
// export const getOrUpdateSpotifyAccessToken = async () => {
//   const cache = await getSpotifyAccessToken();
//   if (cache) {
//     return cache;
//   }
//
//   const data = new URLSearchParams({
//     grant_type: 'client_credentials',
//   });
//
//   const response = await axios.post(config.services.spotify.authUrl, data, authOptions);
//
//   await cacheSpotifyAccessToken(response.data.access_token, response.data.expires_in);
//
//   return response.data.access_token;
// };

export async function fetchSpotifyMetadata(spotifyLink: string) {
  let url = spotifyLink;

  const spotifyHeaders = {
    'User-Agent': `${config.services.spotify.clientVersion} (Macintosh; Apple Silicon)`,
    // Authorization: `Bearer ${await getOrUpdateSpotifyAccessToken()}`,
  };

  let html = await HttpClient.get<string>(url, {
    headers: spotifyHeaders,
    timeout: DEFAULT_TIMEOUT / 2,
  });

  logger.info(`[${fetchSpotifyMetadata.name}] parse spotify metadata: ${url}`);

  if (SPOTIFY_LINK_MOBILE_REGEX.test(spotifyLink)) {
    url = html.match(SPOTIFY_LINK_DESKTOP_REGEX)?.[0] ?? '';

    if (!url) {
      throw new Error('Invalid mobile spotify link');
    }

    // wait a random amount of time to avoid rate limiting
    await new Promise(res => setTimeout(res, Math.random() * 1000));

    logger.info(
      `[${fetchSpotifyMetadata.name}] parse spotify metadata (desktop): ${url}`
    );

    html = await HttpClient.get<string>(url, {
      headers: spotifyHeaders,
      timeout: DEFAULT_TIMEOUT / 2,
      retries: 2,
    });
  }

  return html;
}
