import { t } from 'elysia';

export const searchPayloadValidator = t.Object({
  link: t.String({ minLength: 1 }),
});

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
