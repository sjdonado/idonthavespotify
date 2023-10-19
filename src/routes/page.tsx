import { Elysia } from 'elysia';

import { logger } from '~/utils/logger';
import { searchPayloadValidator } from '~/validations/search';

import { spotifySearch } from '~/services/search';
import { getSearchCount } from '~/services/statistics';

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
    const searchCount = await getSearchCount();

    return (
      <MainLayout>
        <Home searchCount={searchCount} />
      </MainLayout>
    );
  })
  .post(
    '/search',
    async ({ body: { spotifyLink } }) => {
      const spotifyContent = await spotifySearch(spotifyLink);

      return <SearchCard spotifyContent={spotifyContent} />;
    },
    {
      body: searchPayloadValidator,
    }
  );
