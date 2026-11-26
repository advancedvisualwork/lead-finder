import { describe, expect, it } from 'vitest';
import { buildSearchQuery } from '../../lib/api';
import { parseCityList, validateSearchForm, type SearchFormValues } from '../../lib/search-form.schema';

const values = (overrides: Partial<SearchFormValues> = {}): SearchFormValues => ({
  citiesText: 'Campinas, SP',
  niche: 'dentista',
  limit: '200',
  onlyWithPhone: false,
  withoutWebsite: false,
  instagramCountsAsNoWebsite: true,
  ...overrides,
});

describe('parseCityList', () => {
  it('splits by line or ";", trims, collapses spaces and removes duplicates', () => {
    expect(parseCityList(' Campinas, SP \n\nSantos;  campinas, sp\nSão   Paulo ')).toEqual([
      'Campinas, SP',
      'Santos',
      'São Paulo',
    ]);
  });
});

describe('validateSearchForm', () => {
  it('builds multi-city params with filters and numeric limit', () => {
    const result = validateSearchForm(values({ citiesText: 'Ribeirão Preto, SP\nFranca', limit: '50', withoutWebsite: true }));
    expect(result).toEqual({
      success: true,
      data: {
        cities: ['Ribeirão Preto, SP', 'Franca'],
        niche: 'dentista',
        limit: 50,
        onlyWithPhone: false,
        withoutWebsite: true,
        instagramCountsAsNoWebsite: true,
      },
    });
  });

  it('points to the invalid line and other invalid fields', () => {
    const result = validateSearchForm(values({ citiesText: 'Campinas\n<b>', niche: '', limit: '0' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.cities).toMatch(/^Linha 2:/);
      expect(Object.keys(result.errors).sort()).toEqual(['cities', 'limit', 'niche']);
    }
  });

  it('rejects empty input and accepts any number of cities', () => {
    expect(validateSearchForm(values({ citiesText: ' \n ' })).success).toBe(false);
    const many = Array.from({ length: 50 }, (_, i) => `Cidade ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}`).join('\n');
    const result = validateSearchForm(values({ citiesText: many }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.cities).toHaveLength(50);
  });
});

describe('buildSearchQuery', () => {
  it('URL-encodes user input and sends every filter', () => {
    const params = new URLSearchParams(
      buildSearchQuery('São Paulo & Co', {
        niche: 'bar',
        onlyWithPhone: false,
        withoutWebsite: true,
        instagramCountsAsNoWebsite: false,
        limit: 30,
      }),
    );
    expect(params.getAll('city')).toEqual(['São Paulo & Co']);
    expect(params.get('withoutWebsite')).toBe('true');
    expect(params.get('instagramCountsAsNoWebsite')).toBe('false');
    expect(params.get('limit')).toBe('30');
  });
});
