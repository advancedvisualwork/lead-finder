import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CityNotFoundError, ProviderUnavailableError } from '../../server/common/domain-errors';
import { toErrorResponse } from '../../server/http/error-response';
import { parseQuery, searchParamsToObject, ValidationError } from '../../server/http/parse-query';
import { clientIpFrom, FixedWindowRateLimiter } from '../../server/http/rate-limiter';

describe('searchParamsToObject / parseQuery', () => {
  it('turns repeated keys into arrays so strict schemas can reject them', () => {
    expect(searchParamsToObject(new URLSearchParams('a=1&b=2&b=3'))).toEqual({ a: '1', b: ['2', '3'] });
    const schema = z.object({ a: z.string() }).strict();
    expect(() => parseQuery(schema, new URLSearchParams('a=1&a=2'))).toThrow(ValidationError);
    expect(() => parseQuery(schema, new URLSearchParams('a=1&x=2'))).toThrow(ValidationError);
    expect(parseQuery(schema, new URLSearchParams('a=1'))).toEqual({ a: '1' });
  });
});

describe('toErrorResponse', () => {
  it.each([
    [new ValidationError([{ field: 'city', message: 'x' }]), 400],
    [new CityNotFoundError('Atlantida'), 404],
    [new ProviderUnavailableError('down'), 502],
    [new Error('secret internal detail at /srv/app.ts:42'), 500],
  ])('maps %o to %i without leaking internals', async (error, status) => {
    const response = toErrorResponse(error);
    expect(response.status).toBe(status);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain('secret internal detail');
    expect(body).not.toContain('stack');
  });
});

describe('FixedWindowRateLimiter', () => {
  it('blocks after the limit and resets after the window', () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 60_000, 100, () => now);
    expect(limiter.consume('ip').allowed).toBe(true);
    expect(limiter.consume('ip').allowed).toBe(true);
    expect(limiter.consume('ip')).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.consume('other').allowed).toBe(true);
    now = 60_000;
    expect(limiter.consume('ip').allowed).toBe(true);
  });

  it('never keeps more than maxKeys windows in memory', () => {
    const limiter = new FixedWindowRateLimiter(1, 60_000, 3, () => 0);
    for (let i = 0; i < 50; i++) limiter.consume(`ip-${i}`);
    expect(limiter.size).toBeLessThanOrEqual(3);
  });
});

describe('clientIpFrom', () => {
  it('uses the first x-forwarded-for entry, then x-real-ip', () => {
    expect(clientIpFrom(new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } }))).toBe('1.2.3.4');
    expect(clientIpFrom(new Request('http://x', { headers: { 'x-real-ip': '5.6.7.8' } }))).toBe('5.6.7.8');
    expect(clientIpFrom(new Request('http://x'))).toBe('unknown');
  });
});
