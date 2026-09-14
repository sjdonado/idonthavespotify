import { z } from 'zod';

export const requestCodeSchema = z.object({
  body: z.object({
    email: z.string().min(3, { message: 'Enter a valid email address.' }).max(254),
  }),
});

export const verifyCodeSchema = z.object({
  body: z.object({
    email: z.string().min(3, { message: 'Enter a valid email address.' }).max(254),
    code: z.string().regex(/^\d{6}$/, { message: 'Enter the 6-digit code.' }),
  }),
});
