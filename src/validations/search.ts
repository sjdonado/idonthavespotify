import { t } from 'elysia';

export const searchPayloadValidator = t.Intersect([
  t.Object({
    link: t.Optional(t.String({ minLength: 1, error: 'Invalid link' })),
    searchId: t.Optional(t.String()),
  }),
  t.Union([t.Object({ link: t.String() }), t.Object({ searchId: t.String() })]),
]);

export const apiVersionValidator = t.Object({
  v: t.String({
    pattern: '1',
    error: 'Unsupported API version',
  }),
});
