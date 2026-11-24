/** Server types are the single source of truth; type-only imports add nothing to the client bundle. */
export type { Lead, LeadCounts, LeadSearchResult, LeadSource } from '@/server/leads/domain/lead';

export interface NicheOption {
  id: string;
  label: string;
}

export interface LeadFilters {
  niche: string;
  onlyWithPhone: boolean;
  withoutWebsite: boolean;
  instagramCountsAsNoWebsite: boolean;
  limit: number;
}

export interface MultiCitySearchParams extends LeadFilters {
  cities: string[];
}
