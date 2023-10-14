import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { staticPlugin } from '@elysiajs/static';

import { logger } from '@bogeychan/elysia-logger';
import pretty from 'pino-pretty';

import { apiRouter } from './routes/api';
import { pageRouter } from './routes/page';

const stream = pretty({
  colorize: true,
});

export const app = new Elysia()
  .use(logger({ stream, level: 'info' }))
  .use(html())
  .use(staticPlugin({ prefix: '' }))
  .on('afterHandle', ({ log, request }) => {
    log.info(request, 'Request');
  })
  .use(apiRouter)
  .use(pageRouter);
