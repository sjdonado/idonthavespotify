import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { file, serve } from 'bun';

import { createRoutes } from './app';
import { logger } from './utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

// Static assets live in ./public on disk in dev, and in the embedded $bunfs
// tree (same relative layout) inside the compiled binary via --asset.
const publicDir = Bun.isStandaloneExecutable
  ? join(import.meta.dir, 'public')
  : join(import.meta.dir, '..', 'public');

if (!existsSync(join(publicDir, 'assets/index.min.css'))) {
  throw new Error(
    `[static] asset anchor missing under ${publicDir} (run \`bun run build\`; binaries need --asset ./public)`
  );
}

export const createApp = (port: string = '0') =>
  serve({
    port,
    routes: {
      ...createRoutes(),
      // Unknown paths fall through to Bun's default 404.
      '/assets/favicon.ico': new Response(
        file(join(publicDir, 'assets/favicon.ico'))
      ),
      '/assets/index.js': new Response(file(join(publicDir, 'assets/index.js'))),
      '/assets/index.css': new Response(file(join(publicDir, 'assets/index.css'))),
      '/assets/index.min.css': new Response(
        file(join(publicDir, 'assets/index.min.css'))
      ),
      '/llms.txt': new Response(file(join(publicDir, 'llms.txt'))),
    },

    development: !isProduction,
  });

if (import.meta.main) {
  const port = Bun.env['PORT'] ?? '3000';
  const app = createApp(port);

  logger.info(`Listening on ${app.url}`);
}
