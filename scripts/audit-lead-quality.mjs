// Data-quality audit: samples real searches and checks phone validity, DDD consistency and
// whether the registered street matches the street at the establishment's coordinates.
// Usage: npm run build -w apps/api && node scripts/audit-lead-quality.mjs [samplesPerSearch]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const dist = (path) => require(`../apps/api/dist/${path}`);
const { appConfig } = dist('config/app.config');
const { findNicheById } = dist('leads/domain/niche-catalog');
const { NominatimClient } = dist('leads/infrastructure/osm/nominatim.client');
const { OverpassClient } = dist('leads/infrastructure/osm/overpass.client');
const { mapOverpassElement } = dist('leads/infrastructure/osm/osm-lead.mapper');
const { belongsToCity } = dist('leads/infrastructure/osm/osm-lead.provider');

const SEARCHES = [
  { city: 'Campinas, SP', niche: 'dentista', ddd: '19' },
  { city: 'Ribeirão Preto, SP', niche: 'padaria', ddd: '16' },
  { city: 'Florianópolis, SC', niche: 'academia', ddd: '48' },
];
const SAMPLES_PER_SEARCH = Number(process.argv[2] ?? 8);
const NOMINATIM_DELAY_MS = 1100; // Nominatim usage policy: max 1 request/second.
const PHONE_FORMAT = /^\(\d{2}\) 9?\d{4}-\d{4}$/;
const STREET_PREFIX = /^(rua|r\.|avenida|av\.?|travessa|tv\.?|alameda|al\.?|rodovia|rod\.?|estrada|praca|largo)\s+/;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (text = '') =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const streetCore = (street) => normalize(street).replace(STREET_PREFIX, '').replace(/^(doutor|dr\.?|professor|prof\.?)\s+/, '');
const percent = (part, total) => (total ? `${((part / total) * 100).toFixed(0)}%` : 'n/a');

function coordinatesOf(element) {
  if (typeof element.lat === 'number') return { lat: element.lat, lon: element.lon };
  return element.center ? { lat: element.center.lat, lon: element.center.lon } : undefined;
}

async function reverseGeocode({ lat, lon }) {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', zoom: '18' });
  const response = await fetch(`${appConfig.nominatimUrl}/reverse?${params}`, {
    headers: { 'User-Agent': appConfig.userAgent, 'Accept-Language': 'pt-BR' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`reverse ${response.status}`);
  const { address = {} } = await response.json();
  return { road: address.road ?? '', city: address.city ?? address.town ?? address.municipality ?? '' };
}

function streetsMatch(registered, actual) {
  const a = streetCore(registered);
  const b = streetCore(actual);
  return Boolean(a && b) && (a === b || a.includes(b) || b.includes(a));
}

async function auditSearch({ city, niche: nicheId, ddd }, nominatim, overpass) {
  const niche = findNicheById(nicheId);
  const location = await nominatim.findCity(city);
  const elements = (await overpass.findElements(location.boundingBox, niche.osmTags)).filter((e) =>
    belongsToCity(e, location),
  );
  const leads = elements.map((e) => ({ element: e, lead: mapOverpassElement(e, niche) })).filter((x) => x.lead);
  const withPhone = leads.filter((x) => x.lead.phone);
  const validFormat = withPhone.filter((x) => PHONE_FORMAT.test(x.lead.phone));
  const dddMatch = validFormat.filter((x) => x.lead.phone.startsWith(`(${ddd})`));
  const withStreet = leads.filter((x) => x.element.tags['addr:street']);

  const geoChecks = [];
  for (const { element, lead } of withStreet.slice(0, SAMPLES_PER_SEARCH)) {
    const coordinates = coordinatesOf(element);
    if (!coordinates) continue;
    await sleep(NOMINATIM_DELAY_MS);
    try {
      const actual = await reverseGeocode(coordinates);
      geoChecks.push({
        name: lead.name,
        phone: lead.phone,
        registered: element.tags['addr:street'],
        actualRoad: actual.road,
        actualCity: actual.city,
        streetMatch: streetsMatch(element.tags['addr:street'], actual.road),
        cityMatch: normalize(actual.city) === normalize(location.name),
        coordinates,
      });
    } catch (error) {
      geoChecks.push({ name: lead.name, error: String(error) });
    }
  }

  return {
    search: `${niche.label} em ${city}`,
    total: leads.length,
    withPhone: withPhone.length,
    validFormat: validFormat.length,
    invalidPhones: withPhone.filter((x) => !PHONE_FORMAT.test(x.lead.phone)).map((x) => x.lead.phone),
    dddMatch: dddMatch.length,
    otherDdd: validFormat.filter((x) => !x.lead.phone.startsWith(`(${ddd})`)).map((x) => `${x.lead.name}: ${x.lead.phone}`),
    withAddress: leads.filter((x) => x.lead.address).length,
    withStreet: withStreet.length,
    geoChecks,
  };
}

function printReport(result) {
  const checked = result.geoChecks.filter((g) => !g.error);
  console.log(`\n=== ${result.search} — ${result.total} leads`);
  console.log(`Com telefone: ${result.withPhone} (${percent(result.withPhone, result.total)})`);
  console.log(`Telefone em formato válido: ${result.validFormat}/${result.withPhone} (${percent(result.validFormat, result.withPhone)})`);
  console.log(`DDD da cidade: ${result.dddMatch}/${result.validFormat} (${percent(result.dddMatch, result.validFormat)})`);
  console.log(`Com endereço: ${result.withAddress} (${percent(result.withAddress, result.total)}) | com rua: ${result.withStreet}`);
  console.log(`Rua cadastrada = rua no mapa: ${checked.filter((g) => g.streetMatch).length}/${checked.length}`);
  console.log(`Coordenada dentro da cidade: ${checked.filter((g) => g.cityMatch).length}/${checked.length}`);
  for (const g of checked) {
    const mark = g.streetMatch ? 'OK ' : 'DIF';
    console.log(`  [${mark}] ${g.name} | cadastro: ${g.registered} | mapa: ${g.actualRoad} (${g.actualCity})`);
  }
  if (result.invalidPhones.length) console.log(`  Telefones fora do padrão: ${result.invalidPhones.join(' | ')}`);
  if (result.otherDdd.length) console.log(`  DDD diferente: ${result.otherDdd.join(' | ')}`);
}

const nominatim = new NominatimClient(appConfig);
const overpass = new OverpassClient(appConfig);
const results = [];
for (const search of SEARCHES) {
  try {
    const result = await auditSearch(search, nominatim, overpass);
    printReport(result);
    results.push(result);
  } catch (error) {
    console.log(`\n=== ${search.niche} em ${search.city}: FALHOU (${error.message})`);
  }
  await sleep(NOMINATIM_DELAY_MS);
}
const outputPath = process.argv[3];
if (outputPath) writeFileSync(outputPath, JSON.stringify(results, null, 2));
