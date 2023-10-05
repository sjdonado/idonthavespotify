import { Elysia, t } from 'elysia';
import { SPOTIFY_ID_REGEX } from '~/config/constants';
import { getSpotifyContent } from '~/services/spotify';

export const apiRouter = new Elysia({ prefix: '/api' }).get(
  '/search',
  async ({ query: { spotifyLink } }) => {
    const spotifyContent = await getSpotifyContent(spotifyLink);

    return spotifyContent;
  },
  {
    query: t.Object({
      spotifyLink: t.RegExp(SPOTIFY_ID_REGEX),
    }),
  }
);
