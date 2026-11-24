import { Logger, Module, type Provider } from '@nestjs/common';
import { appConfig } from '../config/app.config';
import { LEAD_CACHE, SearchLeadsService } from './application/search-leads.service';
import { TtlCache } from './application/ttl-cache';
import type { Lead } from './domain/lead';
import { LEAD_PROVIDER, type LeadProvider } from './domain/lead-provider';
import { GooglePlacesLeadProvider } from './infrastructure/google/google-places.provider';
import { NominatimClient } from './infrastructure/osm/nominatim.client';
import { OsmLeadProvider } from './infrastructure/osm/osm-lead.provider';
import { OverpassClient } from './infrastructure/osm/overpass.client';
import { LeadsController } from './presentation/leads.controller';

function createLeadProvider(): LeadProvider {
  const provider = appConfig.googlePlacesApiKey
    ? new GooglePlacesLeadProvider(appConfig, appConfig.googlePlacesApiKey)
    : new OsmLeadProvider(new NominatimClient(appConfig), new OverpassClient(appConfig));
  new Logger('LeadsModule').log(JSON.stringify({ event: 'lead_provider_selected', source: provider.source }));
  return provider;
}

const leadProvider: Provider = { provide: LEAD_PROVIDER, useFactory: createLeadProvider };
const leadCache: Provider = {
  provide: LEAD_CACHE,
  useFactory: () => new TtlCache<Lead[]>(appConfig.cacheTtlMs, appConfig.cacheMaxEntries),
};

@Module({
  controllers: [LeadsController],
  providers: [leadProvider, leadCache, SearchLeadsService],
})
export class LeadsModule {}
