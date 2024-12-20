import { InternalServerError, t, ValidationError } from 'elysia';

import { ALLOWED_LINKS_REGEX } from '~/config/constants';
import { Adapter } from '~/config/enum';
import { ENV } from '~/config/env';

const allowedAdapters = Object.values(Adapter);

export const webValidator = {
  query: t.Object({
    id: t.Optional(t.String({ minLength: 1, error: 'Invalid search id' })),
  }),
};

export const legacyApiV1Validator = {
  query: t.Object({
    v: t.String({
      pattern: '1',
      error: 'Unsupported API version',
    }),
  }),
  body: t.Object({
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
  }),
};

export const apiV2Validator = {
  query: t.Object({
    link: t.RegExp(new RegExp(ALLOWED_LINKS_REGEX), {
      error: 'Invalid link, please try with Spotify or Youtube links.',
    }),
    adapters: t.Optional(
      t.String({
        error: 'Invalid adapters array, please provide a valid value.',
      })
    ),
    _adapters: t.Optional(
      t.Array(
        t.String({
          validate: (value: string) => allowedAdapters.includes(value as Adapter),
          error: 'Invalid adapter, please use one of the allowed adapters.',
        })
      )
    ),
    key: t.String({
      validate: (value: string) => value === ENV.app.apiKeyBeta,
      error: 'Invalid API key. Request one from the administrator.',
    }),
    v: t.String({
      pattern: '2',
      error: 'Unsupported API version',
    }),
  }),
  transform: ({ query }: { query: { adapters?: string; _adapters?: string[] } }) => {
    if (query.adapters) {
      if (typeof query.adapters === 'string') {
        query._adapters = query.adapters.split(',').map(adapter => adapter.trim());
      }
    }
  },
};
