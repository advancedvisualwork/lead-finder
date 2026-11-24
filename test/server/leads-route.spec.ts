import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderUnavailableError } from '../../server/common/domain-errors';
import { FixedWindowRateLimiter } from '../../server/http/rate-limiter';

const execute = vi.fn();
let limiter = new FixedWindowRateLimiter(30, 60_000);

vi.mock('@/server/container', () => ({
  getSearchLeadsService: () => ({ execute }),
  getRateLimiter: () => limiter,
}));

const { GET, maxDuration } = await import('../../app/api/leads/route');

const request = (query: string, ip = '1.1.1.1') =>
  new Request(`http://localhost/api/leads?${query}`, { headers: { 'x-forwarded-for': ip } });

beforeEach(() => {
  execute.mockReset();
  limiter = new FixedWindowRateLimiter(30, 60_000);
});

describe('GET /api/leads', () => {
  it('validates the query and returns the service result', async () => {
    execute.mockResolvedValue({ total: 0, leads: [] });
    const response = await GET(request('city=Campinas%2C%20SP&niche=dentista&limit=10'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ city: 'Campinas, SP', niche: 'dentista', limit: 10 }));
  });

  it('rejects invalid or extra parameters with 400 and never calls the service', async () => {
    const response = await GET(request('city=%3Cscript%3E&niche=dentista&hack=1'));
    expect(response.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps an unavailable data source to 502', async () => {
    execute.mockRejectedValue(new ProviderUnavailableError('down'));
    expect((await GET(request('city=Campinas&niche=bar'))).status).toBe(502);
  });

  it('rate-limits per client IP with 429 and Retry-After', async () => {
    limiter = new FixedWindowRateLimiter(1, 60_000);
    execute.mockResolvedValue({ total: 0, leads: [] });
    await GET(request('city=Campinas&niche=bar'));
    const blocked = await GET(request('city=Campinas&niche=bar'));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect((await GET(request('city=Campinas&niche=bar', '2.2.2.2'))).status).toBe(200);
  });

  it('declares a function duration that fits the upstream timeout budget', () => {
    expect(maxDuration).toBe(60);
  });
});
