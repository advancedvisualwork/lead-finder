export type LeadSource = 'openstreetmap' | 'google-places';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  address: string;
  niche: string;
  source: LeadSource;
}

export interface LeadSearchResult {
  city: string;
  niche: string;
  source: LeadSource;
  total: number;
  leads: Lead[];
}
