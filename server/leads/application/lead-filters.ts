import type { Lead, LeadCounts } from '../domain/lead';

export interface LeadFilters {
  onlyWithPhone: boolean;
  withoutWebsite: boolean;
  /** When true, a lead whose only web presence is Instagram still counts as "sem site". */
  instagramCountsAsNoWebsite: boolean;
  limit: number;
}

export function hasNoWebsite(lead: Lead, instagramCountsAsNoWebsite: boolean): boolean {
  return !lead.website && (instagramCountsAsNoWebsite || !lead.instagram);
}

function matches(lead: Lead, filters: LeadFilters): boolean {
  if (filters.onlyWithPhone && !lead.phone) return false;
  return !filters.withoutWebsite || hasNoWebsite(lead, filters.instagramCountsAsNoWebsite);
}

/** Single O(n) pass; the limit is applied after filtering. */
export function applyLeadFilters(leads: readonly Lead[], filters: LeadFilters): Lead[] {
  const result: Lead[] = [];
  for (const lead of leads) {
    if (result.length >= filters.limit) break;
    if (matches(lead, filters)) result.push(lead);
  }
  return result;
}

export function countLeads(leads: readonly Lead[], instagramCountsAsNoWebsite: boolean): LeadCounts {
  const counts: LeadCounts = { found: leads.length, withPhone: 0, withoutWebsite: 0, withInstagram: 0 };
  for (const lead of leads) {
    if (lead.phone) counts.withPhone++;
    if (lead.instagram) counts.withInstagram++;
    if (hasNoWebsite(lead, instagramCountsAsNoWebsite)) counts.withoutWebsite++;
  }
  return counts;
}
