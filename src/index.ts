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
    logger.info(
      `${request.method} ${request.url} - ${request.headers.get('user-agent')} - ${
        request.body ? JSON.stringify(request.body) : 'no body'
      }`
    );
  })
  .use(apiRouter)
  .use(pageRouter);
