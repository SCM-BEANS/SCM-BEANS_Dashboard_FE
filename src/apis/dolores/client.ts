import axios, { type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { z } from 'zod';

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

const doloresClient = axios.create({
  baseURL: '/api/dolores/v1',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

doloresClient.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (!token) {
    throw new DoloresApiError('unauthenticated', 401, 'Access token is missing.');
  }

  config.headers.set('Authorization', 'Bearer ' + token);
  return config;
});

doloresClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof DoloresApiError || axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (!axios.isAxiosError(error)) {
      return Promise.reject(new DoloresApiError('unknown', null, 'Unexpected Dolores request failure.'));
    }

    const status = error.response?.status ?? null;
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

export async function requestDolores<TSchema extends z.ZodTypeAny>(
  config: AxiosRequestConfig,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  if (!config.url?.startsWith('/') || config.url.startsWith('//')) {
    throw new DoloresApiError('invalid_request', 400, 'Dolores path must be relative to the configured API.');
  }

  const response = await doloresClient.request<unknown>(config);
  const parsed = schema.safeParse(response.data);
  if (!parsed.success) {
    throw new DoloresApiError('invalid_response', null, 'Dolores returned an unexpected response shape.');
  }
  return parsed.data;
}

export async function requestDoloresBlob(config: AxiosRequestConfig): Promise<Blob> {
  if (!config.url?.startsWith('/') || config.url.startsWith('//')) {
    throw new DoloresApiError('invalid_request', 400, 'Dolores path must be relative to the configured API.');
  }

  const response = await doloresClient.request<Blob>({
    ...config,
    headers: { ...config.headers, Accept: '*/*' },
    responseType: 'blob',
  });
  return response.data;
}
