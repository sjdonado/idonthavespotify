import { version } from '../../package.json';

export const ENV = {
  adapters: {
    spotify: {
      apiUrl: Bun.env.SPOTIFY_API_URL!,
      authUrl: Bun.env.SPOTIFY_AUTH_URL!,
      clientId: Bun.env.SPOTIFY_CLIENT_ID!,
      clientSecret: Bun.env.SPOTIFY_CLIENT_SECRET!,
      clientVersion: Bun.env.SPOTIFY_CLIENT_VERSION!,
    },
    tidal: {
      baseUrl: Bun.env.TIDAL_BASE_URL!,
      apiUrl: Bun.env.TIDAL_API_URL!,
      authUrl: Bun.env.TIDAL_AUTH_URL!,
      clientId: Bun.env.TIDAL_CLIENT_ID!,
      clientSecret: Bun.env.TIDAL_CLIENT_SECRET!,
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
    soundCloud: {
      baseUrl: Bun.env.SOUNDCLOUD_BASE_URL!,
    },
  },
  utils: {
    urlShortener: {
      apiUrl: Bun.env.URL_SHORTENER_API_URL!,
      apiKey: Bun.env.URL_SHORTENER_API_KEY!,
    },
  },
  app: {
    url: Bun.env.APP_URL!,
    version: version,
  },
  cache: {
    databasePath: Bun.env.DATABASE_PATH ?? ':memory:',
    expTime: 60 * 60 * 24 * 7, // 1 week in seconds
  },
};
