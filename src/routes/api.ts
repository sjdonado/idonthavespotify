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
        message: error.toString(),
      };
    })
    .post(
      '/search', // TODO: remove after new Raycast version is released
      async ({ body: { link, adapters } }) => {
        const searchResult = await search({
          link,
          adapters: adapters as Adapter[],
          headless: false,
        });
        return searchResult;
      },
      {
        query: legacyApiV1Validator.query,
        body: legacyApiV1Validator.body,
      }
    )
    .get(
      '/search',
      async ({ query }) => {
        const searchResult = await search({
          link: query.link,
          adapters: query._adapters as Adapter[],
          headless: Boolean(query.headless),
        });
        return searchResult;
      },
      {
        query: apiV2Validator.query,
        transform: apiV2Validator.transform,
      }
    )
);
