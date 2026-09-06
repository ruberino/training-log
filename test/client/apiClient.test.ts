/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, fetchJson, setOnUnauthorized } from '../../src/client/api/client.ts';

describe('fetchJson', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setOnUnauthorized(null);
  });

  it('returns the parsed JSON body on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    );

    await expect(fetchJson('/api/health')).resolves.toEqual({ status: 'ok' });
  });

  it('returns undefined for a 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(fetchJson('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('parses the error body and throws an ApiRequestError', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'Finnes ikke', requestId: 'abc' },
        }),
        { status: 404 },
      ),
    );

    const error = await fetchJson('/api/exercises/999').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Finnes ikke',
      requestId: 'abc',
    });
  });

  it('calls onUnauthorized on a 401 outside the login endpoint', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', message: 'Ikke innlogget', requestId: 'x' },
        }),
        { status: 401 },
      ),
    );

    await expect(fetchJson('/api/exercises')).rejects.toBeInstanceOf(ApiRequestError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not call onUnauthorized for a 401 from the login endpoint itself', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'UNAUTHORIZED', message: 'Feil passord', requestId: 'x' },
        }),
        { status: 401 },
      ),
    );

    await expect(fetchJson('/api/auth/login', { method: 'POST' })).rejects.toBeInstanceOf(
      ApiRequestError,
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
