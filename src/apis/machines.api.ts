import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  InventorySummarySchema,
  MachineIdSchema,
  MachineInventorySchema,
  RentalCandidatePageSchema,
  MachineSchema,
  CreateMachineRequestSchema,
  CreateMachineResponseSchema,
  MarkMachineReadyRequestSchema,
  type CreateMachineRequest,
  type MarkMachineReadyRequest,
  MaintenanceTicketListSchema,
  MaintenanceScheduleSchema,
  RepairIntakeRequestSchema,
  RepairIntakeResponseSchema,
  type RepairIntakeRequest,
} from "@/schema/machines.schema";

export class MachineIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different machine than the requested UUID.");
    this.name = "MachineIdentityMismatchError";
  }
}

export class MachineCreateUnexpectedStatusError extends Error {
  constructor(readonly status: number) {
    super(`Machine creation returned HTTP ${status}; model linking was skipped.`);
    this.name = "MachineCreateUnexpectedStatusError";
  }
}

const machinePath = (id: string) => `/machines/${encodeURIComponent(MachineIdSchema.parse(id))}`;

export const machinesApi = {
  async create(input: CreateMachineRequest) {
    const request = CreateMachineRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/machines", request, { baseURL: DOLORES_API_BASE_URL });
    if (response.status !== 200 && response.status !== 201) {
      throw new MachineCreateUnexpectedStatusError(response.status);
    }
    return CreateMachineResponseSchema.parse(response.data);
  },
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/machines", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MachineInventorySchema.parse(response.data);
  },
  async listRentalCandidates(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/inventory/rental-candidates", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return RentalCandidatePageSchema.parse(response.data).content;
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
  async markReady(id: string, input: MarkMachineReadyRequest) {
    const machineId = encodeURIComponent(MachineIdSchema.parse(id));
    const request = MarkMachineReadyRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`/inventory/machines/${machineId}/readiness`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return response.data;
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
  async createRepairIntake(input: RepairIntakeRequest) {
    const request = RepairIntakeRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/repair-cases/intakes",
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return RepairIntakeResponseSchema.parse(response.data);
  },
};
