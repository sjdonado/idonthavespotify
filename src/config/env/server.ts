interface ServerEnv {
  YOUTUBE_API_KEY: string;
  YOUTUBE_API_SEARCH_URL: string;
  DEEZER_API_URL: string;
  YOUTUBE_BASE_URL: string;
  APPLE_MUSIC_BASE_URL: string;
  TIDAL_BASE_URL: string;
  SOUNDCLOUD_BASE_URL: string;
  RECAPTCHA_SECRET_KEY: string;
  REDIS_URL: string;
}

const {
  YOUTUBE_API_KEY,
  YOUTUBE_API_SEARCH_URL,
  DEEZER_API_URL,
  YOUTUBE_BASE_URL,
  APPLE_MUSIC_BASE_URL,
  TIDAL_BASE_URL,
  SOUNDCLOUD_BASE_URL,
  REDIS_URL,
} = process.env as NodeJS.ProcessEnv & ServerEnv;

export const services = {
  youtube: {
    apiKey: YOUTUBE_API_KEY,
    apiSearchUrl: YOUTUBE_API_SEARCH_URL,
    baseUrl: YOUTUBE_BASE_URL,
  },
  deezer: {
    apiUrl: DEEZER_API_URL,
  },
  appleMusic: {
    baseUrl: APPLE_MUSIC_BASE_URL,
  },
  tidal: {
    baseUrl: TIDAL_BASE_URL,
  },
  soundCloud: {
    baseUrl: SOUNDCLOUD_BASE_URL,
  },
};

export const redis = {
  url: REDIS_URL,
};
