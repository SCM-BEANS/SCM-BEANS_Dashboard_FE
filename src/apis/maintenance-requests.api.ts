import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  MaintenanceAppointmentRequestSchema,
  MaintenanceCustodyAcknowledgementRequestSchema,
  MaintenanceCustodyEventListSchema,
  MaintenanceRequestDetailsSchema,
  MaintenanceRequestListSchema,
  MaintenanceRequestSchema,
  MachineIdSchema,
  type MaintenanceAppointmentRequest,
  type MaintenanceCustodyAcknowledgementRequest,
} from "@/schema/machines.schema";

const requestPath = (id: string) => `/maintenance-requests/${encodeURIComponent(MaintenanceRequestSchema.shape.id.parse(id))}`;
const custodyEventIdSchema = MaintenanceRequestSchema.shape.id;

export const maintenanceRequestsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/maintenance-requests", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MaintenanceRequestListSchema.parse(response.data);
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

  async getById(id: string, signal?: AbortSignal) {
    const requestId = MaintenanceRequestSchema.shape.id.parse(id);
    const response = await axiosClient.get<unknown>(requestPath(requestId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const request = MaintenanceRequestDetailsSchema.parse(response.data);
    if (request.id !== requestId) throw new Error("Dolores returned a different maintenance request.");
    return request;
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

  async confirm(id: string, input: MaintenanceAppointmentRequest) {
    const requestId = MaintenanceRequestSchema.shape.id.parse(id);
    const request = MaintenanceAppointmentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${requestPath(requestId)}/confirm`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const result = MaintenanceRequestDetailsSchema.parse(response.data);
    if (result.id !== requestId) throw new Error("Dolores returned a different maintenance request.");
    return result;
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
  },
};
