import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  InstallationWorkOrderDetailsSchema,
  InstallationWorkOrderIdSchema,
  InstallationWorkOrderListSchema,
  InstallationWorkOrderTenantIdSchema,
} from "@/schema/installation-work-orders.schema";

export class InstallationWorkOrderIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different installation work order than requested.");
    this.name = "InstallationWorkOrderIdentityMismatchError";
  }
}

export class InstallationWorkOrderTenantMismatchError extends Error {
  constructor() {
    super("Dolores returned a work order outside the requested tenant scope.");
    this.name = "InstallationWorkOrderTenantMismatchError";
  }
}

export const installationWorkOrdersApi = {
  async listByTenant(id: string, signal?: AbortSignal) {
    const tenantId = InstallationWorkOrderTenantIdSchema.parse(id);
    const response = await axiosClient.get<unknown>("/installation-work-orders", {
      baseURL: DOLORES_API_BASE_URL,
      params: { tenantId },
      signal,
    });
    const workOrders = InstallationWorkOrderListSchema.parse(response.data);
    if (workOrders.some((workOrder) => workOrder.tenantId !== tenantId)) {
      throw new InstallationWorkOrderTenantMismatchError();
    }
    return workOrders;
  },

  async getById(id: string, signal?: AbortSignal) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(
      `/installation-work-orders/${encodeURIComponent(workOrderId)}`,
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const details = InstallationWorkOrderDetailsSchema.parse(response.data);
    if (details.workOrder.id !== workOrderId) {
      throw new InstallationWorkOrderIdentityMismatchError();
    }
    return details;
  },
};
