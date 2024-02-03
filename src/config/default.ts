export const services = {
  spotify: {
    authUrl: Bun.env.SPOTIFY_AUTH_URL!,
    clientId: Bun.env.SPOTIFY_CLIENT_ID!,
    clientSecret: Bun.env.SPOTIFY_CLIENT_SECRET!,
    clientVersion: Bun.env.SPOTIFY_CLIENT_VERSION!,
  },
  youTube: {
    apiUrl: Bun.env.YOUTUBE_API_URL!,
    baseUrl: Bun.env.YOUTUBE_BASE_URL!,
    apiKey: Bun.env.YOUTUBE_API_KEY,
  },
  deezer: {
    apiUrl: Bun.env.DEEZER_API_URL!,
  },
  appleMusic: {
    apiUrl: Bun.env.APPLE_MUSIC_API_URL!,
  },
  tidal: {
    authUrl: Bun.env.TIDAL_AUTH_URL!,
    apiUrl: Bun.env.TIDAL_API_URL!,
    baseUrl: Bun.env.TIDAL_BASE_URL!,
    clientId: Bun.env.TIDAL_CLIENT_ID!,
    clientSecret: Bun.env.TIDAL_CLIENT_SECRET!,
    countryCode: Bun.env.TIDAL_COUNTRY_CODE!,
  },
  soundCloud: {
    baseUrl: Bun.env.SOUNDCLOUD_BASE_URL!,
  },
};

export const redis = {
  url: Bun.env.REDIS_URL!,
  searchCountKey: 'idonthavespotify:searchCount',
  cacheKey: 'idonthavespotify:cache:',
};
