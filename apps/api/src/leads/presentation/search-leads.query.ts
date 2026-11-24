import { z } from 'zod';
import { NICHE_IDS } from '../domain/niche-catalog';

/** Letters (any accent), spaces and the punctuation used in "Cidade, UF" / "Sant'Ana". */
const CITY_PATTERN = /^[\p{L}\p{M}\s'.,-]+$/u;
export const MAX_CITIES_PER_EXPORT = 10;
export const MAX_LEADS_PER_CITY = 200;

const citySchema = z
  .string({ required_error: 'Informe a cidade.' })
  .trim()
  .min(2, 'A cidade deve ter ao menos 2 caracteres.')
  .max(80, 'A cidade deve ter no máximo 80 caracteres.')
  .regex(CITY_PATTERN, 'A cidade contém caracteres inválidos.')
  .transform((city) => city.replace(/\s+/g, ' '));

const booleanFlag = (defaultValue: boolean) =>
  z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === 'true'));

const filterFields = {
  niche: z.enum(NICHE_IDS, { errorMap: () => ({ message: 'Nicho inválido.' }) }),
  onlyWithPhone: booleanFlag(false),
  withoutWebsite: booleanFlag(false),
  instagramCountsAsNoWebsite: booleanFlag(true),
  limit: z
    .string()
    .regex(/^\d{1,3}$/, 'O limite deve ser um número inteiro.')
    .optional()
    .transform((value) => (value === undefined ? MAX_LEADS_PER_CITY : Number(value)))
    .pipe(z.number().int().min(1, 'O limite mínimo é 1.').max(MAX_LEADS_PER_CITY, `O limite máximo é ${MAX_LEADS_PER_CITY}.`)),
};

export const searchLeadsQuerySchema = z.object({ city: citySchema, ...filterFields }).strict();

/** Export accepts the city parameter repeated (?city=A&city=B) to build one combined CSV. */
export const exportLeadsQuerySchema = z
  .object({
    city: z
      .union([citySchema.transform((city) => [city]), z.array(citySchema)])
      .pipe(
        z
          .array(z.string())
          .min(1, 'Informe ao menos uma cidade.')
          .max(MAX_CITIES_PER_EXPORT, `Máximo de ${MAX_CITIES_PER_EXPORT} cidades por exportação.`),
      ),
    ...filterFields,
  })
  .strict();

export type SearchLeadsQuery = z.output<typeof searchLeadsQuerySchema>;
export type ExportLeadsQuery = z.output<typeof exportLeadsQuerySchema>;
