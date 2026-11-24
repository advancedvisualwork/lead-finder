'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/types';

const PAGE_SIZE = 25;

interface LeadsTableProps {
  leads: Lead[];
}

/** Paginated (25 rows/page) so the DOM stays small even with the 200-lead upper bound. */
export function LeadsTable({ leads }: LeadsTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));

  useEffect(() => setPage(0), [leads]);

  const visible = leads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <div className="table-wrapper" role="region" aria-label="Tabela de leads" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Telefone</th>
              <th scope="col">Endereço</th>
              <th scope="col">Nicho</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr key={lead.id}>
                <td className="cell-name">{lead.name}</td>
                <td className="cell-phone">{lead.phone || <span className="muted">—</span>}</td>
                <td>{lead.address || <span className="muted">Não informado</span>}</td>
                <td>{lead.niche}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav className="pagination" aria-label="Paginação dos resultados">
          <button type="button" className="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span aria-live="polite">Página {page + 1} de {pageCount}</span>
          <button
            type="button"
            className="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </nav>
      )}
    </>
  );
}
