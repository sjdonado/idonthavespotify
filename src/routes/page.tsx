import { Elysia } from 'elysia';

import { logger } from '~/utils/logger';

import { searchPayloadValidator } from '~/validations/search';

import { search } from '~/services/search';

import MainLayout from '~/views/layouts/main';
import Home from '~/views/pages/home';

import SearchCard from '~/views/components/search-card';
import ErrorMessage from '~/views/components/error-message';

export const pageRouter = new Elysia()
  .onError(({ error, set }) => {
    logger.error(error);

    set.status = 200;
    return <ErrorMessage />;
  })
  .get('/', async () => {
    return (
      <MainLayout>
        <Home />
      </MainLayout>
    );
  })
  .post(
    '/search',
    async ({ body: { link, searchId } }) => {
      const searchResult = await search(link, searchId);

      return <SearchCard searchResult={searchResult} />;
    },
    {
      body: searchPayloadValidator,
    }
  );
