import axios, { type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { z } from 'zod';
import axiosClient from '@/lib/axios/axiosClient';
import { AUTH } from '@/constants/endpoints';
import { PATH_AUTH } from '@/routes/path';

export type DoloresErrorKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'invalid_request'
  | 'not_found'
  | 'rate_limited'
  | 'timeout'
  | 'network'
  | 'server'
  | 'invalid_response'
  | 'unknown';

export class DoloresApiError extends Error {
  constructor(
    readonly kind: DoloresErrorKind,
    readonly status: number | null,
    message: string
  ) {
    super(message);
    this.name = 'DoloresApiError';
  }
}

export const doloresAxiosClient = axios.create({
  baseURL: '/api/dolores/v1',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response: any = await axiosClient.post(AUTH.REFRESH, {});
      const accessToken = response?.data?.access_token || response?.access_token;
      if (typeof accessToken !== 'string' || !accessToken) {
        throw new Error('Token refresh response did not include an access token.');
      }

      Cookies.set('access_token', accessToken, { expires: 15 / (24 * 60), secure: true });
      return accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

doloresAxiosClient.interceptors.request.use((config) => {
  if (!config.url?.startsWith('/') || config.url.startsWith('//')) {
    throw new DoloresApiError('invalid_request', 400, 'Dolores path must be relative to the configured API.');
  }

  const token = Cookies.get('access_token');
  if (!token) {
    throw new DoloresApiError('unauthenticated', 401, 'Access token is missing.');
  }

  config.headers.set('Authorization', 'Bearer ' + token);
  return config;
});

doloresAxiosClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (error instanceof DoloresApiError || axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new DoloresApiError('unknown', null, 'Unexpected Dolores request failure.'));
    }

    const status = error.response?.status ?? null;
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.set('Authorization', 'Bearer ' + accessToken);
        return doloresAxiosClient.request(originalRequest);
      } catch {
        Cookies.remove('access_token');
        if (typeof window !== 'undefined') window.location.href = PATH_AUTH.login;
        return Promise.reject(new DoloresApiError('unauthenticated', 401, 'Dolores authentication failed.'));
      }
    }

    if (status === 401) {
      return Promise.reject(new DoloresApiError('unauthenticated', status, 'Dolores authentication failed.'));
    }
    if (status === 403) {
      return Promise.reject(new DoloresApiError('forbidden', status, 'This Dolores operation is forbidden.'));
    }
    if (status === 400 || status === 422) {
      return Promise.reject(new DoloresApiError('invalid_request', status, 'Dolores rejected the request.'));
    }
    if (status === 404) {
      return Promise.reject(new DoloresApiError('not_found', status, 'Dolores resource was not found.'));
    }
    if (status === 429) {
      return Promise.reject(new DoloresApiError('rate_limited', status, 'Dolores rate limit was reached.'));
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || status === 408 || status === 504) {
      return Promise.reject(new DoloresApiError('timeout', status, 'Dolores request timed out.'));
    }
    if (status !== null && status >= 500) {
      return Promise.reject(new DoloresApiError('server', status, 'Dolores server failed.'));
    }
    if (status === null) {
      return Promise.reject(new DoloresApiError('network', null, 'Dolores network request failed.'));
    }
    return Promise.reject(new DoloresApiError('unknown', status, 'Dolores request failed.'));
  }
);

export function parseDoloresResponse<TSchema extends z.ZodTypeAny>(
  data: unknown,
  schema: TSchema
): z.infer<TSchema> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new DoloresApiError('invalid_response', null, 'Dolores returned an unexpected response shape.');
  }
  return parsed.data;
}
