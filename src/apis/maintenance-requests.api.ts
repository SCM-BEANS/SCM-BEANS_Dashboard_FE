import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  MaintenanceAppointmentRequestSchema,
  MaintenanceRequestDetailsSchema,
  MaintenanceRequestIdSchema,
  MaintenanceRequestListSchema,
  MaintenanceScheduleExceptionRequestSchema,
  MaintenanceTicketSchema,
  type MaintenanceRequest,
} from "@/schema/machines.schema";

type BoundedPage<T> = { items: T[]; page: number; size: number; hasNext: boolean };
export type MaintenanceRequestListParams = {
  page?: number;
  size?: number;
  requestType?: "PREVENTIVE" | "REPAIR";
  status?: MaintenanceRequest["status"];
  ownerId?: string;
  contractId?: string;
  machineId?: string;
};

function responseHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export const maintenanceRequestsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/maintenance-requests", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MaintenanceRequestListSchema.parse(response.data);
  },
  async listPage(input: MaintenanceRequestListParams = {}, signal?: AbortSignal): Promise<BoundedPage<MaintenanceRequest>> {
    const params = { page: 0, size: 50, ...input };
    const response = await axiosClient.get<unknown>("/maintenance-requests", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = MaintenanceRequestListSchema.parse(response.data);
    const responsePage = Number(responseHeader(response.headers, "x-page"));
    const responseSize = Number(responseHeader(response.headers, "x-page-size"));
    const hasNext = responseHeader(response.headers, "x-has-next");
    return {
      items,
      page: Number.isInteger(responsePage) && responsePage >= 0 ? responsePage : params.page,
      size: Number.isInteger(responseSize) && responseSize > 0 ? responseSize : params.size,
      hasNext: hasNext?.toLowerCase() === "true",
    };
  },
  async getById(requestId: string, signal?: AbortSignal) {
    const validRequestId = MaintenanceRequestIdSchema.parse(requestId);
    const response = await axiosClient.get<unknown>(`/maintenance-requests/${encodeURIComponent(validRequestId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const request = MaintenanceRequestDetailsSchema.parse(response.data);
    if (request.id !== validRequestId) throw new Error("Dolores returned a different maintenance request than requested.");
    return request;
  },
  async confirm(requestId: string, input: { appointmentAt: string }) {
    const validRequestId = MaintenanceRequestIdSchema.parse(requestId);
    const body = MaintenanceAppointmentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/maintenance-requests/" + encodeURIComponent(validRequestId) + "/confirm",
      body,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const request = MaintenanceRequestDetailsSchema.parse(response.data);
    if (request.id !== validRequestId || request.status !== "CONFIRMED") {
      throw new Error("Dolores did not confirm the requested maintenance appointment.");
    }
    return request;
  },
  async createWorkOrder(requestId: string, input?: { appointmentAt: string; reason: string }) {
    const validRequestId = MaintenanceRequestIdSchema.parse(requestId);
    const body = input === undefined ? undefined : MaintenanceScheduleExceptionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/maintenance-requests/" + encodeURIComponent(validRequestId) + "/work-order",
      body,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (!ticket.id || ticket.maintenanceRequestId !== validRequestId) {
      throw new Error("Dolores did not link the created maintenance ticket to the requested maintenance request.");
    }
    return ticket;
  },
};
