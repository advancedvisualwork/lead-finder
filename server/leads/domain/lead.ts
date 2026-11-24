export type LeadSource = 'openstreetmap' | 'google-places';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  address: string;
  niche: string;
  city: string;
  /** Business website (http/https). Social profiles never count as a website. */
  website: string;
  instagram: string;
  source: LeadSource;
}

export interface LeadCounts {
  /** Leads found before filters. */
  found: number;
  withPhone: number;
  withoutWebsite: number;
  withInstagram: number;
}

export interface LeadSearchResult {
  city: string;
  niche: string;
  source: LeadSource;
  /** Leads returned after filters and limit. */
  total: number;
  counts: LeadCounts;
  leads: Lead[];
}
