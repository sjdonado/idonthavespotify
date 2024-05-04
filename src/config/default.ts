import { version } from '../../package.json';

export const services = {
  spotify: {
    authUrl: Bun.env.SPOTIFY_AUTH_URL!,
    clientId: Bun.env.SPOTIFY_CLIENT_ID!,
    clientSecret: Bun.env.SPOTIFY_CLIENT_SECRET!,
    apiUrl: Bun.env.SPOTIFY_API_URL!,
    clientVersion: Bun.env.SPOTIFY_CLIENT_VERSION!,
  },
  youTube: {
    musicUrl: Bun.env.YOUTUBE_MUSIC_URL!,
    cookies: Bun.env.YOUTUBE_COOKIES!,
  },
  deezer: {
    apiUrl: Bun.env.DEEZER_API_URL!,
  },
  appleMusic: {
    apiUrl: Bun.env.APPLE_MUSIC_API_URL!,
  },
  tidal: {
    baseUrl: Bun.env.TIDAL_BASE_URL!,
  },
  soundCloud: {
    baseUrl: Bun.env.SOUNDCLOUD_BASE_URL!,
  },
};

export const metadata = {
  appVersion: version,
};

export const cache = {
  databasePath: Bun.env.DATABASE_PATH!,
  expTime: 60 * 60 * 24, // 1 day in seconds
};
