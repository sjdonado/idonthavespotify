import { Elysia } from 'elysia';

import { logger } from '~/utils/logger';
import { searchPayloadValidator } from '~/validations/search';

import { spotifySearch } from '~/services/search';

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
      async ({ query: { spotifyLink } }) => {
        const spotifyContent = await spotifySearch(spotifyLink);

        return spotifyContent;
      },
      {
        query: searchPayloadValidator,
      }
    )
);
