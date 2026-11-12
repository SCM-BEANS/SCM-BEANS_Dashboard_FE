import type { GetServerSideProps } from "next";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { PATH_ADMIN } from "@/routes/path";

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const invoice = InvoiceIdSchema.safeParse(query.invoiceId);
  return { redirect: {
    destination: invoice.success ? PATH_ADMIN.INVOICE_DETAIL(invoice.data) : PATH_ADMIN.ROOT,
    permanent: false,
  } };
};

export default function RetiredReportsPage() { return null; }
