import axios from 'axios';
import * as config from '~/config/default';

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
