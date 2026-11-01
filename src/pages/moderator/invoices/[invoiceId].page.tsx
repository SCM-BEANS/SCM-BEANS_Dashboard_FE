import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell } from "../moderator-shell";
import { ModeratorInvoiceDetailScreen } from "./invoice-detail-screen";

interface ModeratorInvoiceDetailPageProps {
  invoiceId: string;
}

export const getServerSideProps: GetServerSideProps<ModeratorInvoiceDetailPageProps> = async ({ params }) => {
  const invoiceId = params?.invoiceId;
  if (typeof invoiceId !== "string" || !InvoiceIdSchema.safeParse(invoiceId).success) {
    return { notFound: true };
  }
  return { props: { invoiceId } };
};

export default function ModeratorInvoiceDetailPage({
  invoiceId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.INVOICES}>
      <ModeratorInvoiceDetailScreen invoiceId={invoiceId} />
    </ModeratorShell>
  );
}
