export interface OsmTag {
  key: string;
  value: string;
}

export interface Niche {
  id: string;
  label: string;
  osmTags: readonly OsmTag[];
}

const tag = (key: string, value: string): OsmTag => ({ key, value });

/**
 * Closed whitelist: OSM tags are interpolated into Overpass QL, so niches must never come
 * from user input directly — the client only sends the niche id.
 */
export const NICHES: readonly Niche[] = [
  { id: 'restaurante', label: 'Restaurante', osmTags: [tag('amenity', 'restaurant')] },
  { id: 'lanchonete', label: 'Lanchonete / Fast food', osmTags: [tag('amenity', 'fast_food')] },
  { id: 'cafeteria', label: 'Cafeteria', osmTags: [tag('amenity', 'cafe')] },
  { id: 'bar', label: 'Bar', osmTags: [tag('amenity', 'bar'), tag('amenity', 'pub')] },
  { id: 'padaria', label: 'Padaria', osmTags: [tag('shop', 'bakery')] },
  { id: 'mercado', label: 'Mercado / Supermercado', osmTags: [tag('shop', 'supermarket'), tag('shop', 'convenience')] },
  { id: 'dentista', label: 'Dentista', osmTags: [tag('amenity', 'dentist'), tag('healthcare', 'dentist')] },
  { id: 'clinica', label: 'Clínica médica', osmTags: [tag('amenity', 'clinic'), tag('amenity', 'doctors')] },
  { id: 'farmacia', label: 'Farmácia', osmTags: [tag('amenity', 'pharmacy')] },
  { id: 'veterinario', label: 'Veterinário', osmTags: [tag('amenity', 'veterinary')] },
  { id: 'pet-shop', label: 'Pet shop', osmTags: [tag('shop', 'pet')] },
  { id: 'academia', label: 'Academia', osmTags: [tag('leisure', 'fitness_centre')] },
  { id: 'salao-beleza', label: 'Salão de beleza / Barbearia', osmTags: [tag('shop', 'hairdresser'), tag('shop', 'beauty')] },
  { id: 'advocacia', label: 'Advocacia', osmTags: [tag('office', 'lawyer')] },
  { id: 'contabilidade', label: 'Contabilidade', osmTags: [tag('office', 'accountant')] },
  { id: 'imobiliaria', label: 'Imobiliária', osmTags: [tag('office', 'estate_agent')] },
  { id: 'oficina', label: 'Oficina mecânica', osmTags: [tag('shop', 'car_repair')] },
  { id: 'hotel', label: 'Hotel / Pousada', osmTags: [tag('tourism', 'hotel'), tag('tourism', 'guest_house')] },
  { id: 'loja-roupas', label: 'Loja de roupas', osmTags: [tag('shop', 'clothes')] },
  { id: 'otica', label: 'Ótica', osmTags: [tag('shop', 'optician')] },
  { id: 'escola', label: 'Escola', osmTags: [tag('amenity', 'school')] },
];

const NICHES_BY_ID: ReadonlyMap<string, Niche> = new Map(NICHES.map((niche) => [niche.id, niche]));

export const NICHE_IDS = NICHES.map((niche) => niche.id) as [string, ...string[]];

export function findNicheById(id: string): Niche | undefined {
  return NICHES_BY_ID.get(id);
}
