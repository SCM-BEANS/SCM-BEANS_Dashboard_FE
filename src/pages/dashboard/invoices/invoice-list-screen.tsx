import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function InvoiceListScreen({ period, back }: { period: string | null; back?: BackButtonDestination | null }) {
  const list = useQuery({
    queryKey: ["owner-invoices"],
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
  });
  const visibleInvoices = list.data?.filter((invoice) => !period || invoice.period.startsWith(period)) ?? [];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={period ? messages.INVOICE_PERIOD_TITLE : messages.INVOICES_TITLE}
        titleId="customer-screen-title"
        description={messages.INVOICES_DESCRIPTION}
        className={styles.pageHeading}
      />
      <QueryFeedback loading={list.isPending} failed={list.isError} empty={!visibleInvoices.length} emptyText={messages.NO_INVOICES} />
      {visibleInvoices.length > 0 && (
        <div className={styles.recordList}>
          {visibleInvoices.map((invoice) => (
            <article className={styles.recordCard} key={invoice.id}>
              <div>
                <h2>{invoice.period}</h2>
                <p>{messages.FIELD_STATUS}: {statusLabel(invoice.status)}</p>
                <p>{messages.FIELD_DUE_DATE}: {formatDate(invoice.dueDate)}</p>
              </div>
              <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
              <Link className={styles.secondaryLink} href={PATH_CUSTOMER.INVOICE_DETAIL(invoice.id)}>
                {messages.VIEW_DETAILS}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
