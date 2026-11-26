'use client';

import { useEffect, useState } from 'react';
import type { Lead } from '@/lib/types';

const PAGE_SIZE = 25;
const HTTP_URL = /^https?:\/\//i;

/** Defence in depth: the API already sanitizes URLs, the UI still renders only http(s) links. */
function SafeLink({ href, label }: { href: string; label: string }) {
  if (!HTTP_URL.test(href)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="pill">
      {label}
    </a>
  );
}

function WebPresence({ lead }: { lead: Lead }) {
  if (!lead.website && !lead.instagram) return <span className="muted">Sem site</span>;
  return (
    <span className="presence">
      <SafeLink href={lead.website} label="Site" />
      <SafeLink href={lead.instagram} label="Instagram" />
    </span>
  );
}

/** Paginated (25 rows/page) so the DOM stays small no matter how many cities are searched. */
export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

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
              <th scope="col">Cidade</th>
              <th scope="col">Site / Instagram</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr key={`${lead.city}|${lead.id}`}>
                <td className="cell-name">{lead.name}</td>
                <td className="cell-phone">{lead.phone || <span className="muted">—</span>}</td>
                <td>{lead.address || <span className="muted">Não informado</span>}</td>
                <td>{lead.city}</td>
                <td><WebPresence lead={lead} /></td>
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
          <button type="button" className="button" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </button>
        </nav>
      )}
    </>
  );
}
