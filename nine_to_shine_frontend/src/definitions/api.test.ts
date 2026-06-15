import { AxiosHeaders, AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

const firebaseAuth = vi.hoisted(() => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: firebaseAuth.getAuth,
}));

async function loadApiModule(apiBaseUrl?: string) {
  vi.resetModules();
  if (apiBaseUrl) {
    process.env.NEXT_PUBLIC_API_BASE_URL = apiBaseUrl;
  } else {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  return import('./api');
}

describe('shared Axios API client', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it('uses NEXT_PUBLIC_API_BASE_URL when configured', async () => {
    const { api } = await loadApiModule('https://api.example.test/api');

    expect(api.defaults.baseURL).toBe('https://api.example.test/api');
  });

  it('keeps the documented local fallback when no API base URL is configured', async () => {
    const { api } = await loadApiModule();

    expect(api.defaults.baseURL).toBe('http://localhost:5006/api');
  });

  it('injects a Firebase bearer token when a browser user is signed in', async () => {
    const getIdToken = vi.fn().mockResolvedValue('id-token-123');
    firebaseAuth.getAuth.mockReturnValue({
      currentUser: {
        getIdToken,
      },
    });

    const { api } = await loadApiModule('https://api.example.test/api');
    let seenHeaders: unknown;
    api.defaults.adapter = (async (config) => {
      seenHeaders = config.headers;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    }) as AxiosAdapter;

    await api.get('/user');

    expect(getIdToken).toHaveBeenCalledOnce();
    expect(new AxiosHeaders(seenHeaders).get('Authorization')).toBe(
      'Bearer id-token-123'
    );
  });

  it('does not inject Authorization when no Firebase user is signed in', async () => {
    firebaseAuth.getAuth.mockReturnValue({ currentUser: null });

    const { api } = await loadApiModule('https://api.example.test/api');
    let seenHeaders: unknown;
    api.defaults.adapter = (async (config) => {
      seenHeaders = config.headers;
      return {
        data: { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    }) as AxiosAdapter;

    await api.get('/user');

    expect(new AxiosHeaders(seenHeaders).has('Authorization')).toBe(false);
  });

  it('prefers backend error and detail fields in error messages', async () => {
    const { toErrorMessage } = await loadApiModule('https://api.example.test/api');
    const response = {
      data: { error: 'Email already exists.' },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config: {},
    } as AxiosResponse;
    const err = new AxiosError('Request failed', '409', undefined, undefined, response);

    expect(toErrorMessage(err)).toBe('Email already exists.');
    expect(toErrorMessage(new Error('Plain failure'))).toBe('Plain failure');
    expect(toErrorMessage('unknown')).toBe('Request failed');
  });
});
