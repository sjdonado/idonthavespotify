import { Elysia, t } from 'elysia';

import { SPOTIFY_ID_REGEX } from '~/config/constants';
import { spotifySearch } from '~/services/search';

export const apiRouter = new Elysia({ prefix: '/api' }).get(
  '/search',
  async ({ query: { spotifyLink } }) => {
    const spotifyContent = await spotifySearch(spotifyLink);

    return spotifyContent;
  },
  {
    query: t.Object({
      spotifyLink: t.RegExp(SPOTIFY_ID_REGEX),
    }),
  }
);
