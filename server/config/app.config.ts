function readOptional(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function readUrlList(raw: string | undefined): readonly string[] | undefined {
  const urls = (raw ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.startsWith('https://'));
  return urls.length > 0 ? urls : undefined;
}

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/** Public Overpass mirrors tried in order, so one instance being down does not break searches. */
const DEFAULT_OVERPASS_URLS: readonly string[] = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export interface AppConfig {
  readonly googlePlacesApiKey: string | undefined;
  readonly nominatimUrl: string;
  readonly overpassUrls: readonly string[];
  readonly userAgent: string;
  readonly countryCode: string;
  readonly upstreamTimeoutMs: number;
  readonly overpassHedgeDelayMs: number;
  readonly overpassTotalBudgetMs: number;
  readonly maxResults: number;
  readonly cacheTtlMs: number;
  readonly cacheMaxEntries: number;
  readonly rateLimitPerMinute: number;
}

/**
 * Timeouts are sized to fit one city search inside the 60 s Vercel function limit
 * (`maxDuration` in app/api/leads/route.ts): Nominatim 10 s + Overpass budget 45 s.
 */
export const appConfig: AppConfig = Object.freeze({
  googlePlacesApiKey: readOptional(process.env.GOOGLE_PLACES_API_KEY),
  nominatimUrl: 'https://nominatim.openstreetmap.org',
  overpassUrls: readUrlList(process.env.OVERPASS_URLS) ?? DEFAULT_OVERPASS_URLS,
  userAgent: readOptional(process.env.NOMINATIM_USER_AGENT) ?? 'lead-finder/1.0',
  countryCode: 'br',
  upstreamTimeoutMs: 10_000,
  /** A slow mirror gets this long before the next mirror is queried in parallel. */
  overpassHedgeDelayMs: 12_000,
  overpassTotalBudgetMs: 45_000,
  maxResults: 200,
  cacheTtlMs: FIFTEEN_MINUTES_MS,
  cacheMaxEntries: 200,
  rateLimitPerMinute: 30,
});
