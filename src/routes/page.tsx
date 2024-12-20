import { Html } from '@elysiajs/html';
import { Elysia, InternalServerError } from 'elysia';

import { search } from '~/services/search';
import { logger } from '~/utils/logger';
import { legacyApiV1Validator, webValidator } from '~/validations/search';
import ErrorMessage from '~/views/components/error-message';
import SearchCard from '~/views/components/search-card';
import MainLayout from '~/views/layouts/main';
import Home from '~/views/pages/home';

export const pageRouter = new Elysia()
  .onError(({ error, code, set }) => {
    logger.error(`[pageRouter]: ${code}:${error}`);

    if (code === 'NOT_FOUND') {
      set.headers = {
        'HX-Location': '/',
      };
      return;
    }

    if (code === 'VALIDATION' || code === 'PARSE') {
      return <ErrorMessage message={error.message} />;
    }

    return <ErrorMessage message="Something went wrong, please try again later." />;
  })
  .get(
    '/',
    async ({ query: { id }, redirect, set }) => {
      try {
        const searchResult = id ? await search({ searchId: id }) : undefined;

        return (
          <MainLayout
            title={searchResult?.title}
            description={searchResult?.description}
            image={searchResult?.image}
          >
            <Home source={searchResult?.source}>
              {searchResult && <SearchCard searchResult={searchResult} />}
            </Home>
          </MainLayout>
        );
      } catch (error) {
        logger.error(`[indexRoute]: ${error}`);

        if (error instanceof InternalServerError) {
          set.status = 404;
          return redirect('/');
        }

        return (
          <MainLayout>
            <Home>
              <ErrorMessage message="Something went wrong, please try again later." />
            </Home>
          </MainLayout>
        );
      }
    },
    {
      query: webValidator.query,
    }
  )
  .post(
    '/search',
    async ({ body: { link } }) => {
      const searchResult = await search({ link });
      return <SearchCard searchResult={searchResult} />;
    },
    {
      body: legacyApiV1Validator.body,
    }
  );
