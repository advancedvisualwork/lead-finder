import { CityNotFoundError, ProviderUnavailableError } from '../common/domain-errors';
import { ValidationError } from './parse-query';

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function logFailure(status: number, error: unknown): void {
  const detail = error instanceof Error ? { error: error.name, detail: error.message } : { error: 'Unknown' };
  console.error(JSON.stringify({ event: 'request_failed', status, ...detail }));
}

/** Maps domain errors to predictable HTTP responses without leaking internals (no stack traces). */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    return json({ message: 'Parâmetros inválidos.', issues: error.issues }, 400);
  }
  if (error instanceof CityNotFoundError) {
    return json({ message: 'Cidade não encontrada. Tente o formato "Cidade, UF".' }, 404);
  }
  if (error instanceof ProviderUnavailableError) {
    logFailure(502, error);
    return json({ message: 'A fonte de dados está indisponível no momento. Tente novamente em instantes.' }, 502);
  }
  logFailure(500, error);
  return json({ message: 'Erro interno.' }, 500);
}

export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { message: 'Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente.' },
    { status: 429, headers: { ...NO_STORE, 'Retry-After': String(retryAfterSeconds) } },
  );
}
