import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5006/api';

/**
 * Optional Firebase token provider.
 * We lazy-import firebase/auth only in the browser.
 */
async function getFirebaseIdToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null; // SSR/Node: skip
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch {
    return null; // firebase not configured on this page
  }
}

/**
 * Axios instance
 */
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: false,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getFirebaseIdToken();

  if (token) {
    const headers = new AxiosHeaders(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

export const toErrorMessage = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    // narrow response data to a small shape we care about
    const data = err.response?.data as
      | { error?: string; detail?: string }
      | undefined;
    return data?.error ?? data?.detail ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Request failed';
};

export class ApiRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const toApiRequestError = (err: unknown): ApiRequestError => {
  if (err instanceof ApiRequestError) return err;
  return new ApiRequestError(
    toErrorMessage(err),
    axios.isAxiosError(err) ? err.response?.status : undefined
  );
};

export const isConflictError = (err: unknown): err is ApiRequestError =>
  err instanceof ApiRequestError && err.status === 409;
