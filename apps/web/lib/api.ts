import type { LeadSearchParams, LeadSearchResult, NicheOption } from './types';

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

function toQueryString(params: LeadSearchParams): string {
  return new URLSearchParams({
    city: params.city,
    niche: params.niche,
    onlyWithPhone: String(params.onlyWithPhone),
  }).toString();
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

export function searchLeads(params: LeadSearchParams, signal?: AbortSignal): Promise<LeadSearchResult> {
  return getJson<LeadSearchResult>(`/api/leads?${toQueryString(params)}`, signal);
}

export function buildExportUrl(params: LeadSearchParams): string {
  return `${API_URL}/api/leads/export?${toQueryString(params)}`;
}
