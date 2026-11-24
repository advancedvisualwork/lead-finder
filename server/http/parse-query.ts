import type { ZodType, ZodTypeDef } from 'zod';

export interface ValidationIssue {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super('Invalid query parameters');
    this.name = 'ValidationError';
  }
}

/** Repeated keys become arrays, so a strict schema rejects `?city=a&city=b` instead of picking one. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length === 1 ? values[0] : values;
  }
  return result;
}

export function parseQuery<TOutput>(schema: ZodType<TOutput, ZodTypeDef, unknown>, params: URLSearchParams): TOutput {
  const result = schema.safeParse(searchParamsToObject(params));
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}
