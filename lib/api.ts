import type { LeadFilters, LeadSearchResult, NicheOption } from './types';

/** Same-origin API routes (app/api/*): no separate server, no CORS. */
const API_BASE = '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function buildSearchQuery(city: string, filters: LeadFilters): string {
  return new URLSearchParams({
    city,
    niche: filters.niche,
    onlyWithPhone: String(filters.onlyWithPhone),
    withoutWebsite: String(filters.withoutWebsite),
    instagramCountsAsNoWebsite: String(filters.instagramCountsAsNoWebsite),
    limit: String(filters.limit),
  }).toString();
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) return 'Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente.';
  if (response.status === 504) return 'A busca demorou demais. Tente novamente em instantes.';
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === 'string') return body.message;
  } catch {
    // Non-JSON error body: fall through to the generic message.
  }
  return 'Não foi possível concluir a busca. Tente novamente.';
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 0);
  }
  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  return (await response.json()) as T;
}

export function fetchNiches(signal?: AbortSignal): Promise<NicheOption[]> {
  return getJson<NicheOption[]>('/niches', signal);
}

export function searchLeads(city: string, filters: LeadFilters, signal?: AbortSignal): Promise<LeadSearchResult> {
  return getJson<LeadSearchResult>(`/leads?${buildSearchQuery(city, filters)}`, signal);
}
