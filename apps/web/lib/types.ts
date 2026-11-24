export interface NicheOption {
  id: string;
  label: string;
}

export type LeadSource = 'openstreetmap' | 'google-places';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  address: string;
  niche: string;
  city: string;
  website: string;
  instagram: string;
  source: LeadSource;
}

export interface LeadCounts {
  found: number;
  withPhone: number;
  withoutWebsite: number;
  withInstagram: number;
}

export interface LeadSearchResult {
  city: string;
  niche: string;
  source: LeadSource;
  total: number;
  counts: LeadCounts;
  leads: Lead[];
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
