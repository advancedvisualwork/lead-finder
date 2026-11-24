/** [lon, lat] as in GeoJSON. */
export type Position = [number, number];
/** First ring is the outer boundary, the following ones are holes. */
export type PolygonRings = Position[][];
export type CityBoundary = PolygonRings[];

interface GeoJsonGeometry {
  type?: string;
  coordinates?: unknown;
}

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]);

const isRing = (value: unknown): value is Position[] => Array.isArray(value) && value.length >= 4 && value.every(isPosition);

const isPolygon = (value: unknown): value is PolygonRings => Array.isArray(value) && value.length > 0 && value.every(isRing);

/** Accepts only well-formed GeoJSON Polygon/MultiPolygon; anything else yields undefined. */
export function parseCityBoundary(geometry: GeoJsonGeometry | undefined): CityBoundary | undefined {
  if (geometry?.type === 'Polygon' && isPolygon(geometry.coordinates)) {
    return [geometry.coordinates];
  }
  if (geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) && geometry.coordinates.every(isPolygon)) {
    return geometry.coordinates as CityBoundary;
  }
  return undefined;
}

/** Ray casting, O(v) for a ring with v vertices. */
function isInsideRing(lon: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function isInsideBoundary(lat: number, lon: number, boundary: CityBoundary): boolean {
  return boundary.some(
    ([outer, ...holes]) => isInsideRing(lon, lat, outer) && !holes.some((hole) => isInsideRing(lon, lat, hole)),
  );
}
