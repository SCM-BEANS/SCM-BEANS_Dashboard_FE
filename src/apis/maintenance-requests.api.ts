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
import { MaintenanceCustodyAcknowledgementRequestSchema, MaintenanceCustodyEventListSchema, MaintenanceRequestSchema, MachineIdSchema, type MaintenanceAppointmentRequest, type MaintenanceCustodyAcknowledgementRequest } from "@/schema/machines.schema";
const requestPath = (id: string) => `/maintenance-requests/${encodeURIComponent(MaintenanceRequestSchema.shape.id.parse(id))}`;
const custodyEventIdSchema = MaintenanceRequestSchema.shape.id;


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

export const maintenanceRequestsApi =  {
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
  async listByMachine(machineId: string, signal?: AbortSignal) {
    const validMachineId = MachineIdSchema.parse(machineId);
    const response = await axiosClient.get<unknown>("/maintenance-requests", {
      baseURL: DOLORES_API_BASE_URL,
      params: { machineId: validMachineId, page: 0, size: 100 },
      signal,
    });
    const requests = MaintenanceRequestListSchema.parse(response.data);
    if (requests.some((request) => request.machineId !== validMachineId)) {
      throw new Error("Dolores returned a maintenance request for a different machine.");
    }
    return requests;
  },
  async getCustodyEvents(id: string, signal?: AbortSignal) {
    const requestId = MaintenanceRequestSchema.shape.id.parse(id);
    const response = await axiosClient.get<unknown>(`${requestPath(requestId)}/custody-events`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page: 0, size: 50 },
      signal,
    });
    const events = MaintenanceCustodyEventListSchema.parse(response.data);
    if (events.some((event) => event.maintenanceRequestId !== requestId)) {
      throw new Error("Dolores returned custody history for a different maintenance request.");
    }
    return events;
  },
  async reschedule(id: string, input: MaintenanceAppointmentRequest) {
    const requestId = MaintenanceRequestSchema.shape.id.parse(id);
    const request = MaintenanceAppointmentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${requestPath(requestId)}/reschedule`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const result = MaintenanceRequestDetailsSchema.parse(response.data);
    if (result.id !== requestId) throw new Error("Dolores returned a different maintenance request.");
    return result;
  },
  async acknowledgeCustodyEvent(id: string, input: MaintenanceCustodyAcknowledgementRequest) {
    const eventId = custodyEventIdSchema.parse(id);
    const request = MaintenanceCustodyAcknowledgementRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/maintenance-requests/custody-events/${encodeURIComponent(eventId)}/acknowledge`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const result = MaintenanceCustodyEventListSchema.element.parse(response.data);
    if (result.id !== eventId) throw new Error("Dolores returned a different custody event.");
    return result;
  }
};
