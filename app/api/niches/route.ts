import { NICHES } from '@/server/leads/domain/niche-catalog';

export const dynamic = 'force-static';

export function GET(): Response {
  return Response.json(NICHES.map(({ id, label }) => ({ id, label })));
}
