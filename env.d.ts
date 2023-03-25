interface ImportMetaEnv {
  readonly VITE_YOUTUBE_API_KEY: string;
  readonly VITE_YOUTUBE_API_SEARCH_URL: string;
  readonly VITE_YOUTUBE_BASE_URL: string;
  readonly VITE_APPLE_MUSIC_BASE_URL: string;
  readonly VITE_TIDAL_BASE_URL: string;
  readonly VITE_SOUNDCLOUD_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
