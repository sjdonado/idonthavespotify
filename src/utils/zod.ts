import type { ZodError } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validationError(error: ZodError): never {
  const fieldErrors = error.flatten().fieldErrors;
  const errorKeys = Object.keys(fieldErrors);
  const firstError =
    errorKeys.length > 0
      ? fieldErrors[errorKeys[0] as keyof typeof fieldErrors]?.[0]
      : undefined;

  throw new ValidationError(firstError ?? 'Validation error');
}
