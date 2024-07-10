import { t } from 'elysia';
import { SPOTIFY_LINK_REGEX, YOUTUBE_LINK_REGEX } from '~/config/constants';

export const searchQueryValidator = t.Object({
  id: t.Optional(t.String({ minLength: 1, error: 'Invalid search id' })),
});

export const searchPayloadValidator = t.Object({
  link: t.RegExp(
    new RegExp(`${SPOTIFY_LINK_REGEX.source}|${YOUTUBE_LINK_REGEX.source}`),
    {
      error: 'Invalid link, please try with Spotify or Youtube links.',
    }
  ),
});

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
