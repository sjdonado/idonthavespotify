import { t } from 'elysia';

import { ALLOWED_LINKS_REGEX } from '~/config/constants';
import { Adapter } from '~/config/enum';

const allowedAdapters = Object.values(Adapter);

export const searchQueryValidator = t.Object({
  id: t.Optional(t.String({ minLength: 1, error: 'Invalid search id' })),
});

export const searchPayloadValidator = t.Object({
  link: t.RegExp(new RegExp(ALLOWED_LINKS_REGEX), {
    error: 'Invalid link, please try with Spotify or Youtube links.',
  }),
  adapters: t.Optional(
    t.Array(
      t.String({
        validate: (value: string) => allowedAdapters.includes(value as Adapter),
        error: 'Invalid adapter, please use one of the allowed adapters.',
      }),
      {
        error: 'Invalid adapters array, please provide an array of adapter types.',
      }
    )
  ),
});

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
