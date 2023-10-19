import { t } from 'elysia';

import { SPOTIFY_LINK_REGEX } from '~/config/constants';

export const searchPayloadValidator = t.Object({
  spotifyLink: t.RegExp(SPOTIFY_LINK_REGEX, { error: 'Invalid spotify link' }),
});
