import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import pretty from 'pino-pretty';

import { apiRouter } from './routes/api';

const stream = pretty({
  colorize: true,
});

export const app = new Elysia()
  .use(logger({ stream, level: 'info' }))
  .on('afterHandle', ctx => {
    ctx.log.info(ctx.request, 'Request');
  })
  .on('error', ({ code, error, log }) => {
    log.error(error);

    return {
      code,
      message: error.message,
    };
  })
  .use(apiRouter);
