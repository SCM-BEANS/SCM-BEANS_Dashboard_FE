import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { ContractIdSchema } from "@/schema/contracts.schema";
import {
  BillingExportRequestSchema,
  ContractBillingPreviewResponseSchema,
  ExportJobIdSchema,
  ExportJobResponseSchema,
  InvoiceListParamsSchema,
  InvoiceIdSchema,
  InvoicesSchema,
  ModeratorInvoiceSchema,
  ModeratorInvoicesSchema,
  PaymentProofIdSchema,
  PaymentProofsSchema,
  InvoiceLineItemsSchema,
  InvoiceSchema,
  PaymentProofSubmitResponseSchema,
  PaymentProofReviewRequestSchema,
  InvoiceStatusChangeRequestSchema,
  type PaymentProofReviewRequest,
  type InvoiceStatusChangeRequest,
  type BillingExportRequest,
  type InvoiceListParams,
} from "@/schema/billing.schema";

const invoicePath = (id: string) =>
  "/billing/invoices/" + encodeURIComponent(InvoiceIdSchema.parse(id));

const proofContentPath = (id: string) =>
  "/billing/payment-proofs/" + encodeURIComponent(PaymentProofIdSchema.parse(id)) + "/content";

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

export const billingApi = {
  async listInvoices(signal?: AbortSignal) {
    return (await fetchInvoicePage({}, signal)).items;
  },

  async listInvoicesPage(params: InvoiceListParams = {}, signal?: AbortSignal) {
    return fetchInvoicePage(params, signal);
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

  async listInvoiceLineItems(id: string, signal?: AbortSignal) {
    const validId = InvoiceIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(invoicePath(validId) + "/line-items", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const items = InvoiceLineItemsSchema.parse(response.data);
    if (items.some((item) => item.invoiceId !== validId)) {
      throw new Error("Dolores returned an invoice line item for a different invoice.");
    }
    return items;
  },

  async listModeratorInvoices(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return ModeratorInvoicesSchema.parse(response.data);
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

  async listPaymentProofs(invoiceId: string, signal?: AbortSignal) {
    const validInvoiceId = InvoiceIdSchema.parse(invoiceId);
    const response = await axiosClient.get<unknown>(
      invoicePath(validInvoiceId) + "/payment-proofs",
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const proofs = PaymentProofsSchema.parse(response.data);
    if (proofs.some((proof) => proof.invoiceId !== validInvoiceId)) {
      throw new Error("Dolores returned a payment proof for a different invoice.");
    }
    return proofs;
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
    if (!input.file || input.file.size <= 0) {
      throw new Error("A non-empty payment proof file is required.");
    }
    if (!input.idempotencyKey.trim()) {
      throw new Error("An idempotency key is required.");
    }
    const form = new FormData();
    form.append("file", input.file);
    const response = await axiosClient.post<unknown>(
      invoicePath(invoiceId) + "/payment-proofs",
      form,
      {
        baseURL: DOLORES_API_BASE_URL,
        params: { amount: input.amount },
        headers: {
          "Idempotency-Key": input.idempotencyKey,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return PaymentProofSubmitResponseSchema.parse(response.data);
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

  async reviewPaymentProof(proofId: string, input: PaymentProofReviewRequest) {
    const validProofId = PaymentProofIdSchema.parse(proofId);
    const request = PaymentProofReviewRequestSchema.parse(input);
    await axiosClient.post<unknown>(
      `/billing/payment-proofs/${encodeURIComponent(validProofId)}/review`,
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
  },

  async changeInvoiceStatus(invoiceId: string, input: InvoiceStatusChangeRequest) {
    const validInvoiceId = InvoiceIdSchema.parse(invoiceId);
    const request = InvoiceStatusChangeRequestSchema.parse(input);
    await axiosClient.post<unknown>(
      invoicePath(validInvoiceId) + "/status",
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
  },
};
