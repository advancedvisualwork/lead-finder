'use client';

import { ResultsPanel } from '@/components/ResultsPanel';
import { SearchForm } from '@/components/SearchForm';
import { useLeadSearch } from '@/hooks/useLeadSearch';
import { useNiches } from '@/hooks/useNiches';

export default function HomePage() {
  const { niches, isLoading: nichesLoading, error: nichesError } = useNiches();
  const { state, search } = useLeadSearch();

  return (
    <main className="container">
      <header className="hero">
        <h1>Lead Finder</h1>
        <p>Encontre empresas por cidade e nicho e exporte a lista em CSV.</p>
      </header>

      <section className="card" aria-label="Filtros de busca">
        {nichesError && <p className="alert alert-error" role="alert">{nichesError}</p>}
        <SearchForm
          niches={niches}
          nichesLoading={nichesLoading}
          isSearching={state.status === 'loading'}
          onSearch={search}
        />
      </section>

      <section className="card">
        <ResultsPanel state={state} />
      </section>

      <footer className="footer muted">
        Dados públicos do OpenStreetMap (© colaboradores OSM, licença ODbL) ou Google Places, quando configurado.
        Use os contatos em conformidade com a LGPD.
      </footer>
    </main>
  );
}
