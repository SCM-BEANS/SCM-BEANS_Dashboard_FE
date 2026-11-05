import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  BuybackActionRequestSchema,
  BuybackAssignModeratorRequestSchema,
  BuybackAssignTechnicianRequestSchema,
  BuybackCaseSchema,
  BuybackCasesSchema,
  BuybackCollectionRequestSchema,
  BuybackCreateRequestSchema,
  BuybackIdSchema,
  BuybackInspectionRequestSchema,
  BuybackInspectionSchema,
  BuybackMachineRegistrationRequestSchema,
  BuybackOwnerDecisionRequestSchema,
  BuybackOwnerPaymentReceiptRequestSchema,
  BuybackPaymentProofReviewRequestSchema,
  BuybackPaymentProofSchema,
  BuybackPaymentRequestSchema,
  BuybackPaymentSchema,
  BuybackPickupEvidenceRequestSchema,
  BuybackQaRequestSchema,
  BuybackQaDecisionSchema,
  BuybackRefurbishmentCompleteRequestSchema,
  BuybackRefurbishmentSchema,
  BuybackRefurbishmentStartRequestSchema,
  BuybackStatusSchema,
  BuybackValuationRequestSchema,
  type BuybackActionRequest,
  type BuybackAssignModeratorRequest,
  type BuybackAssignTechnicianRequest,
  type BuybackCreateRequest,
  type BuybackInspectionRequest,
  type BuybackMachineRegistrationRequest,
  type BuybackOwnerDecisionRequest,
  type BuybackOwnerPaymentReceiptRequest,
  type BuybackPaymentProofReviewRequest,
  type BuybackPaymentRequest,
  type BuybackPickupEvidenceRequest,
  type BuybackQaRequest,
  type BuybackRefurbishmentCompleteRequest,
  type BuybackRefurbishmentStartRequest,
  type BuybackValuationRequest,
} from "@/schema/buybacks.schema";
import { BuybackCaseSummaryListSchema, BuybackInspectionHistorySchema, BuybackQaDecisionHistorySchema, BuybackRefurbishmentHistorySchema, type BuybackCollectionRequest } from "@/schema/buybacks.schema";
const BuybackListQuerySchema = z.object({
  status: BuybackStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
});
type BuybackListQuery = z.input<typeof BuybackListQuerySchema>;
async function getCaseHistory<TSchema extends z.ZodTypeAny>(
  id: string,
  historyPath: string,
  schema: TSchema,
  page = 0,
  size = 50,
  signal?: AbortSignal,
) {
  const caseId = BuybackIdSchema.parse(id);
  const response = await axiosClient.get<unknown>(`${buybackPath(caseId)}${historyPath}`, {
    baseURL: DOLORES_API_BASE_URL,
    params: { page, size },
    signal,
  });
  const items = schema.parse(response.data) as Array<z.infer<TSchema>>;
  if (items.some((item) => {
    if (typeof item !== "object" || item === null) return false;
    const relatedCaseId = (item as { buybackCaseId?: unknown }).buybackCaseId;
    return typeof relatedCaseId === "string" && relatedCaseId !== caseId;
  })) {
    throw new Error("Dolores returned buyback history for a different case.");
  }
  const pageHeader = Number(response.headers["x-page"]);
  const sizeHeader = Number(response.headers["x-page-size"]);
  return {
    items,
    page: Number.isInteger(pageHeader) && pageHeader >= 0 ? pageHeader : page,
    size: Number.isInteger(sizeHeader) && sizeHeader > 0 ? sizeHeader : size,
    hasNext: String(response.headers["x-has-next"] ?? "false").toLowerCase() === "true",
  };
}
async function postCaseAction(id: string, actionPath: string, body: unknown) {
  const caseId = BuybackIdSchema.parse(id);
  const response = await axiosClient.post<unknown>(`${buybackPath(caseId)}${actionPath}`, body, {
    baseURL: DOLORES_API_BASE_URL,
  });
  const buyback = BuybackCaseSchema.parse(response.data);
  if (buyback.id !== caseId) throw new Error("Dolores returned a different buyback case.");
  return buyback;
}


const pageParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
  status: BuybackStatusSchema.optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
}).strict();
const proofPageParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
}).strict();
const buybackPath = (id: string) => `/buybacks/${encodeURIComponent(BuybackIdSchema.parse(id))}`;
const proofPath = (id: string) => `/buybacks/payment-proofs/${encodeURIComponent(z.string().uuid().parse(id))}`;
const fileTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function headerValue(headers: unknown, name: string) {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  const value = record.get?.(name) ?? record[name] ?? record[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}
function verifyCase(data: unknown, id: string) {
  const item = BuybackCaseSchema.parse(data);
  if (item.id !== id) throw new Error("Dolores returned a different buyback case than requested.");
  return item;
}
function verifyPaymentProof(data: unknown, caseId: string, paymentId?: string) {
  const proof = BuybackPaymentProofSchema.parse(data);
  if (proof.buybackCaseId !== caseId || (paymentId && proof.paymentId !== paymentId)) {
    throw new Error("Dolores returned payment proof for a different buyback payment.");
  }
  return proof;
}
function withoutResourceId(input: object, key: "id" | "proofId") {
  const body = { ...(input as Record<string, unknown>) };
  delete body[key];
  return body;
}
async function validatePaymentProofFile(file: File) {
  if (!file || file.size <= 0) throw new Error("Chọn tệp chứng từ thanh toán không rỗng.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Chứng từ không được vượt quá 20 MB.");
  if (!fileTypes.has(file.type)) throw new Error("Chỉ hỗ trợ chứng từ PDF, JPEG hoặc PNG.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const valid = file.type === "application/pdf"
    ? bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    : file.type === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (!valid) throw new Error("Nội dung tệp không khớp định dạng chứng từ đã chọn.");
}

export const buybacksApi =  {
  async list(input: z.input<typeof pageParamsSchema> = {}, signal?: AbortSignal) {
    const params = pageParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/buybacks", { baseURL: DOLORES_API_BASE_URL, params, signal });
    return {
      items: BuybackCasesSchema.parse(response.data),
      page: Number(headerValue(response.headers, "X-Page") ?? params.page),
      size: Number(headerValue(response.headers, "X-Page-Size") ?? params.size),
      hasNext: headerValue(response.headers, "X-Has-Next") === "true",
    };
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(buybackPath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    return verifyCase(response.data, validId);
  },
  async create(input: BuybackCreateRequest) {
    const request = BuybackCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/buybacks", request, { baseURL: DOLORES_API_BASE_URL });
    const buyback = BuybackCaseSchema.parse(response.data);
    if (buyback.workflowVersion !== 2) {
      throw new Error("Dolores did not confirm an external-machine buyback case.");
    }
    return buyback;
  },
  async assignModerator(id: string, input: BuybackAssignModeratorRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/moderator/assign`,
      BuybackAssignModeratorRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async assignInspection(id: string, input: BuybackAssignTechnicianRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/inspection/assign`,
      BuybackAssignTechnicianRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async decideOwnerPrice(id: string, input: BuybackOwnerDecisionRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/owner-decision`,
      BuybackOwnerDecisionRequestSchema.parse(withoutResourceId(input, "id")),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async startInspection(id: string, input: BuybackActionRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/inspection/start`, BuybackActionRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async submitInspection(id: string, input: BuybackInspectionRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/inspection`, BuybackInspectionRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async decideValuation(id: string, input: BuybackValuationRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/valuation`, BuybackValuationRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async createPayment(id: string, input: BuybackPaymentRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/payments`, BuybackPaymentRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    const payment = BuybackPaymentSchema.parse(response.data);
    if (payment.buybackCaseId !== validId) throw new Error("Dolores returned a payment for a different buyback case.");
    return payment;
  },
  async submitPaymentProof(id: string, paymentId: string, idempotencyKey: string, correlationId: string, file: File) {
    const validId = BuybackIdSchema.parse(id);
    const validPaymentId = z.string().uuid().parse(paymentId);
    const key = z.string().trim().min(1).max(128).parse(idempotencyKey);
    const correlation = z.string().trim().min(1).max(128).parse(correlationId);
    await validatePaymentProofFile(file);
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/payment-proofs`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: { paymentId: validPaymentId, idempotencyKey: key, correlationId: correlation },
      headers: { "Content-Type": "multipart/form-data" },
    });
    return verifyPaymentProof(response.data, validId, validPaymentId);
  },
  async reviewPaymentProof(proofId: string, input: BuybackPaymentProofReviewRequest) {
    const validProofId = z.string().uuid().parse(proofId);
    const response = await axiosClient.post<unknown>(`${proofPath(validProofId)}/review`, BuybackPaymentProofReviewRequestSchema.parse(withoutResourceId(input, "proofId")), { baseURL: DOLORES_API_BASE_URL });
    const proof = BuybackPaymentProofSchema.parse(response.data);
    if (proof.id !== validProofId) throw new Error("Dolores returned a different payment proof than requested.");
    return proof;
  },
  async respondToOwnerPaymentReceipt(proofId: string, input: BuybackOwnerPaymentReceiptRequest) {
    const validProofId = z.string().uuid().parse(proofId);
    const response = await axiosClient.post<unknown>(
      `${proofPath(validProofId)}/owner-receipt`,
      BuybackOwnerPaymentReceiptRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    const proof = BuybackPaymentProofSchema.parse(response.data);
    if (proof.id !== validProofId) throw new Error("Dolores returned a different payment proof than requested.");
    return proof;
  },
  async downloadPaymentProofContent(proofId: string, signal?: AbortSignal) {
    const response = await axiosClient.get<Blob>(`${proofPath(proofId)}/content`, { baseURL: DOLORES_API_BASE_URL, responseType: "blob", signal });
    return { blob: response.data, contentType: headerValue(response.headers, "content-type") };
  },
  async listPaymentProofs(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const params = proofPageParamsSchema.parse({ page, size });
    const response = await axiosClient.get<unknown>(`${buybackPath(validId)}/payment-proofs`, {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = BuybackPaymentProofSchema.array().parse(response.data);
    if (items.some((proof) => proof.buybackCaseId !== validId)) {
      throw new Error("Dolores returned payment proofs for a different buyback case.");
    }
    const pageHeader = Number(headerValue(response.headers, "X-Page") ?? params.page);
    const sizeHeader = Number(headerValue(response.headers, "X-Page-Size") ?? params.size);
    return {
      items,
      page: Number.isInteger(pageHeader) && pageHeader >= 0 ? pageHeader : params.page,
      size: Number.isInteger(sizeHeader) && sizeHeader > 0 ? sizeHeader : params.size,
      hasNext: String(headerValue(response.headers, "X-Has-Next") ?? "false").toLowerCase() === "true",
    };
  },
  async requestCollection(id: string, input: BuybackActionRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/collection/request`, BuybackActionRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async assignCollection(id: string, input: BuybackAssignTechnicianRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/collection/assign`,
      BuybackAssignTechnicianRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async recordCollectionEvidence(id: string, input: BuybackPickupEvidenceRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/collection/evidence`,
      BuybackPickupEvidenceRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async confirmCollection(id: string, input: z.input<typeof BuybackCollectionRequestSchema>) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/collection/confirm`, BuybackCollectionRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async startRefurbishment(id: string, input: BuybackRefurbishmentStartRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/refurbishment/start`, BuybackRefurbishmentStartRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async completeRefurbishment(id: string, input: BuybackRefurbishmentCompleteRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/refurbishment/complete`, BuybackRefurbishmentCompleteRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async assignRefurbishment(id: string, input: BuybackAssignTechnicianRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/refurbishment/assign`,
      BuybackAssignTechnicianRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async registerMachine(id: string, input: BuybackMachineRegistrationRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      `${buybackPath(validId)}/register-machine`,
      BuybackMachineRegistrationRequestSchema.parse(input),
      { baseURL: DOLORES_API_BASE_URL },
    );
    return verifyCase(response.data, validId);
  },
  async decideQa(id: string, input: BuybackQaRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/qa`, BuybackQaRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async cancel(id: string, input: BuybackActionRequest) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${buybackPath(validId)}/cancel`, BuybackActionRequestSchema.parse(withoutResourceId(input, "id")), { baseURL: DOLORES_API_BASE_URL });
    return verifyCase(response.data, validId);
  },
  async listInspections(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${buybackPath(validId)}/inspections`, { baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal });
    return BuybackInspectionSchema.array().parse(response.data);
  },
  async listRefurbishments(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${buybackPath(validId)}/refurbishments`, { baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal });
    return BuybackRefurbishmentSchema.array().parse(response.data);
  },
  async listQaDecisions(id: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${buybackPath(validId)}/qa-decisions`, { baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal });
    return BuybackQaDecisionSchema.array().parse(response.data);
  },
  async getInspections(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/inspections", BuybackInspectionHistorySchema, page, size, signal);
  },
  async getRefurbishments(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/refurbishments", BuybackRefurbishmentHistorySchema, page, size, signal);
  },
  async getQaDecisions(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/qa-decisions", BuybackQaDecisionHistorySchema, page, size, signal);
  }
};
