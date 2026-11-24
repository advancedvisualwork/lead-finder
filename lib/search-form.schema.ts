import { z } from 'zod';
import type { MultiCitySearchParams } from './types';

/** Mirrors the API schema for instant feedback; the API remains the authority. */
const CITY_PATTERN = /^[\p{L}\p{M}\s'.,-]+$/u;
export const MAX_CITIES = 10;
export const MAX_LIMIT = 200;

export interface SearchFormValues {
  citiesText: string;
  niche: string;
  limit: string;
  onlyWithPhone: boolean;
  withoutWebsite: boolean;
  instagramCountsAsNoWebsite: boolean;
}

export type SearchFormErrors = Partial<Record<'cities' | 'niche' | 'limit', string>>;

const citySchema = z
  .string()
  .min(2, 'Cada cidade precisa de ao menos 2 caracteres.')
  .max(80, 'Cada cidade pode ter no máximo 80 caracteres.')
  .regex(CITY_PATTERN, 'Use apenas letras, espaços e pontuação simples (ex.: "Campinas, SP").');

const formSchema = z.object({
  cities: z
    .array(citySchema)
    .min(1, 'Informe ao menos uma cidade.')
    .max(MAX_CITIES, `Informe no máximo ${MAX_CITIES} cidades por busca.`),
  niche: z.string().min(1, 'Selecione um nicho.'),
  limit: z.coerce
    .number({ invalid_type_error: 'Informe um número.' })
    .int('Informe um número inteiro.')
    .min(1, 'O mínimo é 1 lead por cidade.')
    .max(MAX_LIMIT, `O máximo é ${MAX_LIMIT} leads por cidade.`),
});

/** One city per line (";" also accepted); blank lines and case-insensitive duplicates are dropped. */
export function parseCityList(text: string): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const raw of text.split(/[\n;]/)) {
    const city = raw.trim().replace(/\s+/g, ' ');
    const key = city.toLocaleLowerCase('pt-BR');
    if (!city || seen.has(key)) continue;
    seen.add(key);
    cities.push(city);
  }
  return cities;
}

type ValidationResult = { success: true; data: MultiCitySearchParams } | { success: false; errors: SearchFormErrors };

export function validateSearchForm(values: SearchFormValues): ValidationResult {
  const result = formSchema.safeParse({ cities: parseCityList(values.citiesText), niche: values.niche, limit: values.limit });
  if (!result.success) {
    const errors: SearchFormErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof SearchFormErrors;
      errors[field] ??= issue.path.length > 1 ? `Linha ${Number(issue.path[1]) + 1}: ${issue.message}` : issue.message;
    }
    return { success: false, errors };
  }
  return {
    success: true,
    data: {
      ...result.data,
      onlyWithPhone: values.onlyWithPhone,
      withoutWebsite: values.withoutWebsite,
      instagramCountsAsNoWebsite: values.instagramCountsAsNoWebsite,
    },
  };
}
