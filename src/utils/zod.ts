import type { ZodError } from 'zod';

export function validationError(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstError = Object.values(fieldErrors)[0]?.[0] || 'Validation error';

  throw Response.json(
    {
      error: firstError,
    },
    { status: 400 }
  );
}
