import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';

export default {
  tests: ['e2e/**/*.e2e.ts'],
  targets: [
    { name: 'desktop', engine: web({ viewport: { width: 1440, height: 900 } }) },
    { name: 'mobile', engine: web({ viewport: { width: 390, height: 844 } }) },
  ].map(target => ({
    ...target,
    app: {
      url: 'http://127.0.0.1:0',
      command: {
        executable: 'bun',
        args: [
          '--no-env-file',
          '--tsconfig-override',
          './e2e/tsconfig.json',
          './src/index.ts',
        ],
        env: {
          NODE_ENV: 'test',
          PORT: '{port}',
          APP_URL: 'http://127.0.0.1:{port}',
          YOUTUBE_API_URL: 'https://youtube.e2e.test',
          YOUTUBE_MUSIC_BASE_URL: 'https://music.youtube.com',
          YOUTUBE_API_KEY: 'fixture-only',
          DEEZER_API_URL: 'https://deezer.e2e.test/search',
          APPLE_MUSIC_API_URL: 'https://apple.e2e.test',
          SOUNDCLOUD_BASE_URL: 'https://soundcloud.e2e.test',
          QOBUZ_API_URL: 'https://qobuz.e2e.test',
          QOBUZ_APP_ID: 'fixture-only',
          QOBUZ_STREAM_URL: 'https://play.qobuz.com',
          QOBUZ_STORE_URL: 'https://www.qobuz.com',
          BANDCAMP_API_URL: 'https://bandcamp.e2e.test',
          BANDCAMP_BASE_URL: 'https://bandcamp.com',
          PANDORA_API_URL: 'https://pandora.e2e.test',
          JIOSAAVN_API_URL: 'https://jiosaavn.e2e.test',
          ITUNES_API_URL: 'https://itunes.e2e.test',
        },
      },
    },
  })),
  workers: 1,
  retries: 0,
  timeout: 30_000,
  trace: 'on',
  reporters: ['list', 'markdown', 'junit'],
} satisfies E2EConfig;
