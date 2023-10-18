import { t } from 'elysia';

import { SPOTIFY_ID_REGEX } from '~/config/constants';

export const searchPayloadValidator = t.Object({
  spotifyLink: t.RegExp(SPOTIFY_ID_REGEX, { error: 'Invalid spotify link' }),
});
