import { getRateLimiter, getSearchLeadsService } from '@/server/container';
import { toErrorResponse, tooManyRequests } from '@/server/http/error-response';
import { parseQuery } from '@/server/http/parse-query';
import { clientIpFrom } from '@/server/http/rate-limiter';
import { searchLeadsQuerySchema } from '@/server/leads/presentation/search-leads.query';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One city per request; upstream timeouts in app.config.ts are sized to finish within this. */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const decision = getRateLimiter().consume(clientIpFrom(request));
  if (!decision.allowed) return tooManyRequests(decision.retryAfterSeconds);
  try {
    const query = parseQuery(searchLeadsQuerySchema, new URL(request.url).searchParams);
    const result = await getSearchLeadsService().execute(query);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
