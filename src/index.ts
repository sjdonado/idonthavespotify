import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';

import { logger } from './utils/logger';

import { apiRouter } from './routes/api';
import { pageRouter } from './routes/page';

export const app = new Elysia()
  .use(html())
  .use(staticPlugin({ prefix: '' }))
  .on('beforeHandle', async ({ request }) => {
    logger.info(
      `${request.method} ${request.url} - ${request.headers.get('user-agent')}`
    );
  })
  .use(apiRouter)
  .use(pageRouter);
