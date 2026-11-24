import { ProviderUnavailableError } from '../../../common/domain-errors';

export interface FetchJsonOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs: number;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T> {
  const { timeoutMs, ...init } = options;
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new ProviderUnavailableError(`Upstream request failed: ${new URL(url).host}`, { cause: error });
  }
  if (!response.ok) {
    throw new ProviderUnavailableError(`Upstream ${new URL(url).host} responded ${response.status}`);
  }
  return (await response.json()) as T;
}
