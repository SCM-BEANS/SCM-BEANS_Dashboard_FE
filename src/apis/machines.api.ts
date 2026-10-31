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
  MaintenanceTicketDetailsSchema,
  MaintenanceTicketListParamsSchema,
  type MaintenanceTicketListParams,
  MaintenanceScheduleSchema,
  RepairIntakeRequestSchema,
  RepairIntakeResponseSchema,
  type RepairIntakeRequest,
  UpdateMachineRequestSchema,
  MachineTypeMappingRequestSchema,
  type UpdateMachineRequest,
  type MachineTypeMappingRequest,
} from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";

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
    const pageSize = 100;
    const fetchPage = async (page: number) => {
      const response = await axiosClient.get<unknown>("/inventory/rental-candidates", {
        baseURL: DOLORES_API_BASE_URL,
        params: { page, size: pageSize },
        signal,
      });
      return RentalCandidatePageSchema.parse(response.data);
    };

    const firstPage = await fetchPage(0);
    const candidates = [...firstPage.content];
    for (let start = 1; start < firstPage.totalPages; start += 5) {
      const pageNumbers = Array.from(
        { length: Math.min(5, firstPage.totalPages - start) },
        (_, offset) => start + offset,
      );
      const pages = await Promise.all(pageNumbers.map(fetchPage));
      candidates.push(...pages.flatMap((page) => page.content));
      if (signal?.aborted) break;
    }
    return candidates;
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
  async update(id: string, input: UpdateMachineRequest) {
    const validId = MachineIdSchema.parse(id);
    const request = UpdateMachineRequestSchema.parse(input);
    const response = await axiosClient.put<unknown>(machinePath(validId), request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const machine = MachineSchema.parse(response.data);
    if (machine.id !== validId) throw new MachineIdentityMismatchError();
    return machine;
  },
  async delete(id: string) {
    const validId = MachineIdSchema.parse(id);
    await axiosClient.delete(machinePath(validId), { baseURL: DOLORES_API_BASE_URL });
  },
  async setType(id: string, input: MachineTypeMappingRequest) {
    const validId = MachineIdSchema.parse(id);
    const request = MachineTypeMappingRequestSchema.parse(input);
    const response = await axiosClient.put<unknown>(`${machinePath(validId)}/type`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return response.data;
  },
  async assignTechnician(technicianId: string, machineId: string) {
    const validTechnicianId = ProfileIdSchema.parse(technicianId);
    const validMachineId = MachineIdSchema.parse(machineId);
    await axiosClient.post<unknown>(
      `/technician-assignments/${encodeURIComponent(validTechnicianId)}/machines/${encodeURIComponent(validMachineId)}`,
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
  },
  async unassignTechnician(technicianId: string, machineId: string) {
    const validTechnicianId = ProfileIdSchema.parse(technicianId);
    const validMachineId = MachineIdSchema.parse(machineId);
    await axiosClient.delete(
      `/technician-assignments/${encodeURIComponent(validTechnicianId)}/machines/${encodeURIComponent(validMachineId)}`,
      { baseURL: DOLORES_API_BASE_URL },
    );
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
  async listMaintenanceTickets(paramsOrSignal: MaintenanceTicketListParams | AbortSignal = {}, signal?: AbortSignal) {
    const isSignal = (value: MaintenanceTicketListParams | AbortSignal): value is AbortSignal =>
      "aborted" in value && typeof value.addEventListener === "function";
    const params = isSignal(paramsOrSignal) ? {} : paramsOrSignal;
    const requestSignal = isSignal(paramsOrSignal) ? paramsOrSignal : signal;
    const query = MaintenanceTicketListParamsSchema.parse(params);
    const response = await axiosClient.get<unknown>("/maintenance-tickets", {
      baseURL: DOLORES_API_BASE_URL,
      ...(Object.keys(query).length ? { params: query } : {}),
      signal: requestSignal,
    });
    return MaintenanceTicketListSchema.parse(response.data);
  },
  async getMaintenanceTicketById(id: string, signal?: AbortSignal) {
    const ticketId = MachineIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`/maintenance-tickets/${encodeURIComponent(ticketId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const ticket = MaintenanceTicketDetailsSchema.parse(response.data);
    if (ticket.id !== ticketId) throw new Error("Dolores returned a different maintenance ticket.");
    return ticket;
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
