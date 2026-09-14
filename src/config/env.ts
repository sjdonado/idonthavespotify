import { version } from '../../package.json';
import { getEdgeEnvVersion, readEnv } from './edge-env';
const buildEnv = () => ({
  adapters: {
    spotify: {
      apiUrl: readEnv('SPOTIFY_API_URL')!,
      baseUrl: readEnv('SPOTIFY_BASE_URL')!,
    },
    tidal: {
      baseUrl: readEnv('TIDAL_BASE_URL')!,
      apiUrl: readEnv('TIDAL_API_URL')!,
      authUrl: readEnv('TIDAL_AUTH_URL')!,
      clientId: readEnv('TIDAL_CLIENT_ID')!,
      clientSecret: readEnv('TIDAL_CLIENT_SECRET')!,
    },
    youTube: {
      apiUrl: readEnv('YOUTUBE_API_URL')!,
      apiKey: readEnv('YOUTUBE_API_KEY')!,
      musicBaseUrl: readEnv('YOUTUBE_MUSIC_BASE_URL')!,
    },
    deezer: {
      apiUrl: readEnv('DEEZER_API_URL')!,
    },
    appleMusic: {
      apiUrl: readEnv('APPLE_MUSIC_API_URL')!,
    },
    soundCloud: {
      baseUrl: readEnv('SOUNDCLOUD_BASE_URL')!,
    },
    qobuz: {
      apiUrl: readEnv('QOBUZ_API_URL')!,
      appId: readEnv('QOBUZ_APP_ID')!,
      streamUrl: readEnv('QOBUZ_STREAM_URL')!,
      storeUrl: readEnv('QOBUZ_STORE_URL')!,
    },
    bandcamp: {
      apiUrl: readEnv('BANDCAMP_API_URL')!,
      baseUrl: readEnv('BANDCAMP_BASE_URL')!,
    },
    pandora: {
      apiUrl: readEnv('PANDORA_API_URL')!,
    },
  },
  services: {},
  abuse: {
    // No separate flag: the gate arms exactly when a Plunk key exists.
    gateEnabled: (readEnv('PLUNK_API_KEY') ?? '').trim().length > 0,
    sessionSecret: readEnv('SESSION_SECRET'),
    plunkApiKey: readEnv('PLUNK_API_KEY'),
    plunkFromEmail: readEnv('PLUNK_FROM_EMAIL'),
    plunkTemplateId: readEnv('PLUNK_TEMPLATE_ID'),
    plunkApiUrl: readEnv('PLUNK_API_URL') ?? 'https://api.useplunk.com',
  },
  app: {
    url: readEnv('APP_URL')!,
    version: version,
    apiKeyBeta: readEnv('IDHS_API_KEY_BETA')!,
  },
  cache: {
    expTime: 60 * 60 * 24 * 7 * 4, // 4 weeks in seconds
  },
});

export type EnvShape = ReturnType<typeof buildEnv>;

let cached: EnvShape | undefined;
let cachedVersion = -1;

// Built on first access (not import) so Workers can set per-request
// bindings via setEdgeEnv before any config is read. The version check
// rebuilds if bindings ever change; on self-host this evaluates once
// from the process env, exactly like the old import-time object.
export const ENV: EnvShape = new Proxy({} as EnvShape, {
  get: (_target, prop: keyof EnvShape) => {
    const envVersion = getEdgeEnvVersion();
    if (!cached || envVersion !== cachedVersion) {
      cached = buildEnv();
      cachedVersion = envVersion;
    }
    return cached[prop];
  },
});
