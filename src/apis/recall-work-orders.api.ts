import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  RecallAssignRequestSchema,
  RecallDepotReceiptRequestSchema,
  RecallEvidenceListSchema,
  RecallEvidenceSchema,
  RecallEvidenceTypeSchema,
  RecallOwnerAcknowledgementRequestSchema,
  RecallPickupRequestSchema,
  RecallReceiptDecisionRequestSchema,
  RecallWorkOrderEventPageSchema,
  RecallWorkOrderIdSchema,
  RecallWorkOrderListParamsSchema,
  RecallWorkOrderPageSchema,
  RecallWorkOrderSchema,
  TerminationActionRequestSchema,
  type RecallAssignRequest,
  type RecallDepotReceiptRequest,
  type RecallEvidenceType,
  type RecallOwnerAcknowledgementRequest,
  type RecallPickupRequest,
  type RecallReceiptDecisionRequest,
  type RecallWorkOrderListParams,
} from "@/schema/termination-workflow.schema";

const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const evidenceMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function evidenceFileMime(signature: Uint8Array) {
  if (signature.length >= 5 && signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46 && signature[4] === 0x2d) return "application/pdf";
  if (signature.length >= 3 && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) return "image/jpeg";
  if (signature.length >= 8 && signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47 && signature[4] === 0x0d && signature[5] === 0x0a && signature[6] === 0x1a && signature[7] === 0x0a) return "image/png";
  return undefined;
}

export async function validateRecallEvidenceFile(file: File) {
  if (!file || file.size <= 0) throw new Error("Chọn tệp evidence không rỗng.");
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error("Evidence không được vượt quá 20 MB.");
  if (!evidenceMimeTypes.has(file.type)) throw new Error("Chỉ hỗ trợ evidence PDF, JPEG hoặc PNG.");
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (evidenceFileMime(signature) !== file.type) throw new Error("Nội dung tệp không khớp với định dạng PDF, JPEG hoặc PNG.");
}

const workOrderPath = (id: string) => `/recall-work-orders/${encodeURIComponent(RecallWorkOrderIdSchema.parse(id))}`;

function headerValue(headers: unknown, key: string) {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown> & { get?: (name: string) => unknown };
  const value = record.get?.(key) ?? record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function verifyWorkOrder(value: unknown, workOrderId: string) {
  const workOrder = RecallWorkOrderSchema.parse(value);
  if (workOrder.id !== workOrderId) throw new Error("Dolores returned a different recall work order than requested.");
  return workOrder;
}

export const recallWorkOrdersApi = {
  async list(input: RecallWorkOrderListParams = {}, signal?: AbortSignal) {
    const params = RecallWorkOrderListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/recall-work-orders", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    return RecallWorkOrderPageSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(workOrderPath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    return verifyWorkOrder(response.data, validId);
  },
  async listEvents(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${workOrderPath(validId)}/events`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page, size },
      signal,
    });
    const events = RecallWorkOrderEventPageSchema.parse(response.data);
    if (events.content.some((event) => event.recallWorkOrderId !== validId)) throw new Error("Dolores returned events for another recall work order.");
    return events;
  },
  async listEvidence(id: string, signal?: AbortSignal) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${workOrderPath(validId)}/evidence`, { baseURL: DOLORES_API_BASE_URL, signal });
    const evidence = RecallEvidenceListSchema.parse(response.data);
    if (evidence.some((item) => item.recallWorkOrderId !== validId)) throw new Error("Dolores returned evidence metadata for another recall work order.");
    return evidence;
  },
  async uploadEvidence(id: string, evidenceType: RecallEvidenceType, correlationId: string, file: File) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const validType = RecallEvidenceTypeSchema.parse(evidenceType);
    const correlation = correlationId.trim();
    if (!correlation || correlation.length > 128) throw new Error("A correlation ID between 1 and 128 characters is required.");
    await validateRecallEvidenceFile(file);
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/evidence`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: { evidenceType: validType, correlationId: correlation },
      headers: { "Content-Type": "multipart/form-data" },
    });
    const evidence = RecallEvidenceSchema.parse(response.data);
    if (evidence.recallWorkOrderId !== validId || evidence.evidenceType !== validType) throw new Error("Dolores stored evidence for a different recall work order or evidence type.");
    return evidence;
  },
  async downloadEvidence(id: string, evidenceId: string, signal?: AbortSignal) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const validEvidenceId = z.string().uuid().parse(evidenceId);
    const response = await axiosClient.get<Blob>(`${workOrderPath(validId)}/evidence/${encodeURIComponent(validEvidenceId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      headers: { Accept: "*/*", "Cache-Control": "no-cache" },
      responseType: "blob",
      signal,
    });
    return {
      blob: response.data,
      contentType: headerValue(response.headers, "content-type"),
      contentDisposition: headerValue(response.headers, "content-disposition"),
    };
  },
  async assign(id: string, input: RecallAssignRequest) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = RecallAssignRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/assignment`, request, { baseURL: DOLORES_API_BASE_URL });
    return verifyWorkOrder(response.data, validId);
  },
  async startPickup(id: string, correlationId: string) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = TerminationActionRequestSchema.parse({ correlationId });
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/pickup/start`, request, { baseURL: DOLORES_API_BASE_URL });
    const workOrder = verifyWorkOrder(response.data, validId);
    if (workOrder.status !== "PICKUP_IN_PROGRESS") throw new Error("Dolores did not confirm pickup has started.");
    return workOrder;
  },
  async recordPickup(id: string, input: RecallPickupRequest) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = RecallPickupRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/pickup/attempt`, request, { baseURL: DOLORES_API_BASE_URL });
    return verifyWorkOrder(response.data, validId);
  },
  async acknowledgeOwner(id: string, input: RecallOwnerAcknowledgementRequest) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = RecallOwnerAcknowledgementRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/owner-acknowledgement`, request, { baseURL: DOLORES_API_BASE_URL });
    return verifyWorkOrder(response.data, validId);
  },
  async submitDepotReceipt(id: string, input: RecallDepotReceiptRequest) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = RecallDepotReceiptRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/depot-receipt`, request, { baseURL: DOLORES_API_BASE_URL });
    return verifyWorkOrder(response.data, validId);
  },
  async reviewDepotReceipt(id: string, input: RecallReceiptDecisionRequest) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const request = RecallReceiptDecisionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${workOrderPath(validId)}/depot-receipt/review`, request, { baseURL: DOLORES_API_BASE_URL });
    return verifyWorkOrder(response.data, validId);
  },
};
