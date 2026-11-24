'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchLeads } from '@/lib/api';
import type { LeadSearchParams, LeadSearchResult } from '@/lib/types';

export type LeadSearchState =
  | { status: 'idle' }
  | { status: 'loading'; params: LeadSearchParams }
  | { status: 'success'; params: LeadSearchParams; result: LeadSearchResult }
  | { status: 'error'; params: LeadSearchParams; message: string };

export function useLeadSearch() {
  const [state, setState] = useState<LeadSearchState>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const search = useCallback(async (params: LeadSearchParams) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading', params });
    try {
      const result = await searchLeads(params, controller.signal);
      setState({ status: 'success', params, result });
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : 'Erro inesperado.';
      setState({ status: 'error', params, message });
    }
  }, []);

  return { state, search };
}
