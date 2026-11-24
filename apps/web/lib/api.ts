import type { LeadFilters, LeadSearchResult, NicheOption } from './types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function toQueryString(cities: readonly string[], filters: LeadFilters): string {
  const params = new URLSearchParams();
  for (const city of cities) params.append('city', city);
  params.set('niche', filters.niche);
  params.set('onlyWithPhone', String(filters.onlyWithPhone));
  params.set('withoutWebsite', String(filters.withoutWebsite));
  params.set('instagramCountsAsNoWebsite', String(filters.instagramCountsAsNoWebsite));
  params.set('limit', String(filters.limit));
  return params.toString();
}

async function readErrorMessage(response: Response): Promise<string> {
  if (response.status === 429) return 'Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente.';
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
    response = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar à API. Verifique se ela está em execução.', 0);
  }
  if (!response.ok) throw new ApiError(await readErrorMessage(response), response.status);
  return (await response.json()) as T;
}

export function fetchNiches(signal?: AbortSignal): Promise<NicheOption[]> {
  return getJson<NicheOption[]>('/api/niches', signal);
}

export function searchLeads(city: string, filters: LeadFilters, signal?: AbortSignal): Promise<LeadSearchResult> {
  return getJson<LeadSearchResult>(`/api/leads?${toQueryString([city], filters)}`, signal);
}

export function buildExportUrl(cities: readonly string[], filters: LeadFilters): string {
  return `${API_URL}/api/leads/export?${toQueryString(cities, filters)}`;
}
