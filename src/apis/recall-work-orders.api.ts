import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  RecallActionRequestSchema,
  RecallAssignRequestSchema,
  RecallDepotReceiptRequestSchema,
  RecallEvidenceSchema,
  RecallOwnerAcknowledgementRequestSchema,
  RecallPickupRequestSchema,
  RecallReceiptDecisionRequestSchema,
  RecallWorkOrderEventPageSchema,
  RecallWorkOrderIdSchema,
  RecallWorkOrderListParamsSchema,
  RecallWorkOrderPageSchema,
  RecallWorkOrderSchema,
  type RecallWorkOrderListParams,
} from "@/schema/recall-work-orders.schema";

const recallPath = (id: string) => `/recall-work-orders/${encodeURIComponent(RecallWorkOrderIdSchema.parse(id))}`;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const createCorrelationId = () => `recall-evidence-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

export const recallWorkOrdersApi = {
  async list(params: Partial<RecallWorkOrderListParams> = {}, signal?: AbortSignal) {
    const query = RecallWorkOrderListParamsSchema.parse(params);
    const response = await axiosClient.get<unknown>("/recall-work-orders", {
      baseURL: DOLORES_API_BASE_URL,
      params: query,
      signal,
    });
    return RecallWorkOrderPageSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = RecallWorkOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(recallPath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    const result = RecallWorkOrderSchema.parse(response.data);
    if (result.id !== validId) throw new Error("Dolores returned a different recall work order.");
    return result;
  },
  async getEvents(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${recallPath(id)}/events`, {
      baseURL: DOLORES_API_BASE_URL,
      params: { page: 0, size: 100 },
      signal,
    });
    return RecallWorkOrderEventPageSchema.parse(response.data);
  },
  async listEvidence(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${recallPath(id)}/evidence`, { baseURL: DOLORES_API_BASE_URL, signal });
    return RecallEvidenceSchema.array().parse(response.data);
  },
  async uploadEvidence(id: string, evidenceType: "PICKUP" | "OWNER_HANDOVER" | "DEPOT_RECEIPT", file: File) {
    if (!file || file.size <= 0) throw new Error("Hãy chọn một tệp chứng cứ không rỗng.");
    if (file.size > MAX_EVIDENCE_BYTES) throw new Error("Tệp chứng cứ không được vượt quá 20 MB.");
    if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) throw new Error("Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.");
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/evidence`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: { evidenceType, correlationId: createCorrelationId() },
      headers: { "Content-Type": "multipart/form-data" },
    });
    const evidence = RecallEvidenceSchema.parse(response.data);
    if (evidence.recallWorkOrderId !== id) throw new Error("Chứng cứ được trả về không thuộc lệnh thu hồi đang mở.");
    return evidence;
  },
  async downloadEvidence(id: string, evidenceId: string, signal?: AbortSignal) {
    const validEvidenceId = RecallWorkOrderIdSchema.parse(evidenceId);
    const response = await axiosClient.get<Blob>(`${recallPath(id)}/evidence/${encodeURIComponent(validEvidenceId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      responseType: "blob",
      signal,
    });
    return response.data;
  },
  async assign(id: string, input: { technicianId: string; scheduledPickupAt?: string; correlationId: string }) {
    const request = RecallAssignRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/assignment`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
  async startPickup(id: string, correlationId: string) {
    const request = RecallActionRequestSchema.parse({ correlationId });
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/pickup/start`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
  async recordPickup(id: string, input: { successful: boolean; evidenceId?: string; notes?: string; correlationId: string }) {
    const request = RecallPickupRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/pickup/attempt`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
  async acknowledgeOwner(id: string, input: { conditionNotes: string; evidenceId: string; correlationId: string }) {
    const request = RecallOwnerAcknowledgementRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/owner-acknowledgement`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
  async submitDepotReceipt(id: string, input: { depotLocation: string; depotReceivedAt?: string; evidenceId: string; correlationId: string }) {
    const request = RecallDepotReceiptRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/depot-receipt`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
  async reviewDepotReceipt(id: string, input: { approved: boolean; reason?: string; correlationId: string }) {
    const request = RecallReceiptDecisionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${recallPath(id)}/depot-receipt/review`, request, { baseURL: DOLORES_API_BASE_URL });
    return RecallWorkOrderSchema.parse(response.data);
  },
};
