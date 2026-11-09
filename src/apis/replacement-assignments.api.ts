import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  buildEvidenceForm,
  EVIDENCE_MULTIPART_HEADERS,
  validateEvidenceFiles,
} from "@/lib/evidence-multipart";
import {
  ContractIdSchema,
} from "@/schema/contracts.schema";
import {
  ReplacementAssignmentIdSchema,
  ReplacementAssignmentActivateRequestSchema,
  ReplacementAssignmentCancelRequestSchema,
  ReplacementAssignmentCreateRequestSchema,
  ReplacementAssignmentReleaseRequestSchema,
  ReplacementAssignmentSchema,
  type ReplacementAssignmentActivateRequest,
  type ReplacementAssignmentCancelRequest,
  type ReplacementAssignmentCreateRequest,
  type ReplacementAssignmentReleaseRequest,
} from "@/schema/machines.schema";

export const replacementAssignmentsApi = {
  async create(contractId: string, input: ReplacementAssignmentCreateRequest) {
    const validContractId = ContractIdSchema.parse(contractId);
    const request = ReplacementAssignmentCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/contracts/${encodeURIComponent(validContractId)}/replacement-assignments`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const assignment = ReplacementAssignmentSchema.parse(response.data);
    if (assignment.contractId !== validContractId || assignment.replacementMachineId !== request.replacementMachineId || assignment.status !== "PLANNED") {
      throw new Error("Dolores did not confirm the planned replacement assignment for this Contract.");
    }
    return assignment;
  },
  async getById(assignmentId: string, signal?: AbortSignal) {
    const validId = ReplacementAssignmentIdSchema.parse(assignmentId);
    const response = await axiosClient.get<unknown>(
      `/replacement-assignments/${encodeURIComponent(validId)}`,
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const assignment = ReplacementAssignmentSchema.parse(response.data);
    if (assignment.id !== validId) throw new Error("Dolores returned a different replacement assignment than requested.");
    return assignment;
  },
  async activate(assignmentId: string, input: ReplacementAssignmentActivateRequest, files: File[]) {
    const validId = ReplacementAssignmentIdSchema.parse(assignmentId);
    const request = ReplacementAssignmentActivateRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 1 });
    const response = await axiosClient.post<unknown>(
      `/replacement-assignments/${encodeURIComponent(validId)}/activate`,
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const assignment = ReplacementAssignmentSchema.parse(response.data);
    if (assignment.id !== validId || assignment.status !== "ACTIVE") {
      throw new Error("Dolores did not confirm that the replacement assignment is active.");
    }
    return assignment;
  },
  async release(assignmentId: string, input: ReplacementAssignmentReleaseRequest, files: File[]) {
    const validId = ReplacementAssignmentIdSchema.parse(assignmentId);
    const request = ReplacementAssignmentReleaseRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 1 });
    const response = await axiosClient.post<unknown>(
      `/replacement-assignments/${encodeURIComponent(validId)}/release`,
      buildEvidenceForm(request, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const assignment = ReplacementAssignmentSchema.parse(response.data);
    if (assignment.id !== validId || assignment.status !== "RELEASED") {
      throw new Error("Dolores did not confirm the replacement assignment release.");
    }
    return assignment;
  },
  async cancel(assignmentId: string, input: ReplacementAssignmentCancelRequest) {
    const validId = ReplacementAssignmentIdSchema.parse(assignmentId);
    const request = ReplacementAssignmentCancelRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/replacement-assignments/${encodeURIComponent(validId)}/cancel`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const assignment = ReplacementAssignmentSchema.parse(response.data);
    if (assignment.id !== validId || assignment.status !== "CANCELLED") {
      throw new Error("Dolores did not confirm that the planned replacement assignment was cancelled.");
    }
    return assignment;
  },
};
