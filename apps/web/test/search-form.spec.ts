import { describe, expect, it } from 'vitest';
import { buildExportUrl } from '../lib/api';
import { parseCityList, validateSearchForm, type SearchFormValues } from '../lib/search-form.schema';

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

  it('rejects empty input and more than 10 cities', () => {
    expect(validateSearchForm(values({ citiesText: ' \n ' })).success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => `Cidade ${String.fromCharCode(65 + i)}`).join('\n');
    expect(validateSearchForm(values({ citiesText: eleven })).success).toBe(false);
  });
});

describe('buildExportUrl', () => {
  it('repeats the city parameter and URL-encodes user input', () => {
    const url = new URL(
      buildExportUrl(['São Paulo & Co', 'Santos'], {
        niche: 'bar',
        onlyWithPhone: false,
        withoutWebsite: true,
        instagramCountsAsNoWebsite: false,
        limit: 30,
      }),
    );
    expect(url.pathname).toBe('/api/leads/export');
    expect(url.searchParams.getAll('city')).toEqual(['São Paulo & Co', 'Santos']);
    expect(url.searchParams.get('withoutWebsite')).toBe('true');
    expect(url.searchParams.get('instagramCountsAsNoWebsite')).toBe('false');
    expect(url.searchParams.get('limit')).toBe('30');
  });
});
