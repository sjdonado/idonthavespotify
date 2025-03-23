import { z } from 'zod';

import { ALLOWED_LINKS_REGEX } from '~/config/constants';
import { Adapter } from '~/config/enum';

const allowedAdapters = Object.values(Adapter);

export const apiRouteSchema = z.object({
  query: z.object({
    v: z.string().regex(/^1$/, { message: 'Unsupported API version' }),
  }),
  body: z.object({
    link: z.string().regex(new RegExp(ALLOWED_LINKS_REGEX), {
      message: 'Invalid link, please try with Spotify or Youtube links.',
    }),
    adapters: z
      .array(
        z.string().refine(value => allowedAdapters.includes(value as Adapter), {
          message: 'Invalid adapter, please use one of the allowed adapters.',
        })
      )
      .optional()
      .refine(val => val === undefined || Array.isArray(val), {
        message: 'Invalid adapters array, please provide an array of adapter types.',
      }),
  }),
});
