import { Elysia } from 'elysia';

import { logger } from '~/utils/logger';

import { apiVersionValidator, searchPayloadValidator } from '~/validations/search';

import { search } from '~/services/search';

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
      async ({ body: { link } }) => {
        const searchResult = await search(link);

        return searchResult;
      },
      {
        body: searchPayloadValidator,
        query: apiVersionValidator,
      }
    )
);
