'use client';

import { useEffect, useState } from 'react';
import { fetchNiches } from '@/lib/api';
import type { NicheOption } from '@/lib/types';

interface NichesState {
  niches: NicheOption[];
  isLoading: boolean;
  error: string | null;
}

export function useNiches(): NichesState {
  const [state, setState] = useState<NichesState>({ niches: [], isLoading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    fetchNiches(controller.signal)
      .then((niches) => setState({ niches, isLoading: false, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Falha ao carregar nichos.';
        setState({ niches: [], isLoading: false, error: message });
      });
    return () => controller.abort();
  }, []);

  return state;
}
