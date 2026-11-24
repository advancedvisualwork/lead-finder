import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { SearchLeadsService } from '../src/leads/application/search-leads.service';
import { TtlCache } from '../src/leads/application/ttl-cache';
import type { Lead } from '../src/leads/domain/lead';
import type { LeadProvider } from '../src/leads/domain/lead-provider';
import { exportLeadsQuerySchema, searchLeadsQuerySchema } from '../src/leads/presentation/search-leads.query';
import { buildLead } from './factories';

const lead = (name: string, overrides: Partial<Lead> = {}) => buildLead({ name, niche: 'Academia', ...overrides });

const baseQuery = {
  city: 'Campinas',
  niche: 'academia',
  onlyWithPhone: false,
  withoutWebsite: false,
  instagramCountsAsNoWebsite: true,
  limit: 200,
};

function createService(search: LeadProvider['search']) {
  const provider: LeadProvider = { source: 'openstreetmap', search: vi.fn(search) };
  return { service: new SearchLeadsService(provider, new TtlCache<Lead[]>(60_000, 10)), provider };
}

describe('SearchLeadsService', () => {
  it('deduplicates, sorts, filters by phone and reports counts before filters', async () => {
    const { service } = createService(async () => [
      lead('Zeta Fit', { phone: '(11) 1111-1111' }),
      lead('Alpha Gym'),
      lead('Zeta Fit', { phone: '(11) 2222-2222' }),
    ]);
    const all = await service.execute(baseQuery);
    expect(all.leads.map((l) => l.name)).toEqual(['Alpha Gym', 'Zeta Fit']);

    const withPhone = await service.execute({ ...baseQuery, onlyWithPhone: true });
    expect(withPhone.total).toBe(1);
    expect(withPhone.counts).toEqual({ found: 2, withPhone: 1, withoutWebsite: 2, withInstagram: 0 });
  });

  it('filters "sem site" honouring the Instagram option and applies the per-city limit', async () => {
    const { service } = createService(async () => [
      lead('A Site', { website: 'https://a.com.br/' }),
      lead('B Insta', { instagram: 'https://www.instagram.com/b' }),
      lead('C Nada'),
      lead('D Nada'),
    ]);
    const instaCounts = await service.execute({ ...baseQuery, withoutWebsite: true });
    expect(instaCounts.leads.map((l) => l.name)).toEqual(['B Insta', 'C Nada', 'D Nada']);

    const instaIsPresence = await service.execute({ ...baseQuery, withoutWebsite: true, instagramCountsAsNoWebsite: false });
    expect(instaIsPresence.leads.map((l) => l.name)).toEqual(['C Nada', 'D Nada']);
    expect(instaIsPresence.counts.withoutWebsite).toBe(2);

    const limited = await service.execute({ ...baseQuery, limit: 2 });
    expect(limited.total).toBe(2);
    expect(limited.counts.found).toBe(4);
  });

  it('combines several cities for export, searching each one', async () => {
    const { service, provider } = createService(async ({ city }) => [lead(`Gym ${city}`, { city })]);
    const leads = await service.executeForCities({ ...baseQuery, city: ['Campinas', 'Santos'] });
    expect(leads.map((l) => l.city)).toEqual(['Campinas', 'Santos']);
    expect(provider.search).toHaveBeenCalledTimes(2);
  });

  it('caches results and coalesces concurrent identical searches', async () => {
    const { service, provider } = createService(async () => [lead('Alpha Gym')]);
    await Promise.all([service.execute(baseQuery), service.execute({ ...baseQuery, city: 'CAMPINAS' })]);
    await service.execute(baseQuery);
    expect(provider.search).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue([lead('Alpha Gym')]);
    const service = new SearchLeadsService({ source: 'openstreetmap', search }, new TtlCache<Lead[]>(60_000, 10));
    await expect(service.execute(baseQuery)).rejects.toThrow('down');
    await expect(service.execute(baseQuery)).resolves.toMatchObject({ total: 1 });
  });
});

describe('searchLeadsQuerySchema', () => {
  it('accepts accented city names, normalizes whitespace and applies defaults', () => {
    const parsed = searchLeadsQuerySchema.parse({ city: '  São   José dos Campos, SP ', niche: 'dentista' });
    expect(parsed).toEqual({
      city: 'São José dos Campos, SP',
      niche: 'dentista',
      onlyWithPhone: false,
      withoutWebsite: false,
      instagramCountsAsNoWebsite: true,
      limit: 200,
    });
  });

  it.each([
    { city: 'Campinas', niche: 'dentista', extra: '1' },
    { city: 'x', niche: 'dentista' },
    { city: '<script>', niche: 'dentista' },
    { city: 'Campinas', niche: 'amenity"=x' },
    { city: ['Campinas', 'Santos'], niche: 'dentista' },
    { city: 'Campinas', niche: 'dentista', limit: '0' },
    { city: 'Campinas', niche: 'dentista', limit: '201' },
    { city: 'Campinas', niche: 'dentista', limit: '1e2' },
    { city: 'Campinas', niche: 'dentista', withoutWebsite: 'yes' },
  ])('rejects invalid input %o', (input) => {
    expect(searchLeadsQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('exportLeadsQuerySchema', () => {
  it('accepts one or several cities (repeated parameter)', () => {
    expect(exportLeadsQuerySchema.parse({ city: 'Campinas', niche: 'bar' }).city).toEqual(['Campinas']);
    expect(exportLeadsQuerySchema.parse({ city: ['Campinas', ' Santos '], niche: 'bar', limit: '50' })).toMatchObject({
      city: ['Campinas', 'Santos'],
      limit: 50,
    });
  });

  it('rejects more than 10 cities or any invalid city in the list', () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Cidade ${String.fromCharCode(65 + i)}`);
    expect(exportLeadsQuerySchema.safeParse({ city: eleven, niche: 'bar' }).success).toBe(false);
    expect(exportLeadsQuerySchema.safeParse({ city: ['Campinas', '<x>'], niche: 'bar' }).success).toBe(false);
    expect(exportLeadsQuerySchema.safeParse({ city: [], niche: 'bar' }).success).toBe(false);
  });
});
