import { z } from 'zod';

import { ALLOWED_LINKS_REGEX } from '~/config/constants';

export const indexRouteSchema = z.object({
  query: z.object({
    id: z.string().min(1, { message: 'Invalid search id' }).optional(),
  }),
});

export const searchRouteSchema = z.object({
  body: z.object({
    link: z.string().regex(new RegExp(ALLOWED_LINKS_REGEX), {
      message: 'Invalid link, please try with Spotify, YouTube, Apple Music, Deezer, SoundCloud, Tidal, Pandora, or Google Music Share links.',
    }),
  }),
});
