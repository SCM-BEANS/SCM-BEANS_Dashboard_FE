import { doloresAxiosClient, parseDoloresResponse } from './client';
import {
  InstallationWorkOrderDetailsSchema,
  InstallationWorkOrderIdSchema,
  InstallationWorkOrderListSchema,
  InstallationWorkOrderTenantIdSchema,
} from '@/schemas/dolores/installationWorkOrders';
import type {
  InstallationWorkOrderDetails,
  InstallationWorkOrderSummary,
} from '@/types/dolores/installationWorkOrders';

export const installationWorkOrdersApi = {
  listByTenant: async (tenantId: string, signal?: AbortSignal): Promise<InstallationWorkOrderSummary[]> => {
    const response = await doloresAxiosClient.get<unknown>('/installation-work-orders', {
      params: { tenantId: InstallationWorkOrderTenantIdSchema.parse(tenantId) },
      signal,
    });
    return parseDoloresResponse(response.data, InstallationWorkOrderListSchema);
  },

  getById: async (workOrderId: string, signal?: AbortSignal): Promise<InstallationWorkOrderDetails> => {
    const response = await doloresAxiosClient.get<unknown>(
      '/installation-work-orders/' + encodeURIComponent(InstallationWorkOrderIdSchema.parse(workOrderId)),
      { signal }
    );
    return parseDoloresResponse(response.data, InstallationWorkOrderDetailsSchema);
  },
};
