import { Elysia } from 'elysia';

import { Adapter } from '~/config/enum';
import { search } from '~/services/search';
import { logger } from '~/utils/logger';
import { apiV2Validator, legacyApiV1Validator } from '~/validations/search';

export const apiRouter = new Elysia().group('/api', app =>
  app
    .onError(({ code, error }) => {
      logger.error(error);
      return {
        code,
        message: error.message,
      };
    })
    .get(
      '/search',
      async ({ query: { link, adapters } }) => {
        const searchResult = await search({ link, adapters: adapters as Adapter[] });
        return searchResult;
      },
      {
        query: apiV2Validator.query,
      }
    )
    .post(
      '/search',
      async ({ body: { link, adapters } }) => {
        const searchResult = await search({ link, adapters: adapters as Adapter[] });
        return searchResult;
      },
      {
        query: legacyApiV1Validator.query,
        body: legacyApiV1Validator.body,
      }
    )
);
