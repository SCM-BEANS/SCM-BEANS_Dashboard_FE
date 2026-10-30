import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  MaintenanceCustodyAcknowledgementRequestSchema,
  MaintenanceCustodyEventListSchema,
  MaintenanceTicketSchema,
  MaintenanceRequestSchema,
  RepairCustodyEventRequestSchema,
  RepairDiagnosisRequestSchema,
  RepairFallbackDecisionRequestSchema,
  RepairCaseListSchema,
  RepairCaseSchema,
  RepairCaseTimelinePageSchema,
  RepairTriageRequestSchema,
  RepairTriageResponseSchema,
  RepairWorkCompletionRequestSchema,
  RepairWorkStartRequestSchema,
  type RepairCustodyEventRequest,
  type RepairDiagnosisRequest,
  type RepairFallbackDecisionRequest,
  type RepairTriageRequest,
  type RepairWorkCompletionRequest,
  type RepairWorkStartRequest,
} from "@/schema/machines.schema";

const repairCasePath = (id: string) => `/repair-cases/${encodeURIComponent(RepairCaseSchema.shape.id.parse(id))}`;

export const repairCasesApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/repair-cases", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return RepairCaseListSchema.parse(response.data);
  },

  async getById(id: string, signal?: AbortSignal) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const response = await axiosClient.get<unknown>(repairCasePath(caseId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const repairCase = RepairCaseSchema.parse(response.data);
    if (repairCase.id !== caseId) throw new Error("Dolores returned a different repair case.");
    return repairCase;
  },

  async getTimeline(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const response = await axiosClient.get<unknown>(`${repairCasePath(caseId)}/timeline`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page, size },
      signal,
    });
    const timeline = RepairCaseTimelinePageSchema.parse(response.data);
    if (timeline.content.some((event) => event.repairCaseId !== caseId)) {
      throw new Error("Dolores returned a repair event for a different case.");
    }
    return timeline;
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

  async acknowledgeCustodyEvent(caseId: string, eventId: string, acknowledgement: string) {
    const validCaseId = RepairCaseSchema.shape.id.parse(caseId);
    const validEventId = RepairCaseSchema.shape.id.parse(eventId);
    const body = MaintenanceCustodyAcknowledgementRequestSchema.parse({ acknowledgement });
    const response = await axiosClient.post<unknown>(
      `${repairCasePath(validCaseId)}/custody-events/${encodeURIComponent(validEventId)}/acknowledge`,
      body,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const event = MaintenanceCustodyEventListSchema.element.parse(response.data);
    if (event.id !== validEventId || event.repairCaseId !== validCaseId) {
      throw new Error("Dolores returned a different repair case custody event.");
    }
    return event;
  },

  async recordDiagnosis(id: string, input: RepairDiagnosisRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairDiagnosisRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/diagnosis`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return MaintenanceTicketSchema.parse(response.data);
  },

  async startWork(id: string, input: RepairWorkStartRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairWorkStartRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/work/start`, request, {
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

  async recordCustodyEvent(id: string, input: RepairCustodyEventRequest) {
    const caseId = RepairCaseSchema.shape.id.parse(id);
    const request = RepairCustodyEventRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${repairCasePath(caseId)}/custody-events`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const event = MaintenanceCustodyEventListSchema.element.parse(response.data);
    if (event.repairCaseId !== caseId) throw new Error("Dolores returned a custody event for a different repair case.");
    return event;
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
  },
};
