import type { Lead } from '../domain/lead';

const HEADER = ['Nome', 'Telefone', 'Endereço', 'Nicho', 'Cidade', 'Instagram', 'Site'] as const;
/** ";" + BOM so Excel in pt-BR opens the file with accents and columns intact. */
const SEPARATOR = ';';
const UTF8_BOM = '﻿';
const LINE_BREAK = '\r\n';
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const NEEDS_QUOTING = /[";\r\n]/;

/** Escapes a cell and neutralizes CSV/formula injection (OWASP recommendation). */
export function escapeCsvCell(raw: string): string {
  const neutralized = FORMULA_TRIGGER.test(raw) ? `'${raw}` : raw;
  return NEEDS_QUOTING.test(neutralized) ? `"${neutralized.replace(/"/g, '""')}"` : neutralized;
}

function toRow(cells: readonly string[]): string {
  return cells.map(escapeCsvCell).join(SEPARATOR);
}

export function serializeLeadsToCsv(leads: readonly Lead[]): string {
  const rows = leads.map((lead) =>
    toRow([lead.name, lead.phone, lead.address, lead.niche, lead.city, lead.instagram, lead.website]),
  );
  return UTF8_BOM + [toRow(HEADER), ...rows].join(LINE_BREAK) + LINE_BREAK;
}

export function buildCsvFileName(cities: readonly string[], nicheId: string): string {
  const cityPart = cities.length === 1 ? cities[0] : `${cities.length}-cidades`;
  const slug = `${cityPart}-${nicheId}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `leads-${slug || 'export'}.csv`;
}
