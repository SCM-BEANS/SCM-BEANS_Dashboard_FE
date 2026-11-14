import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  CoffeePackageIdSchema,
  CoffeePackageInvoiceSchema,
  CoffeePackageOrderIdSchema,
  CoffeePackageOrderSchema,
  CoffeePackagePayoutAttemptsSchema,
  CoffeePackagePayoutAttemptSchema,
  CoffeePackagePaymentProofSchema,
  CoffeePackagePaymentProofsSchema,
  CoffeePackagePlaceOrderRequestSchema,
  CoffeePackageProofDispositionSchema,
  CoffeePackageProofIdSchema,
  CoffeePackageProofReviewRequestSchema,
  CoffeePackageReasonRequestSchema,
  CoffeePackageRefundIdSchema,
  CoffeePackageRefundSchema,
  CoffeePackageRefundsSchema,
  CoffeePackageResolveDisputeRequestSchema,
  CoffeePackageSchema,
  CoffeePackageUpsertRequestSchema,
  CoffeePackageWaitingStockRequestSchema,
  CoffeePackageApprovalRequestSchema,
  CoffeePackageHandoverRequestSchema,
  CoffeePackageCancellationSchema,
  CoffeePackageFulfillmentSchema,
  CoffeePackagePayoutDisputeRequestSchema,
  type CoffeePackageUpsertRequest,
} from "@/schema/coffee-packages.schema";

const UUID = z.string().uuid();
const PAGE = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
});
const FileMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function responseHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  const value = record.get?.(name) ?? record[name] ?? record[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function readItems<TSchema extends z.ZodTypeAny>(value: unknown, schema: TSchema): z.infer<TSchema>[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { content?: unknown }).content)
      ? (value as { content: unknown[] }).content
      : null;
  if (!rows) throw new Error("Dolores returned a coffee-package list in an unsupported format.");
  return rows.map((row) => schema.parse(row));
}

function pageInfo(headers: unknown, requested: { page: number; size: number }) {
  const page = Number(responseHeader(headers, "X-Page"));
  const size = Number(responseHeader(headers, "X-Page-Size"));
  return {
    page: Number.isInteger(page) && page >= 0 ? page : requested.page,
    size: Number.isInteger(size) && size > 0 ? size : requested.size,
    hasNext: responseHeader(headers, "X-Has-Next")?.toLowerCase() === "true",
  };
}

function idempotencyKey(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomId}`.slice(0, 128);
}

async function validatePrivateFile(file: File, fieldName: string) {
  if (!file || file.size <= 0) throw new Error("Chọn tệp không rỗng.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Tệp không được vượt quá 20 MB.");
  if (!FileMimeTypes.has(file.type)) throw new Error("Chỉ hỗ trợ tệp PDF, JPEG hoặc PNG.");
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const valid = file.type === "application/pdf"
    ? bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    : file.type === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (!valid) throw new Error(`Nội dung tệp ${fieldName} không khớp với định dạng đã chọn.`);
}

async function privateFileContent(path: string, signal?: AbortSignal, onProgress?: (loaded: number, total?: number) => void) {
  const response = await axiosClient.get<Blob>(path, { baseURL: DOLORES_API_BASE_URL, responseType: "blob", signal, onDownloadProgress: (event) => onProgress?.(event.loaded, event.total) });
  return response.data;
}

async function downloadPrivateFile(path: string, filename: string) {
  const url = URL.createObjectURL(await privateFileContent(path));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const packagePath = (id: string) => `/coffee-packages/${encodeURIComponent(CoffeePackageIdSchema.parse(id))}`;
const orderPath = (id: string) => `/coffee-package-orders/${encodeURIComponent(CoffeePackageOrderIdSchema.parse(id))}`;
const invoicePath = (id: string) => `/coffee-package-invoices/${encodeURIComponent(UUID.parse(id))}`;
const proofPath = (id: string) => `/coffee-package-payment-proofs/${encodeURIComponent(CoffeePackageProofIdSchema.parse(id))}`;
const refundPath = (id: string) => `/coffee-package-refunds/${encodeURIComponent(CoffeePackageRefundIdSchema.parse(id))}`;

export const coffeePackagesApi = {
  downloadPaymentProofContent(id: string, signal?: AbortSignal, onProgress?: (loaded: number, total?: number) => void) {
    return privateFileContent(`${proofPath(id)}/content`, signal, onProgress);
  },
  downloadDispositionEvidenceContent(id: string, signal?: AbortSignal, onProgress?: (loaded: number, total?: number) => void) {
    return privateFileContent(`${proofPath(id)}/disposition-evidence`, signal, onProgress);
  },
  downloadPayoutEvidenceContent(id: string, attemptNumber: number, signal?: AbortSignal, onProgress?: (loaded: number, total?: number) => void) {
    const attempt = z.number().int().positive().parse(attemptNumber);
    return privateFileContent(`${refundPath(id)}/payout-attempts/${attempt}/content`, signal, onProgress);
  },
  async listPackages(input: { includeInactive?: boolean; page?: number; size?: number } = {}, signal?: AbortSignal) {
    const params = PAGE.parse({ page: input.page ?? 0, size: input.size ?? 50 });
    const response = await axiosClient.get<unknown>("/coffee-packages", {
      baseURL: DOLORES_API_BASE_URL,
      params: { ...params, includeInactive: input.includeInactive ?? false },
      signal,
    });
    const items = readItems(response.data, CoffeePackageSchema);
    return { items, ...pageInfo(response.headers, params) };
  },
  async getPackage(id: string, signal?: AbortSignal) {
    const packageId = CoffeePackageIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(packagePath(packageId), { baseURL: DOLORES_API_BASE_URL, signal });
    const item = CoffeePackageSchema.parse(response.data);
    if (item.id !== packageId) throw new Error("Dolores returned a different coffee package.");
    return item;
  },
  async createPackage(input: CoffeePackageUpsertRequest) {
    const response = await axiosClient.post<unknown>("/coffee-packages", CoffeePackageUpsertRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    return CoffeePackageSchema.parse(response.data);
  },
  async updatePackage(id: string, input: CoffeePackageUpsertRequest) {
    const packageId = CoffeePackageIdSchema.parse(id);
    const response = await axiosClient.put<unknown>(packagePath(packageId), CoffeePackageUpsertRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    const item = CoffeePackageSchema.parse(response.data);
    if (item.id !== packageId) throw new Error("Dolores returned a different coffee package than the one updated.");
    return item;
  },
  async deactivatePackage(id: string) {
    await axiosClient.post(`${packagePath(id)}/deactivate`, undefined, { baseURL: DOLORES_API_BASE_URL });
  },
  async listOrders(page = 0, size = 50, signal?: AbortSignal) {
    const params = PAGE.parse({ page, size });
    const response = await axiosClient.get<unknown>("/coffee-package-orders", { baseURL: DOLORES_API_BASE_URL, params, signal });
    const items = readItems(response.data, CoffeePackageOrderSchema);
    return { items, ...pageInfo(response.headers, params) };
  },
  async placeOrder(input: { contractId: string; packageId: string; quantity: number }) {
    const request = CoffeePackagePlaceOrderRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/coffee-package-orders", request, { baseURL: DOLORES_API_BASE_URL });
    const order = CoffeePackageOrderSchema.parse(response.data);
    if (order.contractId && order.contractId !== request.contractId) throw new Error("Dolores returned an order for a different contract.");
    return order;
  },
  async getOrder(id: string, signal?: AbortSignal) {
    const orderId = CoffeePackageOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(orderPath(orderId), { baseURL: DOLORES_API_BASE_URL, signal });
    const order = CoffeePackageOrderSchema.parse(response.data);
    if (order.id !== orderId) throw new Error("Dolores returned a different coffee-package order.");
    return order;
  },
  async approveOrder(id: string, input: { note: string }) {
    const body = CoffeePackageApprovalRequestSchema.parse({ supplyConfirmed: true, note: input.note });
    await axiosClient.post(`${orderPath(id)}/approve`, body, { baseURL: DOLORES_API_BASE_URL });
  },
  async rejectOrder(id: string, reason: string) {
    await axiosClient.post(`${orderPath(id)}/reject`, CoffeePackageReasonRequestSchema.parse({ reason }), { baseURL: DOLORES_API_BASE_URL });
  },
  async markWaitingStock(id: string, input: { reason: string; expectedStockAt: string }) {
    await axiosClient.post(`${orderPath(id)}/waiting-stock`, CoffeePackageWaitingStockRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
  },
  async acknowledgeWaitingStock(id: string) {
    await axiosClient.post(`${orderPath(id)}/waiting-stock/acknowledge`, undefined, { baseURL: DOLORES_API_BASE_URL });
  },
  async confirmOrderReceived(id: string) {
    const orderId = CoffeePackageOrderIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(`${orderPath(orderId)}/confirm-received`, undefined, { baseURL: DOLORES_API_BASE_URL });
    const fulfillment = CoffeePackageFulfillmentSchema.parse(response.data);
    if (fulfillment.orderId !== orderId) throw new Error("Dolores returned fulfillment for a different order.");
    return fulfillment;
  },
  async handover(id: string, input: { method: "SELF_PICKUP" | "COMPANY_DELIVERY_EXTERNAL"; recipient: string; quantity: number; expiryChecked: true }) {
    const body = CoffeePackageHandoverRequestSchema.parse(input);
    await axiosClient.post(`${orderPath(id)}/handover`, body, { baseURL: DOLORES_API_BASE_URL });
  },
  async cancelAndRefund(id: string, reason: string) {
    const response = await axiosClient.post<unknown>(`${orderPath(id)}/cancel-and-refund`, CoffeePackageReasonRequestSchema.parse({ reason }), { baseURL: DOLORES_API_BASE_URL });
    return response.data == null ? null : CoffeePackageCancellationSchema.parse(response.data);
  },
  async getInvoiceByOrder(id: string, signal?: AbortSignal) {
    const orderId = CoffeePackageOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${orderPath(orderId)}/invoice`, { baseURL: DOLORES_API_BASE_URL, signal });
    const invoice = CoffeePackageInvoiceSchema.parse(response.data);
    if (invoice.orderId !== orderId) throw new Error("Dolores returned an invoice for a different order.");
    return invoice;
  },
  async getInvoice(id: string, signal?: AbortSignal) {
    const invoiceId = UUID.parse(id);
    const response = await axiosClient.get<unknown>(invoicePath(invoiceId), { baseURL: DOLORES_API_BASE_URL, signal });
    const invoice = CoffeePackageInvoiceSchema.parse(response.data);
    if (invoice.id !== invoiceId) throw new Error("Dolores returned a different coffee-package invoice.");
    return invoice;
  },
  async listPaymentProofs(invoiceId: string, page = 0, size = 50, signal?: AbortSignal) {
    const id = UUID.parse(invoiceId);
    const params = PAGE.parse({ page, size });
    const response = await axiosClient.get<unknown>(`${invoicePath(id)}/payment-proofs`, { baseURL: DOLORES_API_BASE_URL, params, signal });
    const items = readItems(response.data, CoffeePackagePaymentProofSchema);
    if (items.some((proof) => proof.invoiceId !== id)) throw new Error("Dolores returned payment evidence for another invoice.");
    return { items, ...pageInfo(response.headers, params) };
  },
  async submitPaymentProof(invoiceId: string, amount: number, file: File, key = idempotencyKey("coffee-package-proof")) {
    const id = UUID.parse(invoiceId);
    const validAmount = z.number().finite().positive().parse(amount);
    await validatePrivateFile(file, "chứng từ thanh toán");
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(`${invoicePath(id)}/payment-proofs`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: { amount: validAmount },
      headers: { "Idempotency-Key": z.string().trim().min(1).max(128).parse(key), "Content-Type": "multipart/form-data" },
    });
    const proof = CoffeePackagePaymentProofSchema.parse(response.data);
    if (proof.invoiceId !== id) throw new Error("Dolores returned evidence for another invoice.");
    return proof;
  },
  async getPaymentProof(id: string, signal?: AbortSignal) {
    const proofId = CoffeePackageProofIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(proofPath(proofId), { baseURL: DOLORES_API_BASE_URL, signal });
    const proof = CoffeePackagePaymentProofSchema.parse(response.data);
    if (proof.id !== proofId) throw new Error("Dolores returned a different payment proof.");
    return proof;
  },
  async downloadPaymentProof(id: string, filename = "chung-tu-goi-ca-phe") {
    await downloadPrivateFile(`${proofPath(id)}/content`, filename);
  },
  async reviewPaymentProof(id: string, input: { approve: boolean; reason: string }) {
    await axiosClient.post(`${proofPath(id)}/review`, CoffeePackageProofReviewRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
  },
  async listExceptions(page = 0, size = 50, signal?: AbortSignal) {
    const params = PAGE.parse({ page, size });
    const response = await axiosClient.get<unknown>("/coffee-package-payment-proofs/exceptions", { baseURL: DOLORES_API_BASE_URL, params, signal });
    return { items: readItems(response.data, CoffeePackagePaymentProofSchema), ...pageInfo(response.headers, params) };
  },
  async disposePaymentException(id: string, input: { disposition: "NO_FUNDS" | "EXCESS_RETURNED" | "EXCESS_INCLUDED_IN_REFUND"; verifiedAmount: number; bankReference: string; returnBankReference?: string; reason: string; evidence: File; key?: string }) {
    const proofId = CoffeePackageProofIdSchema.parse(id);
    const disposition = CoffeePackageProofDispositionSchema.parse(input.disposition);
    const verifiedAmount = z.number().finite().nonnegative().parse(input.verifiedAmount);
    if (disposition === "NO_FUNDS" && verifiedAmount !== 0) throw new Error("NO_FUNDS yêu cầu số tiền xác minh bằng 0.");
    await validatePrivateFile(input.evidence, "đối soát ngoại lệ");
    const form = new FormData();
    form.append("evidence", input.evidence);
    await axiosClient.post(`${proofPath(proofId)}/disposition`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: {
        disposition,
        verifiedAmount,
        bankReference: z.string().trim().min(1).max(160).parse(input.bankReference),
        ...(input.returnBankReference?.trim() ? { returnBankReference: input.returnBankReference.trim() } : {}),
        reason: z.string().trim().min(1).max(2000).parse(input.reason),
      },
      headers: { "Idempotency-Key": z.string().trim().min(1).max(128).parse(input.key ?? idempotencyKey("coffee-exception")), "Content-Type": "multipart/form-data" },
    });
  },
  async downloadDispositionEvidence(id: string) {
    await downloadPrivateFile(`${proofPath(id)}/disposition-evidence`, "chung-cu-doi-soat-ngoai-le");
  },
  async listRefunds(page = 0, size = 50, signal?: AbortSignal) {
    const params = PAGE.parse({ page, size });
    const response = await axiosClient.get<unknown>("/coffee-package-refunds", { baseURL: DOLORES_API_BASE_URL, params, signal });
    return { items: readItems(response.data, CoffeePackageRefundSchema), ...pageInfo(response.headers, params) };
  },
  async getRefund(id: string, signal?: AbortSignal) {
    const refundId = CoffeePackageRefundIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(refundPath(refundId), { baseURL: DOLORES_API_BASE_URL, signal });
    const refund = CoffeePackageRefundSchema.parse(response.data);
    if (refund.id !== refundId) throw new Error("Dolores returned a different coffee-package refund.");
    return refund;
  },
  async getRefundByOrder(id: string, signal?: AbortSignal) {
    const orderId = CoffeePackageOrderIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${orderPath(orderId)}/refund`, { baseURL: DOLORES_API_BASE_URL, signal });
    const refund = CoffeePackageRefundSchema.parse(response.data);
    if (refund.orderId && refund.orderId !== orderId) throw new Error("Dolores returned a refund for a different order.");
    return refund;
  },
  async approveRefund(id: string, reason: string) {
    await axiosClient.post(`${refundPath(id)}/approve`, CoffeePackageReasonRequestSchema.parse({ reason }), { baseURL: DOLORES_API_BASE_URL });
  },
  async listPayoutAttempts(id: string, signal?: AbortSignal) {
    const refundId = CoffeePackageRefundIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`${refundPath(refundId)}/payout-attempts`, { baseURL: DOLORES_API_BASE_URL, signal });
    const attempts = readItems(response.data, CoffeePackagePayoutAttemptSchema);
    if (attempts.some((attempt) => attempt.refundId !== refundId)) throw new Error("Dolores returned a payout attempt for another refund.");
    return attempts;
  },
  async createPayoutAttempt(id: string, input: { bankReference: string; reason: string; evidence: File; key?: string }) {
    const refundId = CoffeePackageRefundIdSchema.parse(id);
    await validatePrivateFile(input.evidence, "chứng từ chuyển khoản hoàn tiền");
    const form = new FormData();
    form.append("evidence", input.evidence);
    const response = await axiosClient.post<unknown>(`${refundPath(refundId)}/payout-attempts`, form, {
      baseURL: DOLORES_API_BASE_URL,
      params: {
        bankReference: z.string().trim().min(1).max(160).parse(input.bankReference),
        reason: z.string().trim().min(1).max(2000).parse(input.reason),
      },
      headers: { "Idempotency-Key": z.string().trim().min(1).max(128).parse(input.key ?? idempotencyKey("coffee-refund-payout")), "Content-Type": "multipart/form-data" },
    });
    const attempt = CoffeePackagePayoutAttemptSchema.parse(response.data);
    if (attempt.refundId !== refundId) throw new Error("Dolores returned a payout attempt for another refund.");
    return attempt;
  },
  async downloadPayoutEvidence(id: string, attemptNumber: number) {
    const refundId = CoffeePackageRefundIdSchema.parse(id);
    const attempt = z.number().int().positive().parse(attemptNumber);
    await downloadPrivateFile(`${refundPath(refundId)}/payout-attempts/${attempt}/content`, "chung-tu-hoan-tien");
  },
  async markPayoutFailed(id: string, attemptNumber: number, reason: string) {
    const refundId = CoffeePackageRefundIdSchema.parse(id);
    const attempt = z.number().int().positive().parse(attemptNumber);
    await axiosClient.post(`${refundPath(refundId)}/payout-attempts/${attempt}/failed`, CoffeePackageReasonRequestSchema.parse({ reason }), { baseURL: DOLORES_API_BASE_URL });
  },
  async createRefundDispute(id: string, reason: string) {
    await axiosClient.post(`${refundPath(id)}/disputes`, CoffeePackagePayoutDisputeRequestSchema.parse({ reason }), { baseURL: DOLORES_API_BASE_URL });
  },
  async resolveRefundDispute(id: string, input: { resolution: "CONFIRM_PAYOUT" | "RETRY_PAYOUT"; reason: string }) {
    await axiosClient.post(`${refundPath(id)}/disputes/resolve`, CoffeePackageResolveDisputeRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
  },
  async confirmRefundReceived(id: string) {
    await axiosClient.post(`${refundPath(id)}/confirm-received`, undefined, { baseURL: DOLORES_API_BASE_URL });
  },
  newIdempotencyKey: idempotencyKey,
};

export type CoffeePackageAction = "approval" | "rejection" | "waiting-stock" | "handover" | "cancellation";
export type CoffeePackagePaymentState = "invoice" | "proof" | "exception" | "refund" | "payout";

// The response schemas remain available here for callers that need to validate
// a mutation response without assuming every endpoint returns the same DTO.
export const CoffeePackageActionResponseSchema = z.union([
  CoffeePackageOrderSchema,
  CoffeePackageFulfillmentSchema,
  CoffeePackageCancellationSchema,
  CoffeePackageRefundSchema,
]);
