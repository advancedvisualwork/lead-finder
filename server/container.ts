import 'server-only';
import { appConfig } from './config/app.config';
import { FixedWindowRateLimiter } from './http/rate-limiter';
import { SearchLeadsService } from './leads/application/search-leads.service';
import { TtlCache } from './leads/application/ttl-cache';
import type { Lead } from './leads/domain/lead';
import type { LeadProvider } from './leads/domain/lead-provider';
import { GooglePlacesLeadProvider } from './leads/infrastructure/google/google-places.provider';
import { NominatimClient } from './leads/infrastructure/osm/nominatim.client';
import { OsmLeadProvider } from './leads/infrastructure/osm/osm-lead.provider';
import { OverpassClient } from './leads/infrastructure/osm/overpass.client';

const ONE_MINUTE_MS = 60_000;

function createLeadProvider(): LeadProvider {
  const provider = appConfig.googlePlacesApiKey
    ? new GooglePlacesLeadProvider(appConfig, appConfig.googlePlacesApiKey)
    : new OsmLeadProvider(new NominatimClient(appConfig), new OverpassClient(appConfig));
  console.info(JSON.stringify({ event: 'lead_provider_selected', source: provider.source }));
  return provider;
}

function createSearchLeadsService(): SearchLeadsService {
  return new SearchLeadsService(createLeadProvider(), new TtlCache<Lead[]>(appConfig.cacheTtlMs, appConfig.cacheMaxEntries));
}

/**
 * Singletons live on globalThis so a warm serverless instance (and `next dev` hot reload)
 * reuses the cache, the in-flight map and the rate limiter between requests.
 */
const registry = globalThis as typeof globalThis & {
  __leadFinderService?: SearchLeadsService;
  __leadFinderRateLimiter?: FixedWindowRateLimiter;
};

export function getSearchLeadsService(): SearchLeadsService {
  registry.__leadFinderService ??= createSearchLeadsService();
  return registry.__leadFinderService;
}

export function getRateLimiter(): FixedWindowRateLimiter {
  registry.__leadFinderRateLimiter ??= new FixedWindowRateLimiter(appConfig.rateLimitPerMinute, ONE_MINUTE_MS);
  return registry.__leadFinderRateLimiter;
}
