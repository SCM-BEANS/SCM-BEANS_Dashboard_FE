import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  InvoiceIdSchema,
  InvoicesSchema,
  ModeratorInvoiceSchema,
  ModeratorInvoicesSchema,
  PaymentProofIdSchema,
  PaymentProofsSchema,
} from "@/schema/billing.schema";

const invoicePath = (id: string) =>
  "/billing/invoices/" + encodeURIComponent(InvoiceIdSchema.parse(id));

const proofContentPath = (id: string) =>
  "/billing/payment-proofs/" + encodeURIComponent(PaymentProofIdSchema.parse(id)) + "/content";

export const billingApi = {
  async listInvoices(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return InvoicesSchema.parse(response.data);
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

  async downloadPaymentProofContent(proofId: string, signal?: AbortSignal) {
    const response = await axiosClient.get<Blob>(proofContentPath(proofId), {
      baseURL: DOLORES_API_BASE_URL,
      headers: { Accept: "*/*" },
      responseType: "blob",
      signal,
    });
    return response.data;
  },
};
