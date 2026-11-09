import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  InventorySummarySchema,
  MachineIdSchema,
  CleaningComplianceParamsSchema,
  MachineCleaningComplianceSchema,
  MachineDeviceIdentityRequestSchema,
  MachineDeviceIdentitySchema,
  MachineInventorySchema,
  RentalCandidatePageSchema,
  MachineSchema,
  CreateMachineRequestSchema,
  CreateMachineResponseSchema,
  MarkMachineReadyRequestSchema,
  type CreateMachineRequest,
  MaintenanceTicketSchema,
  type MaintenanceTicketAssignmentParams,
  type MarkMachineReadyRequest,
  MaintenanceTicketListSchema,
  MaintenanceTicketAssignmentParamsSchema,
  MaintenanceTicketIdSchema,
  MaintenanceTicketPartsRequestSchema,
  MaintenanceTicketResolutionRequestSchema,
  MaintenanceTicketStatusRequestSchema,
  MaintenanceTicketStatusSchema,
  type MaintenanceTicket,
  MaintenanceScheduleSchema,
  RepairIntakeRequestSchema,
  RepairIntakeResponseSchema,
  type RepairIntakeRequest,
} from "@/schema/machines.schema";
import {
  MaintenanceTicketDetailsSchema,
  CreateOnDemandMaintenanceTicketRequestSchema,
  MaintenanceTicketDetailsPatchRequestSchema,
  MaintenanceTicketOverdueReviewRequestSchema,
  MaintenanceTicketListParamsSchema,
  type MaintenanceTicketListParams,
  type CreateOnDemandMaintenanceTicketRequest,
  type MaintenanceTicketDetailsPatchRequest,
  type MaintenanceTicketOverdueReviewRequest,
  UpdateMachineRequestSchema,
  MachineTypeMappingRequestSchema,
  type UpdateMachineRequest,
  type MachineTypeMappingRequest,
} from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { MachineHistoryParamsSchema, MachineBrewRecordsPageSchema, MachineCleaningRecordsPageSchema, type MachineHistoryParams } from "@/schema/owner-analytics.schema";
import { buildEvidenceForm, validateEvidenceFiles, EVIDENCE_MULTIPART_HEADERS } from "@/lib/evidence-multipart";


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

type MaintenanceTicketPageParams = {
  source?: string;
  status?: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED";
  machineId?: string;
  ownerId?: string;
  contractId?: string;
  page?: number;
  size?: number;
};

function responseHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

const machinePath = (id: string) => `/machines/${encodeURIComponent(MachineIdSchema.parse(id))}`;

function validateHistoryPage(
  result: { page: number; size: number; content: { machineId: string }[] },
  machineId: string, params: { from: string; to: string; page: number; size: number }, timestamps: string[],
) {
  if (result.page !== params.page || result.size !== params.size
    || result.content.some((row) => row.machineId.toLowerCase() !== machineId.toLowerCase())
    || timestamps.some((time) => Date.parse(time) < Date.parse(params.from) || Date.parse(time) >= Date.parse(params.to))) {
    throw new Error("Dữ liệu lịch sử không khớp máy, thời gian hoặc trang yêu cầu.");
  }
}

export const machinesApi =  {
  async listBrewRecords(id: string, input: MachineHistoryParams, signal?: AbortSignal) {
    const path = machinePath(id), params = MachineHistoryParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(`${path}/brew-records`, {
      baseURL: DOLORES_API_BASE_URL, params: { ...params, sort: "brewedAt,desc" }, signal,
    });
    const result = MachineBrewRecordsPageSchema.parse(response.data);
    validateHistoryPage(result, id, params, result.content.map((row) => row.brewedAt));
    return result;
  },
  async listCleaningRecords(id: string, input: MachineHistoryParams, signal?: AbortSignal) {
    const path = machinePath(id), params = MachineHistoryParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(`${path}/cleaning-records`, {
      baseURL: DOLORES_API_BASE_URL, params: { ...params, sort: "startedAt,desc" }, signal,
    });
    const result = MachineCleaningRecordsPageSchema.parse(response.data);
    validateHistoryPage(result, id, params, result.content.map((row) => row.startedAt));
    return result;
  },
  async getDeviceIdentity(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${machinePath(id)}/telemetry-device-identity`, { baseURL: DOLORES_API_BASE_URL, signal });
    const identity = MachineDeviceIdentitySchema.parse(response.data);
    if (identity.machineId !== id || identity.status !== "ACTIVE") throw new MachineIdentityMismatchError();
    return identity;
  },
  async provisionDeviceIdentity(id: string, input: { deviceId: string }) {
    const machineId = MachineIdSchema.parse(id);
    const request = MachineDeviceIdentityRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${machinePath(machineId)}/telemetry-device-identity`, request, { baseURL: DOLORES_API_BASE_URL });
    if (response.status !== 201) throw new Error("Device identity registration was not confirmed with HTTP 201.");
    const identity = MachineDeviceIdentitySchema.parse(response.data);
    if (identity.machineId !== machineId || identity.deviceId !== request.deviceId || identity.status !== "ACTIVE") throw new MachineIdentityMismatchError();
    return identity;
  },
  async revokeDeviceIdentity(id: string) {
    const response = await axiosClient.delete(`${machinePath(id)}/telemetry-device-identity`, { baseURL: DOLORES_API_BASE_URL });
    if (response.status !== 204) throw new Error("Device identity revocation was not confirmed with HTTP 204.");
  },
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
  async listRecipeSyncMachines(page = 0, size = 20, serialNumber = "", signal?: AbortSignal) {
    const params = { page, size, ...(serialNumber.trim() ? { serialNumber: serialNumber.trim() } : {}) };
    const response = await axiosClient.get<unknown>("/machines", { baseURL: DOLORES_API_BASE_URL, params, signal });
    const items = MachineInventorySchema.parse(response.data);
    const hasNext = responseHeader(response.headers, "x-has-next");
    return { items, page, hasNext: hasNext === undefined ? items.length >= size : hasNext.toLowerCase() === "true" };
  },
  async listRentalCandidates(
    signal?: AbortSignal,
    filters?: { machineType?: "CONVENTIONAL" | "SMART_IOT"; page?: number; size?: number },
  ) {
    const response = await axiosClient.get<unknown>("/inventory/rental-candidates", {
      baseURL: DOLORES_API_BASE_URL,
      ...(filters ? { params: { page: 0, size: 25, ...filters } } : {}),
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
  async getCleaningCompliance(id: string, days = 30, signal?: AbortSignal) {
    const machineId = MachineIdSchema.parse(id);
    const params = CleaningComplianceParamsSchema.parse({ days });
    const response = await axiosClient.get<unknown>(`${machinePath(machineId)}/cleaning-compliance`, {
      baseURL: DOLORES_API_BASE_URL, params, signal,
    });
    const compliance = MachineCleaningComplianceSchema.parse(response.data);
    if (compliance.machine_id !== machineId) throw new MachineIdentityMismatchError();
    return compliance;
  },
  async listMaintenanceTickets(input: MaintenanceTicketListParams = {}, signal?: AbortSignal) {
    const params = MaintenanceTicketListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/maintenance-tickets", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    return MaintenanceTicketListSchema.parse(response.data);
  },
  async listMaintenanceTicketsPage(input: MaintenanceTicketPageParams = {}, signal?: AbortSignal) {
    const params = { page: 0, size: 50, ...input };
    const response = await axiosClient.get<unknown>("/maintenance-tickets", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = MaintenanceTicketListSchema.parse(response.data);
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
  async getMaintenanceTicketById(ticketId: string, signal?: AbortSignal) {
    const validId = MaintenanceTicketIdSchema.parse(ticketId);
    const response = await axiosClient.get<unknown>(`/maintenance-tickets/${encodeURIComponent(validId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validId) throw new Error("Dolores returned a different maintenance ticket than requested.");
    return ticket;
  },
  async createMaintenanceTicket(machineId: string, input: CreateOnDemandMaintenanceTicketRequest = {}) {
    const validMachineId = MachineIdSchema.parse(machineId);
    const request = CreateOnDemandMaintenanceTicketRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/machines/${encodeURIComponent(validMachineId)}/maintenance-tickets`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketDetailsSchema.parse(response.data);
    if (!ticket.id || ticket.machineId !== validMachineId) {
      throw new Error("Dolores did not confirm the maintenance ticket for the requested machine.");
    }
    return ticket;
  },
  async updateMaintenanceTicketDetails(ticketId: string, input: MaintenanceTicketDetailsPatchRequest) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const request = MaintenanceTicketDetailsPatchRequestSchema.parse(input);
    const response = await axiosClient.patch<unknown>(
      `/maintenance-tickets/${encodeURIComponent(validTicketId)}/details`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketDetailsSchema.parse(response.data);
    if (ticket.id !== validTicketId) {
      throw new Error("Dolores returned a different maintenance ticket after updating its details.");
    }
    return ticket;
  },
  async recordMaintenanceTicketOverdueReview(ticketId: string, input: MaintenanceTicketOverdueReviewRequest) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const request = MaintenanceTicketOverdueReviewRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/maintenance-tickets/${encodeURIComponent(validTicketId)}/overdue-review`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketDetailsSchema.parse(response.data);
    if (ticket.id !== validTicketId) {
      throw new Error("Dolores returned a different maintenance ticket after its overdue review.");
    }
    return ticket;
  },
  async unassignMaintenanceTicket(ticketId: string) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const response = await axiosClient.post<unknown>(
      `/maintenance-tickets/${encodeURIComponent(validTicketId)}/unassign`,
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketDetailsSchema.parse(response.data);
    if (ticket.id !== validTicketId || (ticket.status !== "PENDING" && ticket.status !== "ASSIGNED")) {
      throw new Error("Dolores did not confirm cancellation of the maintenance ticket assignment.");
    }
    return ticket;
  },
  async assignMaintenanceTicket(
    ticketId: string,
    input: MaintenanceTicketAssignmentParams,
  ) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const params = MaintenanceTicketAssignmentParamsSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/maintenance-tickets/${encodeURIComponent(validTicketId)}/assign`,
      undefined,
      { baseURL: DOLORES_API_BASE_URL, params },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validTicketId
      || ticket.assignedTechnicianId !== params.technicianId
      || !["ASSIGNED", "IN_PROGRESS"].includes(ticket.status ?? "")) {
      throw new Error("Dolores did not confirm assignment of the requested Technician to this maintenance ticket.");
    }
    return ticket;
  },
  async updateMaintenanceTicketStatus(ticketId: string, status: MaintenanceTicket["status"]) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const validStatus = MaintenanceTicketStatusSchema.parse(status);
    const query = MaintenanceTicketStatusRequestSchema.parse({ status: validStatus });
    const response = await axiosClient.post<unknown>(
      "/maintenance-tickets/" + encodeURIComponent(validTicketId) + "/status",
      undefined,
      { baseURL: DOLORES_API_BASE_URL, params: query },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validTicketId || ticket.status !== validStatus) {
      throw new Error("Dolores did not confirm the requested maintenance ticket status.");
    }
    return ticket;
  },
  async recordMaintenanceTicketParts(
    ticketId: string,
    input: { partsReplaced?: string | null; partsCost?: number | null },
  ) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const body = MaintenanceTicketPartsRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/maintenance-tickets/" + encodeURIComponent(validTicketId) + "/parts",
      body,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validTicketId) {
      throw new Error("Dolores returned a different maintenance ticket after recording parts.");
    }
    return ticket;
  },
  async resolveMaintenanceTicket(
    ticketId: string,
    input: { diagnosis: string; resolutionResult: string; notes?: string },
    files: File[],
  ) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const request = MaintenanceTicketResolutionRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 5 });
    const response = await axiosClient.post<unknown>(
      "/maintenance-tickets/" + encodeURIComponent(validTicketId) + "/resolve",
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validTicketId || ticket.status !== "RESOLVED") {
      throw new Error("Dolores did not confirm that the maintenance ticket was resolved.");
    }
    return ticket;
  },
  async createRepairIntake(input: RepairIntakeRequest, files: File[]) {
    const request = RepairIntakeRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 0, max: 1 });
    const response = await axiosClient.post<unknown>(
      "/repair-cases/intakes",
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    return RepairIntakeResponseSchema.parse(response.data);
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
  }
};
