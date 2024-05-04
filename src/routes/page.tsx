import { ERROR_CODE, Elysia, ValidationError, redirect } from 'elysia';

import { logger } from '~/utils/logger';

import { searchPayloadValidator } from '~/validations/search';

import { search } from '~/services/search';

import MainLayout from '~/views/layouts/main';
import Home from '~/views/pages/home';

import SearchCard from '~/views/components/search-card';
import ErrorMessage from '~/views/components/error-message';

export const pageRouter = new Elysia()
  .onError(({ error, code, set }) => {
    logger.error(`[pageRouter]: ${error}`);

    if (code === 'NOT_FOUND') {
      set.headers = {
        'HX-Location': '/',
      };

      return;
    }

    set.status = 200;

    if (code === 'VALIDATION' || code === 'PARSE') {
      return <ErrorMessage message={error.message} />;
    }

    return <ErrorMessage message="Something went wrong, try again later." />;
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
