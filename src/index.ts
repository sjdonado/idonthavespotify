import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';

import { logger } from './utils/logger';

import { apiRouter } from './routes/api';
import { pageRouter } from './routes/page';

export const app = new Elysia()
  .use(html())
  .use(staticPlugin({ prefix: '' }))
  .on('beforeHandle', ({ request }) => {
    logger.info({
      url: request.url,
      method: request.method,
      headers: {
        host: request.headers.get('host'),
        'user-agent': request.headers.get('user-agent'),
      },
      body: request.body,
    });
  })
  .use(apiRouter)
  .use(pageRouter);
