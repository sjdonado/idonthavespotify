import { Elysia, t } from 'elysia';

import { SPOTIFY_ID_REGEX } from '~/config/constants';
import { spotifySearch } from '~/services/search';

import MainLayout from '~/views/layouts/main';
import Home from '~/views/pages/home';

import SearchCard from '~/views/components/search-card';

export const pageRouter = new Elysia()
  .get('/', async () => {
    return (
      <MainLayout>
        <Home />
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
      body: t.Object({
        spotifyLink: t.RegExp(SPOTIFY_ID_REGEX),
      }),
    }
  );
