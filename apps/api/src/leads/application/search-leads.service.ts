import { Inject, Injectable } from '@nestjs/common';
import type { Lead, LeadSearchResult } from '../domain/lead';
import { LEAD_PROVIDER, type LeadProvider } from '../domain/lead-provider';
import { findNicheById, type Niche } from '../domain/niche-catalog';
import type { ExportLeadsQuery, SearchLeadsQuery } from '../presentation/search-leads.query';
import { dedupeAndSortLeads } from './dedupe-leads';
import { applyLeadFilters, countLeads } from './lead-filters';
import { TtlCache } from './ttl-cache';

export const LEAD_CACHE = Symbol('LEAD_CACHE');

@Injectable()
export class SearchLeadsService {
  /** Coalesces identical concurrent searches so upstream APIs are hit only once. */
  private readonly inFlight = new Map<string, Promise<Lead[]>>();

  constructor(
    @Inject(LEAD_PROVIDER) private readonly provider: LeadProvider,
    @Inject(LEAD_CACHE) private readonly cache: TtlCache<Lead[]>,
  ) {}

  async execute(query: SearchLeadsQuery): Promise<LeadSearchResult> {
    const niche = this.resolveNiche(query.niche);
    const allLeads = await this.findLeads(query.city, niche);
    const leads = applyLeadFilters(allLeads, query);
    return {
      city: query.city,
      niche: niche.label,
      source: this.provider.source,
      total: leads.length,
      counts: countLeads(allLeads, query.instagramCountsAsNoWebsite),
      leads,
    };
  }

  /** Cities run sequentially to respect the 1 req/s Nominatim policy; most hits come from cache. */
  async executeForCities(query: ExportLeadsQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    for (const city of query.city) {
      const result = await this.execute({ ...query, city });
      leads.push(...result.leads);
    }
    return leads;
  }

  private resolveNiche(nicheId: string): Niche {
    const niche = findNicheById(nicheId);
    if (!niche) {
      throw new Error(`Unknown niche passed validation: ${nicheId}`);
    }
    return niche;
  }

  private findLeads(city: string, niche: Niche): Promise<Lead[]> {
    const key = `${city.toLocaleLowerCase('pt-BR')}|${niche.id}`;
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.inFlight.get(key) ?? this.fetchAndCache(key, city, niche);
    this.inFlight.set(key, pending);
    return pending;
  }

  private async fetchAndCache(key: string, city: string, niche: Niche): Promise<Lead[]> {
    try {
      const leads = dedupeAndSortLeads(await this.provider.search({ city, niche }));
      this.cache.set(key, leads);
      return leads;
    } finally {
      this.inFlight.delete(key);
    }
  }
}
