import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { billingApi } from "@/apis/billing.api";
import { dashboardApi } from "@/apis/dashboard.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { DataTable } from "@/components/table/data-table";
import { ButtonBar } from "@/components/button/button-bar";
import { ActionBar } from "@/components/action-bar/action-bar";
import { DashboardDateRangeSchema } from "@/schema/dashboard.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const countFormatter = new Intl.NumberFormat("vi-VN");
const amountFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const REPORT_QUERY_KEY = ["dolores", "dashboard", "overview"] as const;
const INVOICE_QUERY_KEY = ["dolores", "billing", "invoices"] as const;

function queryString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function displayAmount(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  return amountFormatter.format(value) + (currency ? " " + currency : "");
}

function ReportContent() {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(() => queryString(router.query.fromDate));
  const [toDate, setToDate] = useState(() => queryString(router.query.toDate));
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    setFromDate(queryString(router.query.fromDate));
    setToDate(queryString(router.query.toDate));
    setRangeError("");
  }, [router.isReady, router.query.fromDate, router.query.toDate]);

  const hasDateQuery =
    router.query.fromDate !== undefined || router.query.toDate !== undefined;
  const parsedRange = hasDateQuery
    ? DashboardDateRangeSchema.safeParse({
        fromDate: router.query.fromDate,
        toDate: router.query.toDate,
      })
    : null;
  const rangeIsValid = !hasDateQuery || Boolean(parsedRange?.success);
  const validRange = parsedRange?.success ? parsedRange.data : undefined;

  const overview = useQuery({
    queryKey: [...REPORT_QUERY_KEY, validRange ?? "default"],
    queryFn: ({ signal }) => dashboardApi.getOverview(
      signal,
      validRange?.fromDate,
      validRange?.toDate,
    ),
    enabled: router.isReady && rangeIsValid,
  });
  const invoices = useQuery({
    queryKey: INVOICE_QUERY_KEY,
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
  });

  const applyRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = DashboardDateRangeSchema.safeParse({ fromDate, toDate });
    if (!parsed.success) {
      setRangeError(
        fromDate.trim() === "" || toDate.trim() === ""
          ? ADMIN_MESSAGES.REPORTS.RANGE_REQUIRED
          : ADMIN_MESSAGES.REPORTS.INVALID_RANGE,
      );
      return;
    }
    setRangeError("");
    void router.push(
      { pathname: PATH_ADMIN.REPORTS, query: parsed.data },
      undefined,
      { shallow: true },
    );
  };

  const useDefaultRange = () => {
    setRangeError("");
    setFromDate("");
    setToDate("");
    void router.push(PATH_ADMIN.REPORTS, undefined, { shallow: true });
  };

  const finance = overview.data?.financialMetrics ?? [];
  const dailyUsage = overview.data?.operationalMetrics?.dailyAcceptedCupUsage ?? [];
  const rentalInvoices = (invoices.data ?? []).filter(
    (invoice) => invoice.type.toUpperCase() === "RENTAL",
  );

  return (
    <>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{ADMIN_MESSAGES.REPORTS.TITLE}</h1>
        <p>{ADMIN_MESSAGES.REPORTS.DESCRIPTION}</p>
      </div>

      <form id="report-range-form" className={styles.operationsFilters} onSubmit={applyRange}>
        <label>
          {ADMIN_MESSAGES.REPORTS.FROM}
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          {ADMIN_MESSAGES.REPORTS.TO}
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
      </form>
      {rangeError && <p className={styles.accountInlineWarning} role="alert">{rangeError}</p>}
      {hasDateQuery && !rangeIsValid && (
        <p className={styles.accountInlineWarning} role="alert">{ADMIN_MESSAGES.REPORTS.INVALID_RANGE}</p>
      )}

      <section className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.FINANCIAL}</h2>
        {overview.isPending && <p role="status">{ADMIN_MESSAGES.OVERVIEW.LOADING}</p>}
        {overview.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{getApiErrorMessage(overview.error)}</p>
            <button type="button" onClick={() => void overview.refetch()}>{ADMIN_MESSAGES.REPORTS.RETRY}</button>
          </div>
        )}
        {overview.data && finance.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.REPORTS.NO_FINANCIAL}</p>
        )}
        {overview.data && finance.length > 0 && (
          <div className={styles.financeGrid}>
            {finance.map((metric, index) => (
              <div key={metric.currency || index}>
                <strong>{metric.currency || "—"}</strong>
                <span>{ADMIN_MESSAGES.OVERVIEW.ISSUED}: {displayAmount(metric.amountIssued, metric.currency)}</span>
                <span>{ADMIN_MESSAGES.OVERVIEW.COLLECTED}: {displayAmount(metric.amountCollected, metric.currency)}</span>
                <span>{ADMIN_MESSAGES.OVERVIEW.OUTSTANDING}: {displayAmount(metric.outstandingBalance, metric.currency)}</span>
                <span>{ADMIN_MESSAGES.OVERVIEW.OVERDUE}: {displayAmount(metric.overdueBalance, metric.currency)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.USAGE}</h2>
        {overview.data && (
          <p className={styles.panelSubtitle}>
            {validRange
              ? validRange.fromDate + " – " + validRange.toDate
              : (overview.data.usagePeriodStart || "—") + " – " + (overview.data.usagePeriodEnd || "—")}
          </p>
        )}
        {overview.data && dailyUsage.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_DAILY_DATA}</p>
        )}
        {overview.data && dailyUsage.length > 0 && (
          <DataTable
            rows={dailyUsage}
            rowKey={(day, index) => `${day.date || "unknown"}-${index}`}
            columns={[
              { key: "date", header: ADMIN_MESSAGES.OVERVIEW.DATE, render: (day) => day.date || "—" },
              { key: "cups", header: ADMIN_MESSAGES.OVERVIEW.CUP_COUNT, render: (day) => day.cups == null ? "—" : countFormatter.format(day.cups) },
            ]}
          />
        )}
      </section>

      <section id="rental-invoices" className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.INVOICES}</h2>
        <p className={styles.panelSubtitle}>{ADMIN_MESSAGES.REPORTS.NOTE}</p>
        {invoices.isPending && <p role="status">{ADMIN_MESSAGES.REPORTS.LOADING_INVOICES}</p>}
        {invoices.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{getApiErrorMessage(invoices.error)}</p>
            <button type="button" onClick={() => void invoices.refetch()}>{ADMIN_MESSAGES.REPORTS.RETRY}</button>
          </div>
        )}
        {invoices.data && rentalInvoices.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.REPORTS.EMPTY_INVOICES}</p>
        )}
        {invoices.data && rentalInvoices.length > 0 && (
          <DataTable
            rows={rentalInvoices}
            rowKey={(invoice) => invoice.id}
            columns={[
              { key: "period", header: ADMIN_MESSAGES.REPORTS.INVOICE_PERIOD, render: (invoice) => invoice.period },
              { key: "owner", header: ADMIN_MESSAGES.REPORTS.OWNER_ID, render: (invoice) => invoice.ownerId },
              { key: "contract", header: ADMIN_MESSAGES.REPORTS.CONTRACT_ID, render: (invoice) => invoice.contractId },
              { key: "amount", header: ADMIN_MESSAGES.REPORTS.AMOUNT, render: (invoice) => displayAmount(invoice.amount, invoice.currency) },
              { key: "status", header: ADMIN_MESSAGES.REPORTS.STATUS, render: (invoice) => invoice.status },
              { key: "created", header: ADMIN_MESSAGES.REPORTS.CREATED, render: (invoice) => invoice.createdAt || invoice.dueDate || "—" },
            ]}
          />
        )}
      </section>
    </div>
    <ActionBar>
      <ButtonBar type="submit" form="report-range-form">
        {ADMIN_MESSAGES.REPORTS.APPLY}
      </ButtonBar>
      <ButtonBar type="button" onClick={useDefaultRange}>
        {ADMIN_MESSAGES.REPORTS.ALL_PERIODS}
      </ButtonBar>
      <ButtonBar href="#rental-invoices">
        {ADMIN_MESSAGES.REPORTS.INVOICES}
      </ButtonBar>
      <ButtonBar
        type="button"
        disabled={overview.isFetching || invoices.isFetching}
        onClick={() => void Promise.all([overview.refetch(), invoices.refetch()])}
      >
        {ADMIN_MESSAGES.REPORTS.RETRY}
      </ButtonBar>
    </ActionBar>
    </>
  );
}

export default function AdminReportsPage() {
  return <AdminShell><ReportContent /></AdminShell>;
}
