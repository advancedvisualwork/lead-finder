import type { Lead } from '../src/leads/domain/lead';

export const buildLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: `osm:node/${overrides.name ?? 'lead'}`,
  name: 'Padaria Pão Quente',
  phone: '',
  address: '',
  niche: 'Padaria',
  city: 'Campinas',
  website: '',
  instagram: '',
  source: 'openstreetmap',
  ...overrides,
});
