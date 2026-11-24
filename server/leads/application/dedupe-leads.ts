import type { Lead } from '../domain/lead';

function identityKey(lead: Lead): string {
  return `${lead.name}|${lead.address}`.toLocaleLowerCase('pt-BR');
}

/** O(n) deduplication via Set, then alphabetical ordering (O(n log n)). */
export function dedupeAndSortLeads(leads: readonly Lead[]): Lead[] {
  const seen = new Set<string>();
  const unique: Lead[] = [];
  for (const lead of leads) {
    const key = identityKey(lead);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(lead);
  }
  return unique.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
