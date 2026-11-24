import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { SearchLeadsService } from '../src/leads/application/search-leads.service';
import { TtlCache } from '../src/leads/application/ttl-cache';
import type { Lead } from '../src/leads/domain/lead';
import type { LeadProvider } from '../src/leads/domain/lead-provider';
import { searchLeadsQuerySchema } from '../src/leads/presentation/search-leads.query';

const lead = (name: string, phone = '', address = ''): Lead => ({
  id: `osm:node/${name}`,
  name,
  phone,
  address,
  niche: 'Academia',
  source: 'openstreetmap',
});

function createService(leads: Lead[]) {
  const provider: LeadProvider = { source: 'openstreetmap', search: vi.fn().mockResolvedValue(leads) };
  const service = new SearchLeadsService(provider, new TtlCache<Lead[]>(60_000, 10));
  return { service, provider };
}

describe('SearchLeadsService', () => {
  it('deduplicates, sorts and filters leads without phone when requested', async () => {
    const { service } = createService([lead('Zeta Fit', '(11) 1111-1111'), lead('Alpha Gym'), lead('Zeta Fit', '(11) 2222-2222')]);
    const all = await service.execute({ city: 'Campinas', niche: 'academia', onlyWithPhone: false });
    expect(all.leads.map((l) => l.name)).toEqual(['Alpha Gym', 'Zeta Fit']);

    const withPhone = await service.execute({ city: 'Campinas', niche: 'academia', onlyWithPhone: true });
    expect(withPhone.total).toBe(1);
    expect(withPhone.niche).toBe('Academia');
  });

  it('caches results and coalesces concurrent identical searches', async () => {
    const { service, provider } = createService([lead('Alpha Gym')]);
    const query = { city: 'Campinas', niche: 'academia', onlyWithPhone: false };
    await Promise.all([service.execute(query), service.execute({ ...query, city: 'CAMPINAS' })]);
    await service.execute(query);
    expect(provider.search).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const provider: LeadProvider = {
      source: 'openstreetmap',
      search: vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue([lead('Alpha Gym')]),
    };
    const service = new SearchLeadsService(provider, new TtlCache<Lead[]>(60_000, 10));
    const query = { city: 'Campinas', niche: 'academia', onlyWithPhone: false };
    await expect(service.execute(query)).rejects.toThrow('down');
    await expect(service.execute(query)).resolves.toMatchObject({ total: 1 });
  });
});

describe('searchLeadsQuerySchema', () => {
  it('accepts accented city names and normalizes whitespace', () => {
    const parsed = searchLeadsQuerySchema.parse({ city: '  São   José dos Campos, SP ', niche: 'dentista' });
    expect(parsed).toEqual({ city: 'São José dos Campos, SP', niche: 'dentista', onlyWithPhone: false });
  });

  it.each([
    { city: 'Campinas', niche: 'dentista', extra: '1' },
    { city: 'x', niche: 'dentista' },
    { city: '<script>', niche: 'dentista' },
    { city: 'Campinas', niche: 'amenity"=x' },
    { city: ['Campinas', 'Santos'], niche: 'dentista' },
  ])('rejects invalid input %o', (input) => {
    expect(searchLeadsQuerySchema.safeParse(input).success).toBe(false);
  });
});
