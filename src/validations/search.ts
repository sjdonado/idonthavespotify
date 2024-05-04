import { t } from 'elysia';
import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';

export const searchPayloadValidator = t.Union(
  [
    t.Object({
      link: t.RegExp(
        new RegExp(`${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}`),
        {
          error: 'Invalid link, please try again or open an issue on Github.',
        }
      ),
      searchId: t.Optional(t.String()),
    }),
    t.Object({
      link: t.Optional(t.String()),
      searchId: t.String({ error: 'Invalid searchId' }),
    }),
  ],
  {
    error: 'Invalid link, please try with Spotify or Youtube links.',
  }
);

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
