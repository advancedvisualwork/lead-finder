import { describe, expect, it } from 'vitest';
import { buildExportUrl } from '../lib/api';
import { validateSearchForm } from '../lib/search-form.schema';

describe('validateSearchForm', () => {
  it('accepts a valid city and niche', () => {
    const result = validateSearchForm({ city: ' Ribeirão Preto, SP ', niche: 'dentista', onlyWithPhone: true });
    expect(result).toEqual({
      success: true,
      data: { city: 'Ribeirão Preto, SP', niche: 'dentista', onlyWithPhone: true },
    });
  });

  it('returns one message per invalid field', () => {
    const result = validateSearchForm({ city: '<b>', niche: '', onlyWithPhone: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.errors).sort()).toEqual(['city', 'niche']);
    }
  });
});

describe('buildExportUrl', () => {
  it('URL-encodes user input instead of concatenating it raw', () => {
    const url = new URL(buildExportUrl({ city: 'São Paulo & Co', niche: 'bar', onlyWithPhone: false }));
    expect(url.pathname).toBe('/api/leads/export');
    expect(url.searchParams.get('city')).toBe('São Paulo & Co');
    expect(url.searchParams.get('onlyWithPhone')).toBe('false');
  });
});
