import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  MaintenanceRequestIdSchema,
  MachineIdSchema,
  RepairCaseIdSchema,
  MaintenanceTicketIdSchema,
  RepairCaseIntakeTriageRequestSchema,
  RepairCaseListParamsSchema,
  RepairCaseReferenceListSchema,
  RepairCaseSchema,
  RepairCaseSummaryListSchema,
  RepairCaseReplacementAssignmentRequestSchema,
  RepairCaseTimelinePageSchema,
  MaintenanceCustodyEventListSchema,
  MaintenanceCustodyEventCreateRequestSchema,
  MaintenanceCustodyAcknowledgementRequestSchema,
  MaintenanceCustodyEventIdSchema,
  MaintenanceCustodyEventSchema,
  type MaintenanceCustodyEventCreateRequest,
  MaintenanceTicketSchema,
  RepairWorkStartRequestSchema,
  type RepairCaseIntakeTriageRequest,
  type RepairCaseListParams,
  type RepairCaseSummary,
  type RepairCaseReplacementAssignmentRequest,
  type MaintenanceCustodyAcknowledgementRequest,
  type RepairWorkStartRequest,
} from "@/schema/machines.schema";
import { MaintenanceRequestSchema, RepairCustodyEventRequestSchema, RepairDiagnosisRequestSchema, RepairFallbackDecisionRequestSchema, RepairCaseListSchema, RepairTriageRequestSchema, RepairTriageResponseSchema, RepairWorkCompletionRequestSchema, type RepairCustodyEventRequest, type RepairDiagnosisRequest, type RepairFallbackDecisionRequest, type RepairTriageRequest, type RepairWorkCompletionRequest } from "@/schema/machines.schema";
const repairCasePath = (id: string) => `/repair-cases/${encodeURIComponent(RepairCaseSchema.shape.id.parse(id))}`;


type BoundedPage<T> = {
  items: T[];
  page: number;
  size: number;
  hasNext: boolean;
};

function responseHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function boundedPage<T>(items: T[], headers: unknown, requested: { page: number; size: number }): BoundedPage<T> {
  const page = Number(responseHeader(headers, "x-page"));
  const size = Number(responseHeader(headers, "x-page-size"));
  const hasNextHeader = responseHeader(headers, "x-has-next");
  return {
    items,
    page: Number.isInteger(page) && page >= 0 ? page : requested.page,
    size: Number.isInteger(size) && size > 0 ? size : requested.size,
    hasNext: hasNextHeader === undefined ? false : hasNextHeader.toLowerCase() === "true",
  };
}

export const repairCasesApi =  {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/repair-cases", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return RepairCaseSummaryListSchema.parse(response.data);
  },
  async listPage(input: RepairCaseListParams = {}, signal?: AbortSignal): Promise<BoundedPage<RepairCaseSummary>> {
    const params = RepairCaseListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/repair-cases", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = RepairCaseSummaryListSchema.parse(response.data);
    return boundedPage(items, response.headers, params);
  },
  async listReferences(signal?: AbortSignal) {
    const items = await this.list(signal);
    return RepairCaseReferenceListSchema.parse(items.map(({ id, maintenanceRequestId, status }) => ({
      id,
      maintenanceRequestId,
      status,
    })));
  },
  async findReferenceByMaintenanceRequestId(requestId: string, machineId: string, signal?: AbortSignal) {
    const validRequestId = MaintenanceRequestIdSchema.parse(requestId);
    const validMachineId = MachineIdSchema.parse(machineId);
    for (let page = 0; page < 100; page += 1) {
      const result = await repairCasesApi.listPage({ machineId: validMachineId, page, size: 100 }, signal);
      const match = result.items.find((item) => item.maintenanceRequestId === validRequestId);
      if (match) return { id: match.id, maintenanceRequestId: match.maintenanceRequestId, status: match.status };
      if (!result.hasNext) return undefined;
    }
    throw new Error("Repair case search exceeded the safe pagination limit.");
  },
  async getById(caseId: string, signal?: AbortSignal) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const response = await axiosClient.get<unknown>(`/repair-cases/${encodeURIComponent(validCaseId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const repairCase = RepairCaseSchema.parse(response.data);
    if (repairCase.id !== validCaseId) throw new Error("Dolores returned a different repair case than requested.");
    return repairCase;
  },
  async getTimeline(caseId: string, page = 0, size = 50, signal?: AbortSignal) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const response = await axiosClient.get<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/timeline`,
      { baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal },
    );
    const timeline = RepairCaseTimelinePageSchema.parse(response.data);
    if (timeline.content.some((event) => event.repairCaseId !== validCaseId)) {
      throw new Error("Dolores returned timeline events for a different repair case.");
    }
    return timeline;
  },
  async listCustodyEvents(caseId: string, page = 0, size = 50, signal?: AbortSignal) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const response = await axiosClient.get<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/custody-events`,
      { baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal },
    );
    const events = MaintenanceCustodyEventListSchema.parse(response.data);
    if (events.some((event) => event.repairCaseId !== validCaseId)) {
      throw new Error("Dolores returned custody events for a different repair case.");
    }
    return boundedPage(events, response.headers, { page, size });
  },
  async acknowledgeCustodyEvent(
    caseId: string,
    eventId: string,
    input: MaintenanceCustodyAcknowledgementRequest,
  ) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const validEventId = MaintenanceCustodyEventIdSchema.parse(eventId);
    const request = MaintenanceCustodyAcknowledgementRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/custody-events/${encodeURIComponent(validEventId)}/acknowledge`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const event = MaintenanceCustodyEventSchema.parse(response.data);
    if (event.id !== validEventId || event.repairCaseId !== validCaseId) {
      throw new Error("Dolores returned a different custody event than requested.");
    }
    return event;
  },
  async recordCustodyEvent(caseId: string, input: MaintenanceCustodyEventCreateRequest) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const request = MaintenanceCustodyEventCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/custody-events`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const event = MaintenanceCustodyEventSchema.parse(response.data);
    if (
      event.repairCaseId !== validCaseId ||
      event.eventType !== request.eventType ||
      event.machineId !== request.machineId
    ) {
      throw new Error("Dolores returned a different RepairCase custody event than requested.");
    }
    return event;
  },
  async startWork(caseId: string, expectedTicketId: string, input: RepairWorkStartRequest) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const validTicketId = MaintenanceTicketIdSchema.parse(expectedTicketId);
    const request = RepairWorkStartRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/work/start`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const ticket = MaintenanceTicketSchema.parse(response.data);
    if (ticket.id !== validTicketId || ticket.repairCaseId !== validCaseId || ticket.status !== "IN_PROGRESS") {
      throw new Error("Dolores did not confirm the RepairCase work start.");
    }
    return ticket;
  },
  async triageIntake(requestId: string, input: RepairCaseIntakeTriageRequest) {
    const validRequestId = MaintenanceRequestIdSchema.parse(requestId);
    const request = RepairCaseIntakeTriageRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/intakes/${encodeURIComponent(validRequestId)}/triage`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return response.data;
  },
  async createReplacementAssignment(caseId: string, input: RepairCaseReplacementAssignmentRequest) {
    const validCaseId = RepairCaseIdSchema.parse(caseId);
    const request = RepairCaseReplacementAssignmentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/${encodeURIComponent(validCaseId)}/replacement-assignments`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return response.data;
  },
  async getCustodyEvents(id: string, signal?: AbortSignal) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const response = await axiosClient.get<unknown>(`${repairCasePath(caseId)}/custody-events`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page: 0, size: 50 },
      signal,
    });
    const events = MaintenanceCustodyEventListSchema.parse(response.data);
    if (events.some((event) => event.repairCaseId !== caseId)) {
      throw new Error("Dolores returned custody history for a different repair case.");
    }
    return events;
  },
  async recordDiagnosis(id: string, input: RepairDiagnosisRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairDiagnosisRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/diagnosis`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return MaintenanceTicketSchema.parse(response.data);
  },
  async completeWork(id: string, input: RepairWorkCompletionRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairWorkCompletionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/work/complete`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return MaintenanceTicketSchema.parse(response.data);
  },
  async decideFallback(id: string, input: RepairFallbackDecisionRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairFallbackDecisionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/replacement-decision`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const event = RepairCaseTimelinePageSchema.shape.content.element.parse(response.data);
    if (event.repairCaseId !== caseId || event.relatedMachineId !== request.replacementMachineId) {
      throw new Error("Dolores returned a replacement decision for a different repair case.");
    }
    return event;
  },
  async triage(requestId: string, input: RepairTriageRequest) {
    const validRequestId = MaintenanceRequestSchema.shape.id.parse(requestId);
    const request = RepairTriageRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/repair-cases/intakes/${encodeURIComponent(validRequestId)}/triage`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const result = RepairTriageResponseSchema.parse(response.data);
    if (result.requestId !== validRequestId || result.accepted !== request.accepted) {
      throw new Error("Dolores returned a repair triage result that does not match the submitted request.");
    }
    return result;
  }
};
