import { describe, expect, it } from 'vitest';
import { buildCsvFileName, escapeCsvCell, serializeLeadsToCsv } from '../src/leads/application/lead-csv.serializer';
import type { Lead } from '../src/leads/domain/lead';

const lead = (overrides: Partial<Lead> = {}): Lead => ({
  id: 'osm:node/1',
  name: 'Padaria Pão Quente',
  phone: '(11) 98888-7777',
  address: 'Rua A, 10 - Centro',
  niche: 'Padaria',
  source: 'openstreetmap',
  ...overrides,
});

describe('serializeLeadsToCsv', () => {
  it('writes BOM, pt-BR header and one row per lead with the four required columns', () => {
    const csv = serializeLeadsToCsv([lead()]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe('Nome;Telefone;Endereço;Nicho');
    expect(lines[1]).toBe('Padaria Pão Quente;(11) 98888-7777;Rua A, 10 - Centro;Padaria');
  });

  it('returns only the header for an empty list', () => {
    expect(serializeLeadsToCsv([]).slice(1)).toBe('Nome;Telefone;Endereço;Nicho\r\n');
  });
});

describe('escapeCsvCell', () => {
  it('quotes cells containing separator, quotes or line breaks', () => {
    expect(escapeCsvCell('Bar; do "Zé"')).toBe('"Bar; do ""Zé"""');
    expect(escapeCsvCell('linha1\nlinha2')).toBe('"linha1\nlinha2"');
  });

  it.each(['=HYPERLINK("x")', '+cmd', '-1+1', '@SUM(A1)'])('neutralizes formula injection in %s', (payload) => {
    expect(escapeCsvCell(payload).replace(/^"/, '').startsWith("'")).toBe(true);
  });
});

describe('buildCsvFileName', () => {
  it('produces an ASCII-only slug safe for Content-Disposition', () => {
    expect(buildCsvFileName('São Paulo, SP', 'pet-shop')).toBe('leads-sao-paulo-sp-pet-shop.csv');
    expect(buildCsvFileName('"\r\n', '')).toBe('leads-export.csv');
  });
});
