import type { Lead } from '../../domain/lead';
import type { Niche } from '../../domain/niche-catalog';
import { normalizeBrazilianPhone } from '../../domain/phone';
import { classifyWebPresence } from '../../domain/web-presence';
import type { OverpassElement } from './overpass.client';

type Tags = Record<string, string>;

const PHONE_TAG_KEYS = ['phone', 'contact:phone', 'mobile', 'contact:mobile', 'contact:whatsapp'] as const;
const WEBSITE_TAG_KEYS = ['website', 'contact:website', 'url'] as const;
const INSTAGRAM_TAG_KEYS = ['contact:instagram', 'instagram'] as const;

function extractPhone(tags: Tags): string {
  const raw = PHONE_TAG_KEYS.map((key) => tags[key]).find((value) => value?.trim());
  // OSM allows several numbers separated by ";" — keep the first one for the lead.
  return raw ? normalizeBrazilianPhone(raw.split(';')[0]) : '';
}

/** OSM multi-value tags use ";" — every value is a candidate (e.g. "instagram;site"). */
function splitTagValues(tags: Tags, keys: readonly string[]): string[] {
  return keys.flatMap((key) => tags[key]?.split(';') ?? []);
}

function formatAddress(tags: Tags): string {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  return [street, tags['addr:suburb'], tags['addr:city'], tags['addr:state'], tags['addr:postcode']]
    .filter(Boolean)
    .join(' - ');
}

export function mapOverpassElement(element: OverpassElement, niche: Niche, city: string): Lead | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) {
    return null;
  }
  const presence = classifyWebPresence(splitTagValues(tags, WEBSITE_TAG_KEYS), splitTagValues(tags, INSTAGRAM_TAG_KEYS));
  return {
    id: `osm:${element.type}/${element.id}`,
    name,
    phone: extractPhone(tags),
    address: formatAddress(tags),
    niche: niche.label,
    city,
    ...presence,
    source: 'openstreetmap',
  };
}
