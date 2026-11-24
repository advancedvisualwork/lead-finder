import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderUnavailableError } from '../../server/common/domain-errors';
import { appConfig } from '../../server/config/app.config';
import { OverpassClient } from '../../server/leads/infrastructure/osm/overpass.client';

const config = { ...appConfig, overpassUrls: ['https://primary.test/api', 'https://mirror.test/api'] };
const box = { south: -23, west: -47, north: -22, east: -46 };
const tags = [{ key: 'amenity', value: 'dentist' }];

afterEach(() => vi.unstubAllGlobals());

describe('OverpassClient failover', () => {
  it('falls back to the next mirror when the first one is unavailable', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('TLS handshake failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [{ type: 'node', id: 1 }] })));
    vi.stubGlobal('fetch', fetchMock);

    const elements = await new OverpassClient(config).findElements(box, tags);

    expect(elements).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(config.overpassUrls);
  });

  it('tries the last mirror that answered first on the next search', async () => {
    const ok = () => new Response(JSON.stringify({ elements: [] }));
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError('down')).mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const client = new OverpassClient(config);

    await client.findElements(box, tags);
    await client.findElements(box, tags);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://primary.test/api',
      'https://mirror.test/api',
      'https://mirror.test/api',
    ]);
  });

  it('queries a second mirror in parallel when the first is slow, and uses whichever answers', async () => {
    const hanging = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))));
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(hanging)
      .mockResolvedValueOnce(new Response(JSON.stringify({ elements: [{ type: 'node', id: 7 }] })));
    vi.stubGlobal('fetch', fetchMock);
    const client = new OverpassClient({ ...config, overpassHedgeDelayMs: 20, overpassTotalBudgetMs: 2_000 });

    const elements = await client.findElements(box, tags);

    expect(elements).toEqual([{ type: 'node', id: 7 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up with ProviderUnavailableError once the total budget is spent', async () => {
    const hanging = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))));
    vi.stubGlobal('fetch', vi.fn().mockImplementation(hanging));
    const client = new OverpassClient({ ...config, overpassHedgeDelayMs: 10, overpassTotalBudgetMs: 80 });

    await expect(client.findElements(box, tags)).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('raises ProviderUnavailableError when every mirror fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 504 })));
    await expect(new OverpassClient(config).findElements(box, tags)).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });
});
