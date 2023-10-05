import { Elysia } from 'elysia';
import { logger } from '@bogeychan/elysia-logger';
import pretty from 'pino-pretty';

import { apiRouter } from './routes/api';

const stream = pretty({
  colorize: true,
});

const app = new Elysia()
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
  .use(apiRouter)
  .listen(Bun.env.PORT ?? 3000);

console.log(`Server is running at ${app.server?.hostname}:${app.server?.port}`);
