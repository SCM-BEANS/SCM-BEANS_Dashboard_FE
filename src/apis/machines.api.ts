import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  InventorySummarySchema,
  MachineIdSchema,
  MachineInventorySchema,
  MachineSchema,
  CreateMachineRequestSchema,
  type CreateMachineRequest,
  MaintenanceTicketListSchema,
  MaintenanceScheduleSchema,
} from "@/schema/machines.schema";

export class MachineIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different machine than the requested UUID.");
    this.name = "MachineIdentityMismatchError";
  }
}

const machinePath = (id: string) => `/machines/${encodeURIComponent(MachineIdSchema.parse(id))}`;

export const machinesApi = {
  async create(input: CreateMachineRequest) {
    const request = CreateMachineRequestSchema.parse(input);
    await axiosClient.post<unknown>("/machines", request, { baseURL: DOLORES_API_BASE_URL });
  },
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/machines", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MachineInventorySchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = MachineIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(machinePath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const machine = MachineSchema.parse(response.data);
    if (machine.id !== validId) throw new MachineIdentityMismatchError();
    return machine;
  },
  async getInventorySummary(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/inventory/summary", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return InventorySummarySchema.parse(response.data);
  },
  async getMaintenanceSchedule(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${machinePath(id)}/maintenance-schedule`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MaintenanceScheduleSchema.parse(response.data);
  },
  async listMaintenanceTickets(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/maintenance-tickets", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MaintenanceTicketListSchema.parse(response.data);
  },
};
