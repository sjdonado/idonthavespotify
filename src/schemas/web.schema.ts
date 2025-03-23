import { z } from 'zod';

export const webRouteSchema = {
  query: z.object({
    id: z.string().min(1, { message: 'Invalid search id' }).optional(),
  }),
};
