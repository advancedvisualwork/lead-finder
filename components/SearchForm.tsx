'use client';

import { useState, type FormEvent } from 'react';
import {
  MAX_LIMIT,
  parseCityList,
  validateSearchForm,
  type SearchFormErrors,
  type SearchFormValues,
} from '@/lib/search-form.schema';
import type { MultiCitySearchParams, NicheOption } from '@/lib/types';

interface SearchFormProps {
  niches: NicheOption[];
  nichesLoading: boolean;
  isSearching: boolean;
  onSearch: (params: MultiCitySearchParams) => void;
  onCancel: () => void;
}

const INITIAL_VALUES: SearchFormValues = {
  citiesText: '',
  niche: '',
  limit: String(MAX_LIMIT),
  onlyWithPhone: false,
  withoutWebsite: false,
  instagramCountsAsNoWebsite: true,
};

export function SearchForm({ niches, nichesLoading, isSearching, onSearch, onCancel }: SearchFormProps) {
  const [values, setValues] = useState<SearchFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<SearchFormErrors>({});
  const cityCount = parseCityList(values.citiesText).length;

  const update = <K extends keyof SearchFormValues>(field: K, value: SearchFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors({});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateSearchForm(values);
    if (validation.success) onSearch(validation.data);
    else setErrors(validation.errors);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate aria-label="Buscar leads">
      <div className="field field-cities">
        <label htmlFor="cities">
          Cidades <span className="muted">(uma por linha)</span>
        </label>
        <textarea
          id="cities"
          name="cities"
          rows={4}
          placeholder={'Campinas, SP\nSantos, SP\nFlorianópolis, SC'}
          value={values.citiesText}
          onChange={(event) => update('citiesText', event.target.value)}
          aria-invalid={Boolean(errors.cities)}
          aria-describedby="cities-hint cities-error"
        />
        <p id="cities-hint" className="field-hint">{cityCount} cidade(s)</p>
        {errors.cities && <p id="cities-error" className="field-error">{errors.cities}</p>}
      </div>

      <div className="field-column">
        <div className="field">
          <label htmlFor="niche">Nicho</label>
          <select
            id="niche"
            value={values.niche}
            disabled={nichesLoading}
            onChange={(event) => update('niche', event.target.value)}
            aria-invalid={Boolean(errors.niche)}
            aria-describedby={errors.niche ? 'niche-error' : undefined}
          >
            <option value="">{nichesLoading ? 'Carregando…' : 'Selecione um nicho'}</option>
            {niches.map((niche) => (
              <option key={niche.id} value={niche.id}>{niche.label}</option>
            ))}
          </select>
          {errors.niche && <p id="niche-error" className="field-error">{errors.niche}</p>}
        </div>

        <div className="field">
          <label htmlFor="limit">Máx. de leads por cidade</label>
          <input
            id="limit"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_LIMIT}
            value={values.limit}
            onChange={(event) => update('limit', event.target.value)}
            aria-invalid={Boolean(errors.limit)}
            aria-describedby={errors.limit ? 'limit-error' : undefined}
          />
          {errors.limit && <p id="limit-error" className="field-error">{errors.limit}</p>}
        </div>
      </div>

      <fieldset className="filters">
        <legend>Filtros</legend>
        <label className="checkbox">
          <input type="checkbox" checked={values.onlyWithPhone} onChange={(e) => update('onlyWithPhone', e.target.checked)} />
          Somente com telefone
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={values.withoutWebsite} onChange={(e) => update('withoutWebsite', e.target.checked)} />
          Somente sem site
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={values.instagramCountsAsNoWebsite}
            onChange={(e) => update('instagramCountsAsNoWebsite', e.target.checked)}
            aria-describedby="instagram-hint"
          />
          Considerar Instagram como “sem site”
        </label>
        <p id="instagram-hint" className="field-hint">
          Ligado: quem tem só Instagram (ou Facebook/Linktree) conta como sem site.
        </p>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={isSearching} aria-busy={isSearching}>
          {isSearching ? 'Buscando…' : 'Buscar leads'}
        </button>
        {isSearching && (
          <button type="button" className="button" onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </form>
  );
}
