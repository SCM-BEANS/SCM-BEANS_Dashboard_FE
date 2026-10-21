import { requestDolores } from './client';
import { AlertsSchema } from '@/schemas/dolores/notifications';

export const alertsApi = {
  list(signal?: AbortSignal) {
    return requestDolores({ method: 'GET', url: '/alerts', signal }, AlertsSchema);
  },
};
