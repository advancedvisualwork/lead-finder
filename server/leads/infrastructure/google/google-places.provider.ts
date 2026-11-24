import type { AppConfig } from '../../../config/app.config';
import type { Lead } from '../../domain/lead';
import type { LeadProvider, LeadSearchCriteria } from '../../domain/lead-provider';
import type { Niche } from '../../domain/niche-catalog';
import { classifyWebPresence } from '../../domain/web-presence';
import { fetchJson } from '../http/fetch-json';

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

interface GoogleSearchResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,nextPageToken';
const PAGE_SIZE = 20;
const MAX_PAGES = 3;

export function mapGooglePlace(place: GooglePlace, niche: Niche, city: string): Lead | null {
  const name = place.displayName?.text?.trim();
  if (!name) {
    return null;
  }
  return {
    id: `google:${place.id}`,
    name,
    phone: place.nationalPhoneNumber?.trim() ?? '',
    address: place.formattedAddress?.trim() ?? '',
    niche: niche.label,
    city,
    ...classifyWebPresence([place.websiteUri], []),
    source: 'google-places',
  };
}

export class GooglePlacesLeadProvider implements LeadProvider {
  readonly source = 'google-places' as const;

  constructor(
    private readonly config: AppConfig,
    private readonly apiKey: string,
  ) {}

  async search({ city, niche }: LeadSearchCriteria): Promise<Lead[]> {
    const textQuery = `${niche.label} em ${city}`;
    const leads: Lead[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await this.fetchPage(textQuery, pageToken);
      for (const place of response.places ?? []) {
        const lead = mapGooglePlace(place, niche, city);
        if (lead) leads.push(lead);
      }
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
    return leads;
  }

  private fetchPage(textQuery: string, pageToken?: string): Promise<GoogleSearchResponse> {
    return fetchJson<GoogleSearchResponse>(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, languageCode: 'pt-BR', regionCode: 'BR', pageSize: PAGE_SIZE, pageToken }),
      timeoutMs: this.config.upstreamTimeoutMs,
    });
  }
}
