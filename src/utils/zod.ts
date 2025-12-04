import type { ZodError } from 'zod';

export function validationError(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const errorKeys = Object.keys(fieldErrors);
  const firstError =
    errorKeys.length > 0
      ? fieldErrors[errorKeys[0] as keyof typeof fieldErrors]?.[0]
      : undefined;

  throw Response.json(
    {
      error: firstError ?? 'Validation error',
    },
    { status: 400 }
  );
}
