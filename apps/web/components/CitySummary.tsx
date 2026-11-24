'use client';

import type { CityProgress, CityStatus } from '@/hooks/useMultiCitySearch';

const STATUS_LABEL: Record<CityStatus, string> = {
  pending: 'Na fila',
  loading: 'Buscando…',
  success: 'Concluída',
  error: 'Erro',
  cancelled: 'Cancelada',
};

function sumBy(cities: CityProgress[], pick: (city: CityProgress) => number | undefined): number {
  return cities.reduce((total, city) => total + (pick(city) ?? 0), 0);
}

const dash = (value: number | undefined) => (value === undefined ? '—' : value);

export function CitySummary({ cities }: { cities: CityProgress[] }) {
  return (
    <div className="table-wrapper" role="region" aria-label="Leads por cidade" tabIndex={0}>
      <table className="summary-table">
        <caption className="visually-hidden">Leads por cidade</caption>
        <thead>
          <tr>
            <th scope="col">Cidade</th>
            <th scope="col">Status</th>
            <th scope="col">Encontrados</th>
            <th scope="col">Na lista</th>
            <th scope="col">Com telefone</th>
            <th scope="col">Sem site</th>
            <th scope="col">Com Instagram</th>
          </tr>
        </thead>
        <tbody>
          {cities.map((city) => (
            <tr key={city.city}>
              <th scope="row">{city.city}</th>
              <td>
                <span className={`status status-${city.status}`}>{STATUS_LABEL[city.status]}</span>
                {city.error && <span className="status-error-detail">{city.error}</span>}
              </td>
              <td>{dash(city.counts?.found)}</td>
              <td><strong>{dash(city.total)}</strong></td>
              <td>{dash(city.counts?.withPhone)}</td>
              <td>{dash(city.counts?.withoutWebsite)}</td>
              <td>{dash(city.counts?.withInstagram)}</td>
            </tr>
          ))}
        </tbody>
        {cities.length > 1 && (
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>Total</th>
              <td>{sumBy(cities, (c) => c.counts?.found)}</td>
              <td><strong>{sumBy(cities, (c) => c.total)}</strong></td>
              <td>{sumBy(cities, (c) => c.counts?.withPhone)}</td>
              <td>{sumBy(cities, (c) => c.counts?.withoutWebsite)}</td>
              <td>{sumBy(cities, (c) => c.counts?.withInstagram)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
