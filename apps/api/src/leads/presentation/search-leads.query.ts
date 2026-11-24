import { z } from 'zod';
import { NICHE_IDS } from '../domain/niche-catalog';

/** Letters (any accent), spaces and the punctuation used in "Cidade, UF" / "Sant'Ana". */
const CITY_PATTERN = /^[\p{L}\p{M}\s'.,-]+$/u;

export const searchLeadsQuerySchema = z
  .object({
    city: z
      .string({ required_error: 'Informe a cidade.' })
      .trim()
      .min(2, 'A cidade deve ter ao menos 2 caracteres.')
      .max(80, 'A cidade deve ter no máximo 80 caracteres.')
      .regex(CITY_PATTERN, 'A cidade contém caracteres inválidos.')
      .transform((city) => city.replace(/\s+/g, ' ')),
    niche: z.enum(NICHE_IDS, { errorMap: () => ({ message: 'Nicho inválido.' }) }),
    onlyWithPhone: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  })
  .strict();

export type SearchLeadsQuery = z.output<typeof searchLeadsQuerySchema>;
