'use client';

import { useState, type FormEvent } from 'react';
import { validateSearchForm, type SearchFormErrors, type SearchFormValues } from '@/lib/search-form.schema';
import type { NicheOption } from '@/lib/types';

interface SearchFormProps {
  niches: NicheOption[];
  nichesLoading: boolean;
  isSearching: boolean;
  onSearch: (values: SearchFormValues) => void;
}

const INITIAL_VALUES: SearchFormValues = { city: '', niche: '', onlyWithPhone: false };

export function SearchForm({ niches, nichesLoading, isSearching, onSearch }: SearchFormProps) {
  const [values, setValues] = useState<SearchFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<SearchFormErrors>({});

  const update = <K extends keyof SearchFormValues>(field: K, value: SearchFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateSearchForm(values);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }
    onSearch(validation.data);
  };

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate aria-label="Buscar leads">
      <div className="field">
        <label htmlFor="city">Cidade</label>
        <input
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          placeholder="Ex.: Campinas, SP"
          value={values.city}
          maxLength={80}
          onChange={(event) => update('city', event.target.value)}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? 'city-error' : undefined}
        />
        {errors.city && <p id="city-error" className="field-error">{errors.city}</p>}
      </div>

      <div className="field">
        <label htmlFor="niche">Nicho</label>
        <select
          id="niche"
          name="niche"
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

      <label className="checkbox">
        <input
          type="checkbox"
          checked={values.onlyWithPhone}
          onChange={(event) => update('onlyWithPhone', event.target.checked)}
        />
        Somente com telefone
      </label>

      <button type="submit" className="button button-primary" disabled={isSearching} aria-busy={isSearching}>
        {isSearching ? 'Buscando…' : 'Buscar leads'}
      </button>
    </form>
  );
}
