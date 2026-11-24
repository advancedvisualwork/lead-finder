'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchLeads } from '@/lib/api';
import type { Lead, LeadCounts, LeadSource, MultiCitySearchParams } from '@/lib/types';

export type CityStatus = 'pending' | 'loading' | 'success' | 'error' | 'cancelled';

export interface CityProgress {
  city: string;
  status: CityStatus;
  total?: number;
  counts?: LeadCounts;
  error?: string;
}

export interface MultiCitySearchState {
  status: 'idle' | 'running' | 'done';
  params?: MultiCitySearchParams;
  cities: CityProgress[];
  leads: Lead[];
  source?: LeadSource;
}

const INITIAL_STATE: MultiCitySearchState = { status: 'idle', cities: [], leads: [] };

function patchCity(cities: CityProgress[], index: number, patch: Partial<CityProgress>): CityProgress[] {
  return cities.map((city, i) => (i === index ? { ...city, ...patch } : city));
}

/** Cities are searched one after another: friendlier to the public OSM servers and to the rate limit. */
export function useMultiCitySearch() {
  const [state, setState] = useState<MultiCitySearchState>(INITIAL_STATE);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const searchCity = useCallback(async (params: MultiCitySearchParams, index: number, signal: AbortSignal) => {
    setState((s) => ({ ...s, cities: patchCity(s.cities, index, { status: 'loading' }) }));
    try {
      const result = await searchLeads(params.cities[index], params, signal);
      setState((s) => ({
        ...s,
        source: result.source,
        leads: [...s.leads, ...result.leads],
        cities: patchCity(s.cities, index, { status: 'success', total: result.total, counts: result.counts }),
      }));
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      setState((s) => ({ ...s, cities: patchCity(s.cities, index, { status: 'error', error: message }) }));
    }
  }, []);

  const search = useCallback(
    async (params: MultiCitySearchParams) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const cities = params.cities.map((city): CityProgress => ({ city, status: 'pending' }));
      setState({ status: 'running', params, cities, leads: [] });
      for (let index = 0; index < params.cities.length; index++) {
        if (controller.signal.aborted) return;
        await searchCity(params, index, controller.signal);
      }
      if (!controller.signal.aborted) setState((s) => ({ ...s, status: 'done' }));
    },
    [searchCity],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState((s) => ({
      ...s,
      status: 'done',
      cities: s.cities.map((c) => (c.status === 'pending' || c.status === 'loading' ? { ...c, status: 'cancelled' } : c)),
    }));
  }, []);

  return { state, search, cancel };
}
