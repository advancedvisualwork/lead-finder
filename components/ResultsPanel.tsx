'use client';

import type { MultiCitySearchState } from '@/hooks/useMultiCitySearch';
import { downloadLeadsCsv } from '@/lib/lead-csv';
import { CitySummary } from './CitySummary';
import { LeadsTable } from './LeadsTable';

const SOURCE_LABEL = { openstreetmap: 'OpenStreetMap', 'google-places': 'Google Places' } as const;

function ExportButton({ state }: { state: MultiCitySearchState }) {
  const params = state.params;
  const doneCities = state.cities.filter((city) => city.status === 'success').map((city) => city.city);
  if (!params || doneCities.length === 0 || state.leads.length === 0) return null;
  const label = doneCities.length === 1 ? 'Exportar CSV' : `Exportar CSV (${doneCities.length} cidades)`;
  return (
    <button
      type="button"
      className="button button-primary"
      onClick={() => downloadLeadsCsv(state.leads, doneCities, params.niche)}
    >
      {label}
    </button>
  );
}

export function ResultsPanel({ state }: { state: MultiCitySearchState }) {
  if (state.status === 'idle') {
    return <p className="empty-state">Informe uma ou mais cidades e um nicho para encontrar leads.</p>;
  }

  const running = state.status === 'running';
  const finished = state.cities.filter((city) => city.status !== 'pending' && city.status !== 'loading').length;

  return (
    <section aria-labelledby="results-title">
      <header className="results-header">
        <div>
          <h2 id="results-title">{state.leads.length} leads na lista</h2>
          <p className="muted" role="status" aria-live="polite">
            {running ? `Buscando… ${finished} de ${state.cities.length} cidades concluídas (cada cidade leva ~30–60 s).` : 'Busca concluída.'}
            {state.source && ` · fonte: ${SOURCE_LABEL[state.source]}`}
          </p>
        </div>
        <ExportButton state={state} />
      </header>

      <h3 className="section-title">Leads por cidade</h3>
      <CitySummary cities={state.cities} />

      {state.leads.length > 0 ? (
        <>
          <h3 className="section-title">Leads</h3>
          <LeadsTable leads={state.leads} />
        </>
      ) : (
        !running && (
          <p className="empty-state">
            Nenhum lead com esses filtros. Tente outra grafia (ex.: “Cidade, UF”) ou desmarque alguns filtros.
          </p>
        )
      )}
    </section>
  );
}
