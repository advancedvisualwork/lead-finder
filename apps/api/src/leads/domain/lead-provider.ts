import type { Lead, LeadSource } from './lead';
import type { Niche } from './niche-catalog';

export interface LeadSearchCriteria {
  city: string;
  niche: Niche;
}

export interface LeadProvider {
  readonly source: LeadSource;
  search(criteria: LeadSearchCriteria): Promise<Lead[]>;
}

export const LEAD_PROVIDER = Symbol('LEAD_PROVIDER');
