import { Elysia } from 'elysia';

import { Adapter } from '~/config/enum';
import { search } from '~/services/search';
import { logger } from '~/utils/logger';
import { apiVersionValidator, searchPayloadValidator } from '~/validations/search';

export const apiRouter = new Elysia().group('/api', app =>
  app
    .onError(({ code, error }) => {
      logger.error(error);
      return {
        code,
        message: error.message,
      };
    })
    .post(
      '/search',
      async ({ body: { link, adapters } }) => {
        const searchResult = await search({ link, adapters: adapters as Adapter[] });
        return searchResult;
      },
      {
        body: searchPayloadValidator,
        query: apiVersionValidator,
      }
    )
);
