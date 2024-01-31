import axios from 'axios';
import * as config from '~/config/default';

import {
  SPOTIFY_LINK_DESKTOP_REGEX,
  SPOTIFY_LINK_MOBILE_REGEX,
} from '~/config/constants';

import HttpClient from '~/utils/http-client';
import { logger } from '~/utils/logger';

import { cacheSpotifyAccessToken, getSpotifyAccessToken } from '~/services/cache';

const authOptions = {
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization:
      'Basic ' +
      Buffer.from(
        config.services.spotify.clientId + ':' + config.services.spotify.clientSecret
      ).toString('base64'),
  },
};

export const getOrUpdateSpotifyAccessToken = async () => {
  const cache = await getSpotifyAccessToken();
  if (cache) {
    return cache;
  }

  const data = new URLSearchParams({
    grant_type: 'client_credentials',
  });

  const response = await axios.post(config.services.spotify.authUrl, data, authOptions);

  await cacheSpotifyAccessToken(response.data.access_token, response.data.expires_in);

  return response.data.access_token;
};

export async function fetchSpotifyMetadata(spotifyLink: string, retries = 3) {
  let url = spotifyLink;

  for (let i = 0; i < retries; i++) {
    try {
      let html = await HttpClient.get(url, true);

      logger.info(`Parsing Spotify metadata: ${url}`);

      if (SPOTIFY_LINK_MOBILE_REGEX.test(spotifyLink)) {
        url = html.match(SPOTIFY_LINK_DESKTOP_REGEX)?.[0];

        if (!url) {
          throw new Error(`Could not parse Spotify metadata. Desktop link not found.`);
        }

        // wait a random amount of time to avoid rate limiting
        await new Promise(res => setTimeout(res, Math.random() * 500 * (i + 1)));

        html = await HttpClient.get(url, true);
      }

      return { html, url };
    } catch (err) {
      logger.error(`Attempt ${i + 1} failed. Retrying...`);
      logger.error(err);
      await new Promise(res => setTimeout(res, 500 * (i + 1)));
    }
  }

  throw new Error('Failed to fetch Spotify metadata after multiple retries');
}
