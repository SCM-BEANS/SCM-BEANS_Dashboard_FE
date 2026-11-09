import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  buildEvidenceForm,
  EVIDENCE_MULTIPART_HEADERS,
  validateEvidenceFiles,
} from "@/lib/evidence-multipart";
import {
  BILLING_DEFAULT_PAGE_SIZE,
  InvoiceIdSchema,
  InvoiceLineItemListParamsSchema,
  InvoiceLineItemsSchema,
  InvoiceListParamsSchema,
  InvoicesSchema,
  InvoiceSchema,
  ModeratorInvoiceSchema,
  ModeratorInvoicesSchema,
  PaymentProofIdSchema,
  PaymentProofListParamsSchema,
  PaymentProofReviewRequestSchema,
  PaymentProofsSchema,
  PaymentProofSchema,
  PaymentProofSubmitResponseSchema,
  RefundIdSchema,
  RefundReceiptRequestSchema,
  RefundCreateRequestSchema,
  RefundDetailSchema,
  RefundRequestResponseSchema,
  RefundOverdueParamsSchema,
  RefundReasonRequestSchema,
  RefundPayoutEvidenceSchema,
  DepositReserveRequestSchema,
  DepositReleaseRequestSchema,
  DepositDamageRequestSchema,
  DepositSettlementResponseSchema,
  type RefundCreateRequest,
  type RefundOverdueParams,
  type BillingPage,
  type Invoice,
  type InvoiceLineItemListParams,
  type InvoiceListParams,
  type PaymentProofListParams,
  type RefundReceiptRequest,
} from "@/schema/billing.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { BillingExportRequestSchema, ContractBillingPreviewResponseSchema, ExportJobIdSchema, ExportJobResponseSchema, InvoiceStatusChangeRequestSchema, type PaymentProofReviewRequest, type InvoiceStatusChangeRequest, type BillingExportRequest } from "@/schema/billing.schema";
async function fetchInvoicePage(params: InvoiceListParams = {}, signal?: AbortSignal) {
  const query = InvoiceListParamsSchema.parse(params);
  const response = await axiosClient.get<unknown>("/billing/invoices", {
    baseURL: DOLORES_API_BASE_URL,
    ...(Object.keys(query).length ? { params: query } : {}),
    signal,
  });
  const headerNumber = (name: string, fallback: number) => {
    const parsed = Number(response.headers[name] ?? fallback);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
  };
  const items = InvoicesSchema.parse(response.data);
  const requestedSize = query.size ?? 50;
  const hasNextHeader = response.headers["x-has-next"];
  return {
    items,
    page: headerNumber("x-page", query.page ?? 0),
    size: headerNumber("x-page-size", requestedSize),
    hasNext: hasNextHeader == null
      ? items.length === requestedSize
      : String(hasNextHeader).toLowerCase() === "true",
  };
}


const MAX_PAYMENT_PROOF_BYTES = 20 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const invoicePath = (id: string) =>
  "/billing/invoices/" + encodeURIComponent(InvoiceIdSchema.parse(id));

const proofPath = (id: string) =>
  "/billing/payment-proofs/" + encodeURIComponent(PaymentProofIdSchema.parse(id));

const proofContentPath = (id: string) => proofPath(id) + "/content";
const refundPath = (id: string) => "/billing/refunds/" + encodeURIComponent(RefundIdSchema.parse(id));

function parseRefundResponse(value: unknown, expectedId?: string) {
  const refund = RefundRequestResponseSchema.parse(value);
  if (expectedId && refund.id !== expectedId) throw new Error("Dolores returned a different Refund than requested.");
  return refund;
}

async function refundAction(id: string, action: "confirm" | "approve" | "reject" | "fail" | "receipt", body?: unknown) {
  const validId = RefundIdSchema.parse(id);
  const response = await axiosClient.post<unknown>(`${refundPath(validId)}/${action}`, body, { baseURL: DOLORES_API_BASE_URL });
  return parseRefundResponse(response.data, validId);
}

function paginationHeader(headers: unknown, name: string): unknown {
  if (!headers || typeof headers !== "object") return undefined;
  const candidate = headers as Record<string, unknown> & { get?: (header: string) => unknown };
  return candidate.get?.(name) ?? candidate[name.toLowerCase()] ?? candidate[name];
}

function numberHeader(headers: unknown, name: string, fallback: number): number {
  const raw = paginationHeader(headers, name);
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function pageFromResponse<T>(
  items: T[],
  headers: unknown,
  requestedPage: number,
  requestedSize: number,
): BillingPage<T> {
  const hasNextValue = paginationHeader(headers, "X-Has-Next");
  const hasNext = hasNextValue === undefined
    ? items.length === requestedSize
    : String(hasNextValue).toLowerCase() === "true";
  return {
    items,
    page: numberHeader(headers, "X-Page", requestedPage),
    size: numberHeader(headers, "X-Page-Size", requestedSize),
    hasNext,
  };
}

function invoiceQueryParams(input: InvoiceListParams) {
  const params = InvoiceListParamsSchema.parse(input);
  return {
    ...(params.ownerId ? { ownerId: params.ownerId } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.period ? { period: params.period } : {}),
    page: params.page,
    size: params.size,
  };
}

function detectPaymentProofType(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  return undefined;
}

export async function validatePaymentProofFile(file: File): Promise<void> {
  if (!file || file.size <= 0) throw new Error("Chọn một tệp chứng từ không rỗng.");
  if (file.size > MAX_PAYMENT_PROOF_BYTES) throw new Error("Tệp chứng từ phải nhỏ hơn hoặc bằng 20 MB.");
  if (!ALLOWED_PROOF_TYPES.has(file.type)) throw new Error("Chỉ hỗ trợ chứng từ PDF, JPEG hoặc PNG.");

  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (detectPaymentProofType(signature) !== file.type) {
    throw new Error("Nội dung tệp không khớp với định dạng PDF, JPEG hoặc PNG đã chọn.");
  }
}

export const billingApi =  {
  async listInvoicesPage(input: InvoiceListParams = {}, signal?: AbortSignal): Promise<BillingPage<Invoice>> {
    const params = invoiceQueryParams(input);
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = InvoicesSchema.parse(response.data);
    return pageFromResponse(items, response.headers, params.page, params.size);
  },
  async listInvoices(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      params: { page: 0, size: BILLING_DEFAULT_PAGE_SIZE },
      signal,
    });
    return InvoicesSchema.parse(response.data);
  },
  async listOperatorInvoicesPage(input: InvoiceListParams = {}, signal?: AbortSignal) {
    const params = invoiceQueryParams(input);
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = ModeratorInvoicesSchema.parse(response.data);
    return pageFromResponse(items, response.headers, params.page, params.size);
  },
  async getInvoice(id: string, signal?: AbortSignal) {
    const validId = InvoiceIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(invoicePath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const invoice = InvoiceSchema.parse(response.data);
    if (invoice.id !== validId) {
      throw new Error("Dolores returned an invoice that does not match the requested ID.");
    }
    return invoice;
  },
  async getModeratorInvoice(id: string, signal?: AbortSignal) {
    const validId = InvoiceIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(invoicePath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const invoice = ModeratorInvoiceSchema.parse(response.data);
    if (invoice.id !== validId) {
      throw new Error("Dolores returned an invoice that does not match the requested ID.");
    }
    return invoice;
  },
  async listInvoiceLineItemsPage(id: string, input: InvoiceLineItemListParams = {}, signal?: AbortSignal) {
    const validId = InvoiceIdSchema.parse(id);
    const params = InvoiceLineItemListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(invoicePath(validId) + "/line-items", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = InvoiceLineItemsSchema.parse(response.data);
    if (items.some((item) => item.invoiceId !== validId)) {
      throw new Error("Dolores returned an invoice line item for a different invoice.");
    }
    return pageFromResponse(items, response.headers, params.page, params.size);
  },
  async listInvoiceLineItems(id: string, signal?: AbortSignal) {
    const validId = InvoiceIdSchema.parse(id);
    const params = InvoiceLineItemListParamsSchema.parse({});
    const response = await axiosClient.get<unknown>(invoicePath(validId) + "/line-items", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = InvoiceLineItemsSchema.parse(response.data);
    if (items.some((item) => item.invoiceId !== validId)) {
      throw new Error("Dolores returned an invoice line item for a different invoice.");
    }
    return items;
  },
  async listModeratorInvoices(signal?: AbortSignal) {
    const params = invoiceQueryParams({});
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    return ModeratorInvoicesSchema.parse(response.data);
  },
  async listPaymentProofsPage(invoiceId: string, input: PaymentProofListParams = {}, signal?: AbortSignal) {
    const validInvoiceId = InvoiceIdSchema.parse(invoiceId);
    const params = PaymentProofListParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(
      invoicePath(validInvoiceId) + "/payment-proofs",
      { baseURL: DOLORES_API_BASE_URL, params, signal },
    );
    const items = PaymentProofsSchema.parse(response.data);
    if (items.some((proof) => proof.invoiceId !== validInvoiceId)) {
      throw new Error("Dolores returned a payment proof for a different invoice.");
    }
    return pageFromResponse(items, response.headers, params.page, params.size);
  },
  async listPaymentProofs(invoiceId: string, signal?: AbortSignal) {
    const validInvoiceId = InvoiceIdSchema.parse(invoiceId);
    const params = PaymentProofListParamsSchema.parse({});
    const response = await axiosClient.get<unknown>(
      invoicePath(validInvoiceId) + "/payment-proofs",
      { baseURL: DOLORES_API_BASE_URL, params, signal },
    );
    const items = PaymentProofsSchema.parse(response.data);
    if (items.some((proof) => proof.invoiceId !== validInvoiceId)) {
      throw new Error("Dolores returned a payment proof for a different invoice.");
    }
    return items;
  },
  async submitPaymentProof(input: {
    invoiceId: string;
    amount: number;
    file: File;
    idempotencyKey: string;
  }) {
    const invoiceId = InvoiceIdSchema.parse(input.invoiceId);
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Payment amount must be greater than zero.");
    }
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new Error("An idempotency key between 1 and 128 characters is required.");
    }
    await validatePaymentProofFile(input.file);

    const form = new FormData();
    form.append("file", input.file);
    const response = await axiosClient.post<unknown>(
      invoicePath(invoiceId) + "/payment-proofs",
      form,
      {
        baseURL: DOLORES_API_BASE_URL,
        params: { amount: input.amount },
        // Override axiosClient's shared JSON default; the browser adapter adds
        // the multipart boundary when it sends this FormData body.
        headers: {
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    const proof = PaymentProofSubmitResponseSchema.parse(response.data);
    if (proof.invoiceId !== invoiceId) {
      throw new Error("Dolores returned a payment proof for a different invoice.");
    }
    return proof;
  },
  async reviewPaymentProof(input: { proofId: string; approve: boolean; reason: string }) {
    const proofId = PaymentProofIdSchema.parse(input.proofId);
    const body = PaymentProofReviewRequestSchema.parse({ approve: input.approve, reason: input.reason });
    const response = await axiosClient.post<unknown>(proofPath(proofId) + "/review", body, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const proof = PaymentProofSchema.parse(response.data);
    if (proof.id !== proofId) {
      throw new Error("Dolores returned a different payment proof after review.");
    }
    return proof;
  },
  async downloadPaymentProofContent(proofId: string, signal?: AbortSignal) {
    const response = await axiosClient.get<Blob>(proofContentPath(proofId), {
      baseURL: DOLORES_API_BASE_URL,
      headers: { Accept: "*/*" },
      responseType: "blob",
      signal,
    });
    return response.data;
  },
  async createRefund(input: RefundCreateRequest) {
    const request = RefundCreateRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/billing/refunds", request, { baseURL: DOLORES_API_BASE_URL });
    const refund = parseRefundResponse(response.data);
    if (refund.ownerId !== request.ownerId || refund.refundKind !== request.refundKind
      || refund.amount !== request.amount || refund.currency !== request.currency
      || (request.contractId && refund.contractId !== request.contractId)
      || (request.invoiceId && refund.invoiceId !== request.invoiceId)) {
      throw new Error("Dolores returned a Refund for a different payment source.");
    }
    return refund;
  },
  async getRefund(refundId: string, signal?: AbortSignal) {
    const validId = RefundIdSchema.parse(refundId);
    const response = await axiosClient.get<unknown>(refundPath(validId), {
      baseURL: DOLORES_API_BASE_URL, signal, headers: { "Cache-Control": "no-store" },
    });
    const refund = RefundDetailSchema.parse(response.data);
    if (refund.id !== validId) throw new Error("Dolores returned a different Refund than requested.");
    return refund;
  },
  async listOverdueRefunds(input: RefundOverdueParams = {}, signal?: AbortSignal) {
    const params = RefundOverdueParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/billing/refunds/overdue", { baseURL: DOLORES_API_BASE_URL, params, signal });
    const items = RefundRequestResponseSchema.array().parse(response.data);
    if (params.ownerId && items.some((item) => item.ownerId !== params.ownerId)) throw new Error("Dolores returned a Refund outside the requested Owner scope.");
    return pageFromResponse(items, response.headers, params.page, params.size);
  },
  async confirmRefund(refundId: string) {
    return refundAction(refundId, "confirm");
  },
  async approveRefund(refundId: string) {
    return refundAction(refundId, "approve");
  },
  async rejectRefund(refundId: string, reason: string) {
    return refundAction(refundId, "reject", RefundReasonRequestSchema.parse({ reason }));
  },
  async failRefund(refundId: string, reason: string) {
    return refundAction(refundId, "fail", RefundReasonRequestSchema.parse({ reason }));
  },
  async reopenRefund(refundId: string, reason: string, idempotencyKey: string) {
    const validId = RefundIdSchema.parse(refundId);
    const key = DepositReserveRequestSchema.parse({ idempotencyKey }).idempotencyKey;
    const response = await axiosClient.post<unknown>(`${refundPath(validId)}/reopen`, RefundReasonRequestSchema.parse({ reason }), {
      baseURL: DOLORES_API_BASE_URL, headers: { "Idempotency-Key": key },
    });
    return parseRefundResponse(response.data, validId);
  },
  async submitRefundTransferEvidence(refundId: string, file: File) {
    await validatePaymentProofFile(file);
    const form = new FormData();
    form.append("file", file);
    const response = await axiosClient.post<unknown>(refundPath(refundId) + "/submit", form, {
      baseURL: DOLORES_API_BASE_URL,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return RefundPayoutEvidenceSchema.parse(response.data);
  },
  async recordRefundReceipt(refundId: string, input: RefundReceiptRequest) {
    const request = RefundReceiptRequestSchema.parse(input);
    return refundAction(refundId, "receipt", request);
  },
  async downloadRefundEvidence(refundId: string, evidenceId: string, signal?: AbortSignal) {
    const validEvidenceId = PaymentProofIdSchema.parse(evidenceId);
    const response = await axiosClient.get<Blob>(`${refundPath(refundId)}/evidence/${encodeURIComponent(validEvidenceId)}`, {
      baseURL: DOLORES_API_BASE_URL, signal, responseType: "blob", headers: { Accept: "*/*", "Cache-Control": "no-store" },
    });
    return response.data;
  },
  async reserveDeposit(contractId: string, input: { idempotencyKey: string }) {
    const validId = ContractIdSchema.parse(contractId);
    const response = await axiosClient.post<unknown>(`/billing/deposits/${validId}/reserve`, DepositReserveRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    const result = DepositSettlementResponseSchema.parse(response.data);
    if (result.contractId !== validId) throw new Error("Dolores returned a different deposit Contract.");
    return result;
  },
  async settleDepositDamage(
    contractId: string,
    input: {
      damageAmount: number;
      maintenanceTicketId?: string;
      decision: "NO_DAMAGE" | "DAMAGE" | "PARTIAL_DAMAGE";
      notes?: string;
    },
    files: File[],
  ) {
    const validId = ContractIdSchema.parse(contractId);
    validateEvidenceFiles(files, { min: 1, max: 1 });
    const data = DepositDamageRequestSchema.parse({
      damageAmount: input.damageAmount,
      ...(input.maintenanceTicketId === undefined ? {} : { maintenanceTicketId: input.maintenanceTicketId }),
      decision: input.decision,
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    });
    // Override axiosClient's shared JSON default; the browser adapter adds the
    // multipart boundary when it sends this FormData body.
    const response = await axiosClient.post<unknown>(
      `/billing/deposits/${validId}/settle-damage`,
      buildEvidenceForm(data, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const result = DepositSettlementResponseSchema.parse(response.data);
    if (result.contractId !== validId) throw new Error("Dolores returned a different deposit Contract.");
    return result;
  },
  async releaseDeposit(contractId: string, input: { idempotencyKey: string; reason: string }) {
    const validId = ContractIdSchema.parse(contractId);
    const response = await axiosClient.post<unknown>(`/billing/deposits/${validId}/release`, DepositReleaseRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    const result = DepositSettlementResponseSchema.parse(response.data);
    if (result.contractId !== validId) throw new Error("Dolores returned a different deposit Contract.");
    return result;
  },
  async createExport(input: BillingExportRequest) {
    const request = BillingExportRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/billing/exports", request, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return ExportJobResponseSchema.parse(response.data);
  },
  async getExportJob(jobId: string, signal?: AbortSignal) {
    const validId = ExportJobIdSchema.parse(jobId);
    const response = await axiosClient.get<unknown>(`/billing/exports/${encodeURIComponent(validId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const job = ExportJobResponseSchema.parse(response.data);
    if (job.id !== validId) throw new Error("Dolores returned an export job that does not match the requested ID.");
    return job;
  },
  async downloadExportContent(jobId: string, signal?: AbortSignal) {
    const validId = ExportJobIdSchema.parse(jobId);
    const response = await axiosClient.get<Blob>(`/billing/exports/${encodeURIComponent(validId)}/content`, {
      baseURL: DOLORES_API_BASE_URL,
      headers: { Accept: "*/*" },
      responseType: "blob",
      signal,
    });
    return response.data;
  },
  async getContractPreview(contractId: string, signal?: AbortSignal) {
    const validId = ContractIdSchema.parse(contractId);
    const response = await axiosClient.get<unknown>(
      `/billing/contracts/${encodeURIComponent(validId)}/preview`,
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    return ContractBillingPreviewResponseSchema.parse(response.data);
  },
  async changeInvoiceStatus(invoiceId: string, input: InvoiceStatusChangeRequest) {
    const validInvoiceId = InvoiceIdSchema.parse(invoiceId);
    const request = InvoiceStatusChangeRequestSchema.parse(input);
    await axiosClient.post<unknown>(
      invoicePath(validInvoiceId) + "/status",
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
  }
};
