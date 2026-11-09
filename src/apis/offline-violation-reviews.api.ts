import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  buildEvidenceForm,
  EVIDENCE_MULTIPART_HEADERS,
  validateEvidenceFiles,
} from "@/lib/evidence-multipart";
import {
  OfflineViolationReviewContextSchema,
  OfflineViolationReviewDecisionRequestSchema,
  OfflineViolationReviewIdSchema,
  OfflineViolationReviewListParamsSchema,
  OfflineViolationReviewListSchema,
  OfflineViolationReviewSchema,
  type OfflineViolationReview,
  type OfflineViolationReviewContext,
  type OfflineViolationReviewDecisionRequest,
  type OfflineViolationReviewListParams,
} from "@/schema/offline-violation-reviews.schema";

const basePath = "/offline-violation-reviews";
const reviewPath = (id: string) => `${basePath}/${encodeURIComponent(OfflineViolationReviewIdSchema.parse(id))}`;
export class OfflineReviewWorkflowError extends Error {}

export function readOfflineReviewQuery(query: Record<string, string | string[] | undefined>, expected: OfflineViolationReviewContext = {}) {
  const context = OfflineViolationReviewContextSchema.parse(expected);
  const scalar = (key: string) => {
    const value = query[key];
    if (value !== undefined && typeof value !== "string") throw new Error("Bộ lọc rà soát không hợp lệ.");
    return value || undefined;
  };
  const page = scalar("reviewPage");
  if (page && !/^\d+$/.test(page)) throw new Error("Số trang rà soát không hợp lệ.");
  const machineId = scalar("machineId");
  if (machineId && context.machineId && machineId !== context.machineId) throw new Error("Bộ lọc không khớp máy đang xem.");
  const params = OfflineViolationReviewListParamsSchema.parse({ ...context, ...(machineId ? { machineId } : {}), ...(scalar("reviewStatus") ? { status: scalar("reviewStatus") } : {}), page: page ? Number(page) : 0 });
  const selection = scalar("reviewId");
  return { params, reviewId: selection ? OfflineViolationReviewIdSchema.parse(selection) : undefined };
}

function assertContext(review: OfflineViolationReview, context: OfflineViolationReviewContext) {
  for (const key of ["ownerId", "contractId", "machineId"] as const) {
    if (context[key] !== undefined && review[key] !== context[key]) {
      throw new Error(`Dolores returned an offline review outside the requested ${key} scope.`);
    }
  }
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const values = headers as Record<string, unknown>;
  if (typeof values.get === "function") {
    const value: unknown = values.get.call(headers, name);
    if (typeof value === "string") return value;
  }
  const entry = Object.entries(values).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return typeof entry?.[1] === "string" ? entry[1] : undefined;
}

function pageNumber(headers: unknown, name: string, minimum: number, maximum: number) {
  const value = headerValue(headers, name)?.trim();
  const number = value !== undefined && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`Dolores returned missing or invalid ${name} pagination metadata.`);
  }
  return number;
}

export const offlineViolationReviewsApi = {
  async listPage(input: OfflineViolationReviewListParams = {}, signal?: AbortSignal) {
    const params = OfflineViolationReviewListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(basePath, {
      baseURL: DOLORES_API_BASE_URL, signal, params,
    });
    const items = OfflineViolationReviewListSchema.parse(response.data);
    const page = pageNumber(response.headers, "x-page", 0, 2_147_483_647);
    const size = pageNumber(response.headers, "x-page-size", 1, 100);
    const nextValue = headerValue(response.headers, "x-has-next")?.trim().toLowerCase();
    if ((nextValue !== "true" && nextValue !== "false") || page !== params.page || size !== params.size || items.length > size) {
      throw new Error("Dolores returned missing or inconsistent offline review pagination metadata.");
    }
    for (const item of items) {
      assertContext(item, params);
      if (params.status && item.status !== params.status) {
        throw new Error("Dolores returned an offline review outside the requested status filter.");
      }
    }
    return { items, page, size, hasNext: nextValue === "true" };
  },

  async getById(id: string, signal?: AbortSignal, expected: OfflineViolationReviewContext = {}) {
    const path = reviewPath(id);
    const context = OfflineViolationReviewContextSchema.parse(expected);
    const response = await axiosClient.get<unknown>(path, { baseURL: DOLORES_API_BASE_URL, signal });
    const review = OfflineViolationReviewSchema.parse(response.data);
    if (review.id !== id) throw new Error("Dolores returned a different offline review than requested.");
    assertContext(review, context);
    return review;
  },

  async decide(id: string, input: OfflineViolationReviewDecisionRequest, expected: OfflineViolationReviewContext = {}, files: File[] = []) {
    const path = reviewPath(id);
    const body = OfflineViolationReviewDecisionRequestSchema.parse(input);
    const context = OfflineViolationReviewContextSchema.parse(expected);
    validateEvidenceFiles(files, { min: 1, max: 5 });
    const response = await axiosClient.post<unknown>(`${path}/decision`, buildEvidenceForm(body, files), {
      baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS,
    });
    try {
      const review = OfflineViolationReviewSchema.parse(response.data);
      if (review.id !== id || review.status !== "REVIEWED" || review.decision !== body.decision
        || review.decisionReason !== body.reason || review.decidedAt === null) throw new Error("Invalid decision response.");
      assertContext(review, context);
      return review;
    } catch {
      throw new OfflineReviewWorkflowError("Chưa xác minh được kết quả ghi nhận. Hãy làm mới hồ sơ để kiểm tra trước khi thử lại.");
    }
  },

  async decideIfRequired(id: string, input: OfflineViolationReviewDecisionRequest, expected: OfflineViolationReviewContext = {}, files: File[] = []) {
    const body = OfflineViolationReviewDecisionRequestSchema.parse(input);
    const current = await offlineViolationReviewsApi.getById(id, undefined, expected);
    if (current.status !== "REVIEW_REQUIRED") throw new OfflineReviewWorkflowError("Hồ sơ đã thay đổi trạng thái. Hãy xem lại dữ liệu mới nhất trước khi tiếp tục.");
    return offlineViolationReviewsApi.decide(id, body, expected, files);
  },
};
