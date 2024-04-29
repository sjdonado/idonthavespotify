import { t } from 'elysia';

export const searchPayloadValidator = t.Union(
  [
    t.Object({
      link: t.String({ minLength: 1, error: 'Invalid link' }),
      searchId: t.Optional(t.String()),
    }),
    t.Object({
      link: t.Optional(t.String()),
      searchId: t.String({ error: 'Invalid searchId' }),
    }),
  ],
  { error: 'Invalid input' }
);

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
