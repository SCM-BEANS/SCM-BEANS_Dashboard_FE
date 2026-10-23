import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { InvoicesSchema } from "@/schema/billing.schema";

export const billingApi = {
  async listInvoices(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/billing/invoices", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return InvoicesSchema.parse(response.data);
  },
};
