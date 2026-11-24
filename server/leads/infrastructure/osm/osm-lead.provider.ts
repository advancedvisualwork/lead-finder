import type { Lead } from '../../domain/lead';
import type { LeadProvider, LeadSearchCriteria } from '../../domain/lead-provider';
import { isInsideBoundary } from './city-boundary';
import { mapOverpassElement } from './osm-lead.mapper';
import type { CityLocation, NominatimClient } from './nominatim.client';
import type { OverpassClient, OverpassElement } from './overpass.client';

function normalizeCityName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

function coordinatesOf(element: OverpassElement): { lat: number; lon: number } | undefined {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }
  return element.center;
}

/**
 * The Overpass query uses a bounding box, which also covers parts of neighbouring cities.
 * Primary filter: point-in-polygon against the municipal boundary. Fallback (no polygon or
 * no coordinates): drop elements whose addr:city explicitly names another city.
 */
export function belongsToCity(element: OverpassElement, location: Pick<CityLocation, 'name' | 'boundary'>): boolean {
  const coordinates = coordinatesOf(element);
  if (location.boundary && coordinates) {
    return isInsideBoundary(coordinates.lat, coordinates.lon, location.boundary);
  }
  const addressCity = element.tags?.['addr:city'];
  return !addressCity || normalizeCityName(addressCity) === normalizeCityName(location.name);
}

export class OsmLeadProvider implements LeadProvider {
  readonly source = 'openstreetmap' as const;

  constructor(
    private readonly nominatim: NominatimClient,
    private readonly overpass: OverpassClient,
  ) {}

  async search({ city, niche }: LeadSearchCriteria): Promise<Lead[]> {
    const location = await this.nominatim.findCity(city);
    const elements = await this.overpass.findElements(location.boundingBox, niche.osmTags);
    return elements
      .filter((element) => belongsToCity(element, location))
      .map((element) => mapOverpassElement(element, niche, city))
      .filter((lead): lead is Lead => lead !== null);
  }
}
