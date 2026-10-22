import { doloresAxiosClient, parseDoloresResponse } from './client';
import { AlertsSchema } from '@/schemas/dolores/notifications';
import type { Alert } from '@/types/dolores/notifications';

export const alertsApi = {
  list: async (signal?: AbortSignal): Promise<Alert[]> => {
    const response = await doloresAxiosClient.get<unknown>('/alerts', { signal });
    return parseDoloresResponse(response.data, AlertsSchema);
  },
};
