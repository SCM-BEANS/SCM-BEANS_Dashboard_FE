import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  CreateInstallationWorkOrderRequestSchema,
  CreateInstallationWorkOrderResponseSchema,
  FailInstallationWorkOrderRequestSchema,
  InstallationAccessoryRequestSchema,
  InstallationChecklistResultRequestSchema,
  InstallationChecklistResultResponseSchema,
  AssignInstallationWorkOrderRequestSchema,
  RescheduleInstallationWorkOrderRequestSchema,
  CancelInstallationWorkOrderRequestSchema,
  AssignedInstallationWorkOrderListSchema,
  CompleteInstallationWorkOrderRequestSchema,
  InstallationWorkOrderEvidenceUploadResponseSchema,
  InstallationWorkOrderAccessorySchema,
  InstallationWorkOrderDetailsSchema,
  InstallationWorkOrderIdSchema,
  InstallationWorkOrderListSchema,
  InstallationWorkOrderRecordSchema,
  InstallationWorkOrderOwnerIdSchema,
  type CreateInstallationWorkOrderRequest,
  type FailInstallationWorkOrderRequest,
  type InstallationAccessoryRequest,
  type InstallationChecklistResultRequest,
  type AssignInstallationWorkOrderRequest,
  type RescheduleInstallationWorkOrderRequest,
  type CancelInstallationWorkOrderRequest,
} from "@/schema/installation-work-orders.schema";

export class InstallationWorkOrderIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different installation work order than requested.");
    this.name = "InstallationWorkOrderIdentityMismatchError";
  }
}

export class InstallationWorkOrderOwnerMismatchError extends Error {
  constructor() {
    super("Dolores returned a work order outside the requested Owner scope.");
    this.name = "InstallationWorkOrderOwnerMismatchError";
  }
}

const workOrderPath = (id: string) =>
  `/installation-work-orders/${encodeURIComponent(InstallationWorkOrderIdSchema.parse(id))}`;

export const installationWorkOrdersApi = {
  async create(input: CreateInstallationWorkOrderRequest) {
    const request = CreateInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/installation-work-orders", request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return CreateInstallationWorkOrderResponseSchema.parse(response.data);
  },

  async listByOwner(id: string, signal?: AbortSignal) {
    const ownerId = InstallationWorkOrderOwnerIdSchema.parse(id);
    const response = await axiosClient.get<unknown>("/installation-work-orders", {
      baseURL: DOLORES_API_BASE_URL,
      params: { ownerId },
      signal,
    });
    const workOrders = InstallationWorkOrderListSchema.parse(response.data);
    if (workOrders.some((workOrder) => workOrder.ownerId !== ownerId)) {
      throw new InstallationWorkOrderOwnerMismatchError();
    }
    return workOrders;
  },

  async listAssigned(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/installation-work-orders/assigned", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return AssignedInstallationWorkOrderListSchema.parse(response.data);
  },

  async getById(id: string, signal?: AbortSignal) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(workOrderPath(workOrderId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const details = InstallationWorkOrderDetailsSchema.parse(response.data);
    if (details.workOrder.id !== workOrderId) {
      throw new InstallationWorkOrderIdentityMismatchError();
    }
    return details;
  },

  async assign(id: string, input: AssignInstallationWorkOrderRequest) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = AssignInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/assign`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },

  async reschedule(id: string, input: RescheduleInstallationWorkOrderRequest) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = RescheduleInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/reschedule`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },

  async cancel(id: string, input: CancelInstallationWorkOrderRequest) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = CancelInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/cancel`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },

  async start(id: string) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/start`, undefined, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },

  async updateChecklist(
    id: string,
    checklistItemId: string,
    input: InstallationChecklistResultRequest,
  ) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const itemId = InstallationWorkOrderIdSchema.parse(checklistItemId);
    const request = InstallationChecklistResultRequestSchema.parse(input);
    const response = await axiosClient.put<unknown>(
      `${workOrderPath(workOrderId)}/checklist/${encodeURIComponent(itemId)}`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const result = InstallationChecklistResultResponseSchema.parse(response.data);
    if (result.workOrderId !== workOrderId || result.checklistItemId !== itemId) {
      throw new InstallationWorkOrderIdentityMismatchError();
    }
    return result;
  },

  async addAccessory(id: string, input: InstallationAccessoryRequest) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = InstallationAccessoryRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `${workOrderPath(workOrderId)}/accessories`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return InstallationWorkOrderAccessorySchema.parse(response.data);
  },

  async fail(id: string, input: FailInstallationWorkOrderRequest) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = FailInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `${workOrderPath(workOrderId)}/fail`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },

  async uploadEvidence(id: string, file: File) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    if (file.size <= 0) throw new Error("A non-empty installation evidence file is required.");
    if (file.size > 20 * 1024 * 1024) throw new Error("Installation evidence cannot exceed 20 MB.");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      throw new Error("Installation evidence must be a PDF, JPEG, or PNG file.");
    }

    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/evidence`, form, {
      baseURL: DOLORES_API_BASE_URL,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return InstallationWorkOrderEvidenceUploadResponseSchema.parse(response.data);
  },

  async complete(id: string, input: { handoverRecipient: string }) {
    const workOrderId = InstallationWorkOrderIdSchema.parse(id);
    const request = CompleteInstallationWorkOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(workOrderId)}/complete`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const workOrder = InstallationWorkOrderRecordSchema.parse(response.data);
    if (workOrder.id !== workOrderId) throw new InstallationWorkOrderIdentityMismatchError();
    return workOrder;
  },
};
