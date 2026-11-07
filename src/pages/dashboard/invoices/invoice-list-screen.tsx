import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildInvoiceExportActions } from "@/components/action-bar/entity-page-actions";
import { getApiErrorMessage } from "@/lib/api-errors";
import { billingApi } from "@/apis/billing.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function InvoiceListScreen({ period, back }: { period: string | null; back?: BackButtonDestination | null }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["owner-invoices"],
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
  });
  const visibleInvoices = list.data?.filter((invoice) => !period || invoice.period.startsWith(period)) ?? [];

  const createExport = useMutation({ mutationFn: () => billingApi.createExport({ format: "CSV", invoiceIds: visibleInvoices.map((invoice) => invoice.id) }), onSuccess: (job) => setJobId(job.id) });
  const job = useQuery({ queryKey: ["owner", "billing-export", jobId], queryFn: ({ signal }) => billingApi.getExportJob(jobId!, signal), enabled: Boolean(jobId), refetchInterval: (query) => ["QUEUED", "PROCESSING"].includes(query.state.data?.status ?? "") ? 3000 : false });
  const download = useMutation({ mutationFn: () => billingApi.downloadExportContent(jobId!), onSuccess: (blob) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "dolores-invoices.csv"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); } });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={period ? messages.INVOICE_PERIOD_TITLE : messages.INVOICES_TITLE}
        titleId="customer-screen-title"
        description={messages.INVOICES_DESCRIPTION}
        className={styles.pageHeading}
      />
      <PageActions actions={buildInvoiceExportActions({ count: visibleInvoices.length, loading: list.isFetching, pending: createExport.isPending, onExport: () => createExport.mutate() })} />
      {createExport.isError && <p role="alert">{getApiErrorMessage(createExport.error)}</p>}
      {jobId && <div role="status"><p>Trạng thái xuất: {job.data?.status ?? "Đang tải…"}</p>{job.isError && <p role="alert">{getApiErrorMessage(job.error)}</p>}{job.data?.status === "FAILED" && <p role="alert">{job.data.message || "Không thể tạo file xuất."}</p>}{job.data?.status === "COMPLETED" && <button type="button" disabled={download.isPending} onClick={() => download.mutate()}>Tải file hóa đơn</button>}{download.isError && <p role="alert">{getApiErrorMessage(download.error)}</p>}</div>}
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
