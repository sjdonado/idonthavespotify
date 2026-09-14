import type { ZodError } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function firstValidationMessage(error: ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  const errorKeys = Object.keys(fieldErrors);
  return (
    (errorKeys.length > 0
      ? fieldErrors[errorKeys[0] as keyof typeof fieldErrors]?.[0]
      : undefined) ?? 'Validation error'
  );
}

export function validationError(error: ZodError): never {
  throw new ValidationError(firstValidationMessage(error));
}
