import { z } from 'zod';

/** Mirrors the API schema for instant feedback; the API remains the authority. */
const CITY_PATTERN = /^[\p{L}\p{M}\s'.,-]+$/u;

export const searchFormSchema = z.object({
  city: z
    .string()
    .trim()
    .min(2, 'Informe a cidade (mínimo 2 caracteres).')
    .max(80, 'A cidade deve ter no máximo 80 caracteres.')
    .regex(CITY_PATTERN, 'Use apenas letras, espaços e pontuação simples (ex.: "Campinas, SP").'),
  niche: z.string().min(1, 'Selecione um nicho.'),
  onlyWithPhone: z.boolean(),
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;
export type SearchFormErrors = Partial<Record<keyof SearchFormValues, string>>;

export function validateSearchForm(values: SearchFormValues):
  | { success: true; data: SearchFormValues }
  | { success: false; errors: SearchFormErrors } {
  const result = searchFormSchema.safeParse(values);
  if (result.success) return { success: true, data: result.data };
  const errors: SearchFormErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof SearchFormValues;
    errors[field] ??= issue.message;
  }
  return { success: false, errors };
}
