import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  BuybackActionRequestSchema,
  BuybackCaseSchema,
  BuybackCaseSummaryListSchema,
  BuybackCollectionRequestSchema,
  BuybackCreateRequestSchema,
  BuybackInspectionHistorySchema,
  BuybackInspectionRequestSchema,
  BuybackIdSchema,
  BuybackPaymentRequestSchema,
  BuybackPaymentSchema,
  BuybackQaDecisionHistorySchema,
  BuybackQaRequestSchema,
  BuybackRefurbishmentHistorySchema,
  BuybackRefurbishmentCompleteRequestSchema,
  BuybackRefurbishmentStartRequestSchema,
  BuybackStatusSchema,
  BuybackValuationRequestSchema,
  type BuybackActionRequest,
  type BuybackCollectionRequest,
  type BuybackCreateRequest,
  type BuybackInspectionRequest,
  type BuybackPaymentRequest,
  type BuybackQaRequest,
  type BuybackRefurbishmentCompleteRequest,
  type BuybackRefurbishmentStartRequest,
  type BuybackValuationRequest,
} from "@/schema/buybacks.schema";
import { z } from "zod";

const BuybackListQuerySchema = z.object({
  status: BuybackStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
});
type BuybackListQuery = z.input<typeof BuybackListQuerySchema>;

const buybackPath = (id: string) =>
  "/buybacks/" + encodeURIComponent(BuybackIdSchema.parse(id));

async function getCaseHistory<T extends { buybackCaseId?: string }>(
  id: string,
  historyPath: string,
  schema: z.ZodType<T[]>,
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
  const items = schema.parse(response.data);
  if (items.some((item) => item.buybackCaseId != null && item.buybackCaseId !== caseId)) {
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

export const buybacksApi = {
  async create(input: BuybackCreateRequest) {
    const request = BuybackCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/buybacks", request, { baseURL: DOLORES_API_BASE_URL });
    const buyback = BuybackCaseSchema.parse(response.data);
    if (buyback.contractId !== request.contractId || buyback.machineId !== request.machineId) {
      throw new Error("Dolores returned a buyback case for a different contract or machine.");
    }
    return buyback;
  },

  async list(query: BuybackListQuery = {}, signal?: AbortSignal) {
    const params = BuybackListQuerySchema.parse(query);
    const response = await axiosClient.get<unknown>("/buybacks", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = BuybackCaseSummaryListSchema.parse(response.data);
    const pageHeader = Number(response.headers["x-page"]);
    const sizeHeader = Number(response.headers["x-page-size"]);
    return {
      items,
      page: Number.isInteger(pageHeader) && pageHeader >= 0 ? pageHeader : params.page,
      size: Number.isInteger(sizeHeader) && sizeHeader > 0 ? sizeHeader : params.size,
      hasNext: String(response.headers["x-has-next"] ?? "false").toLowerCase() === "true",
    };
  },

  async getById(id: string, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(buybackPath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const buyback = BuybackCaseSchema.parse(response.data);
    if (buyback.id !== validId) {
      throw new Error("Dolores returned a buyback case that does not match the requested ID.");
    }
    return buyback;
  },

  async createPayment(id: string, input: BuybackPaymentRequest) {
    const caseId = BuybackIdSchema.parse(id);
    const request = BuybackPaymentRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${buybackPath(caseId)}/payments`, request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const payment = BuybackPaymentSchema.parse(response.data);
    if (payment.buybackCaseId !== caseId) throw new Error("Dolores returned a payment for a different buyback case.");
    return payment;
  },

  async getInspections(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/inspections", BuybackInspectionHistorySchema, page, size, signal);
  },
  async getRefurbishments(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/refurbishments", BuybackRefurbishmentHistorySchema, page, size, signal);
  },
  async getQaDecisions(id: string, page = 0, size = 50, signal?: AbortSignal) {
    return getCaseHistory(id, "/qa-decisions", BuybackQaDecisionHistorySchema, page, size, signal);
  },

  async startInspection(id: string, input: BuybackActionRequest) {
    return postCaseAction(id, "/inspection/start", BuybackActionRequestSchema.parse(input));
  },
  async submitInspection(id: string, input: BuybackInspectionRequest) {
    return postCaseAction(id, "/inspection", BuybackInspectionRequestSchema.parse(input));
  },
  async decideValuation(id: string, input: BuybackValuationRequest) {
    return postCaseAction(id, "/valuation", BuybackValuationRequestSchema.parse(input));
  },
  async requestCollection(id: string, input: BuybackActionRequest) {
    return postCaseAction(id, "/collection/request", BuybackActionRequestSchema.parse(input));
  },
  async confirmCollection(id: string, input: BuybackCollectionRequest) {
    return postCaseAction(id, "/collection/confirm", BuybackCollectionRequestSchema.parse(input));
  },
  async startRefurbishment(id: string, input: BuybackRefurbishmentStartRequest) {
    return postCaseAction(id, "/refurbishment/start", BuybackRefurbishmentStartRequestSchema.parse(input));
  },
  async completeRefurbishment(id: string, input: BuybackRefurbishmentCompleteRequest) {
    return postCaseAction(id, "/refurbishment/complete", BuybackRefurbishmentCompleteRequestSchema.parse(input));
  },
  async decideQa(id: string, input: BuybackQaRequest) {
    return postCaseAction(id, "/qa", BuybackQaRequestSchema.parse(input));
  },
  async cancel(id: string, input: BuybackActionRequest) {
    return postCaseAction(id, "/cancel", BuybackActionRequestSchema.parse(input));
  },
};
