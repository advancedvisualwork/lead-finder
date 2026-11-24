'use client';

import type { LeadSearchState } from '@/hooks/useLeadSearch';
import { buildExportUrl } from '@/lib/api';
import { LeadsTable } from './LeadsTable';

const SOURCE_LABEL = { openstreetmap: 'OpenStreetMap', 'google-places': 'Google Places' } as const;

function LoadingSkeleton() {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton-row" />
      ))}
    </div>
  );
}

export function ResultsPanel({ state }: { state: LeadSearchState }) {
  if (state.status === 'idle') {
    return <p className="empty-state">Informe uma cidade e um nicho para encontrar leads.</p>;
  }
  if (state.status === 'loading') {
    return (
      <div role="status" aria-live="polite">
        <p className="muted">Buscando leads em {state.params.city}… isso pode levar alguns segundos.</p>
        <LoadingSkeleton />
      </div>
    );
  }
  if (state.status === 'error') {
    return <p className="alert alert-error" role="alert">{state.message}</p>;
  }

  const { result, params } = state;
  if (result.total === 0) {
    return (
      <p className="empty-state" role="status">
        Nenhum lead de “{result.niche}” encontrado em {result.city}. Tente outra grafia (ex.: “Cidade, UF”) ou
        desmarque “Somente com telefone”.
      </p>
    );
  }

  return (
    <section aria-labelledby="results-title">
      <header className="results-header">
        <div>
          <h2 id="results-title">{result.total} leads encontrados</h2>
          <p className="muted">
            {result.niche} em {result.city} · fonte: {SOURCE_LABEL[result.source]}
          </p>
        </div>
        <a className="button button-primary" href={buildExportUrl(params)} download>
          Exportar CSV
        </a>
      </header>
      <LeadsTable leads={result.leads} />
    </section>
  );
}
