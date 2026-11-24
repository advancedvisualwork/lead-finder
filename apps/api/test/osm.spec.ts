import { describe, expect, it } from 'vitest';
import { findNicheById } from '../src/leads/domain/niche-catalog';
import { normalizeBrazilianPhone } from '../src/leads/domain/phone';
import { isInsideBoundary, parseCityBoundary, type CityBoundary } from '../src/leads/infrastructure/osm/city-boundary';
import { parseBoundingBox, pickCityRelation } from '../src/leads/infrastructure/osm/nominatim.client';
import { mapOverpassElement } from '../src/leads/infrastructure/osm/osm-lead.mapper';
import { belongsToCity } from '../src/leads/infrastructure/osm/osm-lead.provider';
import { buildOverpassQuery, type OverpassElement } from '../src/leads/infrastructure/osm/overpass.client';

const dentist = findNicheById('dentista')!;

describe('normalizeBrazilianPhone', () => {
  it.each([
    ['+55 11 98888-7777', '(11) 98888-7777'],
    ['+55 (19) 3232-1010', '(19) 3232-1010'],
    ['011 3232-1010', '(11) 3232-1010'],
    ['1132321010', '(11) 3232-1010'],
    ['0800 123 4567', '0800 123 4567'],
    ['+55 19 324-2966', '+55 19 324-2966'],
    ['(55) 3222-1111', '(55) 3222-1111'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeBrazilianPhone(raw)).toBe(expected);
  });
});

describe('mapOverpassElement', () => {
  it('maps name, first phone, formatted address and niche label', () => {
    const lead = mapOverpassElement(
      {
        type: 'node',
        id: 42,
        tags: {
          name: ' Sorriso Odonto ',
          'contact:phone': '+55 11 3333-4444;+55 11 99999-0000',
          'addr:street': 'Rua das Flores',
          'addr:housenumber': '100',
          'addr:suburb': 'Centro',
          'addr:city': 'São Paulo',
          website: 'https://www.instagram.com/sorriso;https://sorriso.com.br',
          'contact:instagram': '@sorriso.odonto',
        },
      },
      dentist,
      'São Paulo, SP',
    );
    expect(lead).toEqual({
      id: 'osm:node/42',
      name: 'Sorriso Odonto',
      phone: '(11) 3333-4444',
      address: 'Rua das Flores, 100 - Centro - São Paulo',
      niche: 'Dentista',
      city: 'São Paulo, SP',
      website: 'https://sorriso.com.br/',
      instagram: 'https://www.instagram.com/sorriso.odonto',
      source: 'openstreetmap',
    });
  });

  it('discards elements without a name', () => {
    expect(mapOverpassElement({ type: 'way', id: 1, tags: { amenity: 'dentist' } }, dentist, 'Campinas')).toBeNull();
  });
});

const campinasBox = { south: -23.06, west: -47.24, north: -22.72, east: -46.81 };

describe('buildOverpassQuery', () => {
  it('builds one selector per whitelisted tag inside the city bounding box', () => {
    const query = buildOverpassQuery(campinasBox, dentist.osmTags, 200);
    expect(query).toContain('nwr["amenity"="dentist"]["name"](-23.06,-47.24,-22.72,-46.81);');
    expect(query).toContain('nwr["healthcare"="dentist"]["name"](-23.06,-47.24,-22.72,-46.81);');
    expect(query.endsWith('out tags center 200;')).toBe(true);
  });

  it('rejects tags or coordinates that could inject Overpass QL', () => {
    expect(() => buildOverpassQuery(campinasBox, [{ key: 'amenity"];out;', value: 'x' }], 10)).toThrow();
    expect(() => buildOverpassQuery({ ...campinasBox, south: Number.NaN }, dentist.osmTags, 10)).toThrow();
  });
});

describe('parseBoundingBox', () => {
  it('converts Nominatim [south, north, west, east] strings', () => {
    expect(parseBoundingBox(['-23.06', '-22.72', '-47.24', '-46.81'])).toEqual(campinasBox);
    expect(parseBoundingBox(['1', '2', 'x', '4'])).toBeUndefined();
    expect(parseBoundingBox(undefined)).toBeUndefined();
  });
});

describe('belongsToCity', () => {
  const square: CityBoundary = [[[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]];

  it('uses the municipal polygon when coordinates are available (ignores addr:city)', () => {
    const inside: OverpassElement = { type: 'node', id: 1, lat: 5, lon: 5, tags: { 'addr:city': 'Outra' } };
    const outsideWay: OverpassElement = { type: 'way', id: 2, center: { lat: 5, lon: 15 }, tags: {} };
    expect(belongsToCity(inside, { name: 'Campinas', boundary: square })).toBe(true);
    expect(belongsToCity(outsideWay, { name: 'Campinas', boundary: square })).toBe(false);
  });

  it('falls back to addr:city when there is no polygon', () => {
    const at = (city?: string): OverpassElement => ({
      type: 'node',
      id: 1,
      tags: city ? { 'addr:city': city } : {},
    });
    expect(belongsToCity(at('Campinas'), { name: 'Campinas' })).toBe(true);
    expect(belongsToCity(at('SÃO PAULO'), { name: 'São Paulo' })).toBe(true);
    expect(belongsToCity(at(), { name: 'Campinas' })).toBe(true);
    expect(belongsToCity(at('Valinhos'), { name: 'Campinas' })).toBe(false);
  });
});

describe('city boundary', () => {
  const ring = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
    [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0],
  ];

  it('handles holes and multipolygons (point args are lat, lon)', () => {
    const boundary = parseCityBoundary({
      type: 'MultiPolygon',
      coordinates: [[ring(0, 0, 10, 10), ring(4, 4, 6, 6)], [ring(20, 20, 30, 30)]],
    })!;
    expect(isInsideBoundary(2, 2, boundary)).toBe(true);
    expect(isInsideBoundary(5, 5, boundary)).toBe(false);
    expect(isInsideBoundary(25, 25, boundary)).toBe(true);
    expect(isInsideBoundary(15, 15, boundary)).toBe(false);
  });

  it('rejects malformed or non-polygon geometries', () => {
    expect(parseCityBoundary({ type: 'Point', coordinates: [1, 2] })).toBeUndefined();
    expect(parseCityBoundary({ type: 'Polygon', coordinates: [[[0, 0], ['x', 1]]] })).toBeUndefined();
    expect(parseCityBoundary(undefined)).toBeUndefined();
  });
});

describe('pickCityRelation', () => {
  it('prefers boundary relations and ignores nodes', () => {
    const picked = pickCityRelation([
      { osm_type: 'node', osm_id: 1, category: 'place' },
      { osm_type: 'relation', osm_id: 2, category: 'landuse' },
      { osm_type: 'relation', osm_id: 3, category: 'boundary' },
    ]);
    expect(picked?.osm_id).toBe(3);
    expect(pickCityRelation([{ osm_type: 'node', osm_id: 1 }])).toBeUndefined();
  });
});
