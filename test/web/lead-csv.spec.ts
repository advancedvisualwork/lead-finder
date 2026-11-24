import { describe, expect, it } from 'vitest';
import { buildCsvFileName, escapeCsvCell, serializeLeadsToCsv } from '../../lib/lead-csv';
import { buildLead } from '../server/factories';

const HEADER = 'Nome;Telefone;Endereço;Nicho;Cidade;Instagram;Site';

describe('serializeLeadsToCsv', () => {
  it('writes BOM, pt-BR header and one row per lead', () => {
    const csv = serializeLeadsToCsv([
      buildLead({
        phone: '(11) 98888-7777',
        address: 'Rua A, 10 - Centro',
        instagram: 'https://www.instagram.com/paoquente',
        website: 'https://paoquente.com.br/',
      }),
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).trimEnd().split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe(
      'Padaria Pão Quente;(11) 98888-7777;Rua A, 10 - Centro;Padaria;Campinas;https://www.instagram.com/paoquente;https://paoquente.com.br/',
    );
  });

  it('returns only the header for an empty list', () => {
    expect(serializeLeadsToCsv([]).slice(1)).toBe(`${HEADER}\r\n`);
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
    expect(buildCsvFileName(['São Paulo, SP'], 'pet-shop')).toBe('leads-sao-paulo-sp-pet-shop.csv');
    expect(buildCsvFileName(['Campinas', 'Santos', 'Jundiaí'], 'bar')).toBe('leads-3-cidades-bar.csv');
    expect(buildCsvFileName(['"\r\n'], '')).toBe('leads-export.csv');
  });
});
