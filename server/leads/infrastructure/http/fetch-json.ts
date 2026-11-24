import { ProviderUnavailableError } from '../../../common/domain-errors';

export interface FetchJsonOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs: number;
  /** Optional external cancellation (e.g. the losing request in a mirror race). */
  signal?: AbortSignal;
}

export async function fetchJson<T>(url: string, options: FetchJsonOptions): Promise<T> {
  const { timeoutMs, signal, ...init } = options;
  const timeout = AbortSignal.timeout(timeoutMs);
  const host = new URL(url).host;
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: signal ? AbortSignal.any([timeout, signal]) : timeout });
  } catch (error) {
    throw new ProviderUnavailableError(`Upstream request failed: ${host}`, { cause: error });
  }
  if (!response.ok) {
    throw new ProviderUnavailableError(`Upstream ${host} responded ${response.status}`);
  }
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ProviderUnavailableError(`Upstream ${host} returned invalid JSON`, { cause: error });
  }
}
