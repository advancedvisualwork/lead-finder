import { CityNotFoundError } from '../../../common/domain-errors';
import type { AppConfig } from '../../../config/app.config';
import { fetchJson } from '../http/fetch-json';
import { parseCityBoundary, type CityBoundary } from './city-boundary';

interface NominatimPlace {
  osm_type: string;
  osm_id: number;
  category?: string;
  name?: string;
  /** [south, north, west, east] as strings. */
  boundingbox?: string[];
  geojson?: { type?: string; coordinates?: unknown };
}

/** Simplification tolerance in degrees (~50 m): keeps the polygon small but precise enough. */
const POLYGON_THRESHOLD = '0.0005';

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface CityLocation {
  name: string;
  boundingBox: BoundingBox;
  boundary?: CityBoundary;
}

export function pickCityRelation(places: readonly NominatimPlace[]): NominatimPlace | undefined {
  const relations = places.filter((place) => place.osm_type === 'relation');
  return relations.find((place) => place.category === 'boundary') ?? relations[0];
}

export function parseBoundingBox(raw: readonly string[] | undefined): BoundingBox | undefined {
  const [south, north, west, east] = (raw ?? []).map(Number);
  const values = [south, north, west, east];
  if (values.length !== 4 || !values.every(Number.isFinite)) return undefined;
  return { south, west, north, east };
}

export class NominatimClient {
  constructor(private readonly config: AppConfig) {}

  async findCity(city: string): Promise<CityLocation> {
    const params = new URLSearchParams({
      q: city,
      countrycodes: this.config.countryCode,
      format: 'jsonv2',
      limit: '5',
      polygon_geojson: '1',
      polygon_threshold: POLYGON_THRESHOLD,
    });
    const places = await fetchJson<NominatimPlace[]>(`${this.config.nominatimUrl}/search?${params}`, {
      headers: { 'User-Agent': this.config.userAgent, 'Accept-Language': 'pt-BR' },
      timeoutMs: this.config.upstreamTimeoutMs,
    });
    const relation = pickCityRelation(Array.isArray(places) ? places : []);
    const boundingBox = parseBoundingBox(relation?.boundingbox);
    if (!relation || !boundingBox) {
      throw new CityNotFoundError(city);
    }
    return { name: relation.name?.trim() || city, boundingBox, boundary: parseCityBoundary(relation.geojson) };
  }
}
