import { ProviderUnavailableError } from '../../../common/domain-errors';
import type { AppConfig } from '../../../config/app.config';
import type { OsmTag } from '../../domain/niche-catalog';
import { fetchJson } from '../http/fetch-json';
import type { BoundingBox } from './nominatim.client';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

const SAFE_TAG_PART = /^[a-z_:]+$/;
/** Kept below the client-side overpassTimeoutMs so the server gives up first. */
const OVERPASS_SERVER_TIMEOUT_S = 55;

function formatBoundingBox({ south, west, north, east }: BoundingBox): string {
  const values = [south, west, north, east];
  if (!values.every(Number.isFinite)) {
    throw new Error('Invalid bounding box');
  }
  return values.join(',');
}

/**
 * Uses a bounding box instead of `area()` because several public mirrors do not keep the
 * area index and answer 504. Tags come from the server-side niche whitelist; the regex
 * check is a defence-in-depth guard so a catalog edit can never inject Overpass QL.
 */
export function buildOverpassQuery(boundingBox: BoundingBox, tags: readonly OsmTag[], limit: number): string {
  if (!Number.isSafeInteger(limit)) {
    throw new Error('Invalid Overpass limit');
  }
  const bbox = formatBoundingBox(boundingBox);
  const selectors = tags.map(({ key, value }) => {
    if (!SAFE_TAG_PART.test(key) || !SAFE_TAG_PART.test(value)) {
      throw new Error(`Unsafe OSM tag: ${key}=${value}`);
    }
    return `nwr["${key}"="${value}"]["name"](${bbox});`;
  });
  return `[out:json][timeout:${OVERPASS_SERVER_TIMEOUT_S}];(${selectors.join('')});out tags center ${limit};`;
}

export class OverpassClient {
  /** Index of the last mirror that answered; tried first so dead mirrors don't add latency. */
  private preferredIndex = 0;

  constructor(private readonly config: AppConfig) {}

  async findElements(boundingBox: BoundingBox, tags: readonly OsmTag[]): Promise<OverpassElement[]> {
    const query = buildOverpassQuery(boundingBox, tags, this.config.maxResults);
    let lastError: unknown;
    for (const index of this.mirrorOrder()) {
      try {
        const elements = await this.queryEndpoint(this.config.overpassUrls[index], query);
        this.preferredIndex = index;
        return elements;
      } catch (error) {
        if (!(error instanceof ProviderUnavailableError)) throw error;
        lastError = error;
      }
    }
    throw new ProviderUnavailableError('All Overpass endpoints failed', { cause: lastError });
  }

  private mirrorOrder(): number[] {
    const total = this.config.overpassUrls.length;
    return Array.from({ length: total }, (_, offset) => (this.preferredIndex + offset) % total);
  }

  private async queryEndpoint(url: string, query: string): Promise<OverpassElement[]> {
    const response = await fetchJson<OverpassResponse>(url, {
      method: 'POST',
      headers: { 'User-Agent': this.config.userAgent, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data: query }).toString(),
      timeoutMs: this.config.overpassTimeoutMs,
    });
    return response.elements ?? [];
  }
}
