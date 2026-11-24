import type { Lead } from '../../domain/lead';
import type { Niche } from '../../domain/niche-catalog';
import { normalizeBrazilianPhone } from '../../domain/phone';
import type { OverpassElement } from './overpass.client';

type Tags = Record<string, string>;

const PHONE_TAG_KEYS = ['phone', 'contact:phone', 'mobile', 'contact:mobile', 'contact:whatsapp'] as const;

function extractPhone(tags: Tags): string {
  const raw = PHONE_TAG_KEYS.map((key) => tags[key]).find((value) => value?.trim());
  // OSM allows several numbers separated by ";" — keep the first one for the lead.
  return raw ? normalizeBrazilianPhone(raw.split(';')[0]) : '';
}

function formatAddress(tags: Tags): string {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(', ');
  return [street, tags['addr:suburb'], tags['addr:city'], tags['addr:state'], tags['addr:postcode']]
    .filter(Boolean)
    .join(' - ');
}

export function mapOverpassElement(element: OverpassElement, niche: Niche): Lead | null {
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) {
    return null;
  }
  return {
    id: `osm:${element.type}/${element.id}`,
    name,
    phone: extractPhone(tags),
    address: formatAddress(tags),
    niche: niche.label,
    source: 'openstreetmap',
  };
}
