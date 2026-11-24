import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderUnavailableError } from '../src/common/domain-errors';
import { appConfig } from '../src/config/app.config';
import { OverpassClient } from '../src/leads/infrastructure/osm/overpass.client';

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

  it('raises ProviderUnavailableError when every mirror fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('busy', { status: 504 })));
    await expect(new OverpassClient(config).findElements(box, tags)).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
  });
});
