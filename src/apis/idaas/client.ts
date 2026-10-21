import type { AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import axiosClient from '@/lib/axios/axiosClient';

export async function requestIdaas<TSchema extends z.ZodTypeAny>(
  config: AxiosRequestConfig,
  schema: TSchema
): Promise<z.infer<TSchema>> {
  if (!config.url?.startsWith('/') || config.url.startsWith('//')) {
    throw new Error('IDaaS path must be relative to the configured API.');
  }

  const response = await axiosClient.request<unknown, unknown>(config);
  const parsed = schema.safeParse(response);
  if (!parsed.success) {
    throw new Error('IDaaS returned an unexpected response shape.');
  }
  return parsed.data;
}
