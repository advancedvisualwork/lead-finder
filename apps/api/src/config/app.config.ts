function parsePositiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

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

export const appConfig = Object.freeze({
  port: parsePositiveInteger(process.env.PORT, 3001),
  webOrigin: readOptional(process.env.WEB_ORIGIN) ?? 'http://localhost:3000',
  googlePlacesApiKey: readOptional(process.env.GOOGLE_PLACES_API_KEY),
  nominatimUrl: 'https://nominatim.openstreetmap.org',
  overpassUrls: readUrlList(process.env.OVERPASS_URLS) ?? DEFAULT_OVERPASS_URLS,
  userAgent: readOptional(process.env.NOMINATIM_USER_AGENT) ?? 'lead-finder/1.0',
  countryCode: 'br',
  upstreamTimeoutMs: 30_000,
  overpassTimeoutMs: 60_000,
  maxResults: 200,
  cacheTtlMs: FIFTEEN_MINUTES_MS,
  cacheMaxEntries: 200,
});

export type AppConfig = typeof appConfig;
