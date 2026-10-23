import axios from "axios";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { billingApi } from "@/apis/billing.api";
import { dashboardApi } from "@/apis/dashboard.api";
import { ButtonBar } from "@/components/button/button-bar";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { DashboardDateRangeSchema } from "@/schema/dashboard.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "./admin-shell";

const countFormatter = new Intl.NumberFormat("vi-VN");
const amountFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const REPORT_QUERY_KEY = ["dolores", "dashboard", "overview"] as const;
const INVOICE_QUERY_KEY = ["dolores", "billing", "invoices"] as const;

function queryString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return ADMIN_MESSAGES.OVERVIEW.INVALID_RESPONSE;
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return ADMIN_MESSAGES.OVERVIEW.FORBIDDEN;
  }
  if (axios.isAxiosError(error) && (error.response?.status === 502 || !error.response)) {
    return ADMIN_MESSAGES.OVERVIEW.UNAVAILABLE;
  }
  return ADMIN_MESSAGES.OVERVIEW.ERROR;
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
            <p>{errorMessage(overview.error)}</p>
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
          <div className={styles.tableScroll}>
            <table className={styles.operationsTable}>
              <thead><tr><th>{ADMIN_MESSAGES.OVERVIEW.DATE}</th><th>{ADMIN_MESSAGES.OVERVIEW.CUP_COUNT}</th></tr></thead>
              <tbody>
                {dailyUsage.map((day, index) => (
                  <tr key={(day.date || "unknown") + "-" + index}>
                    <td>{day.date || "—"}</td>
                    <td>{day.cups == null ? "—" : countFormatter.format(day.cups)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="rental-invoices" className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.INVOICES}</h2>
        <p className={styles.panelSubtitle}>{ADMIN_MESSAGES.REPORTS.NOTE}</p>
        {invoices.isPending && <p role="status">{ADMIN_MESSAGES.REPORTS.LOADING_INVOICES}</p>}
        {invoices.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{errorMessage(invoices.error)}</p>
            <button type="button" onClick={() => void invoices.refetch()}>{ADMIN_MESSAGES.REPORTS.RETRY}</button>
          </div>
        )}
        {invoices.data && rentalInvoices.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.REPORTS.EMPTY_INVOICES}</p>
        )}
        {invoices.data && rentalInvoices.length > 0 && (
          <div className={styles.tableScroll}>
            <table className={styles.operationsTable}>
              <thead>
                <tr>
                  <th>{ADMIN_MESSAGES.REPORTS.INVOICE_PERIOD}</th>
                  <th>{ADMIN_MESSAGES.REPORTS.OWNER_ID}</th>
                  <th>{ADMIN_MESSAGES.REPORTS.CONTRACT_ID}</th>
                  <th>{ADMIN_MESSAGES.REPORTS.AMOUNT}</th>
                  <th>{ADMIN_MESSAGES.REPORTS.STATUS}</th>
                  <th>{ADMIN_MESSAGES.REPORTS.CREATED}</th>
                </tr>
              </thead>
              <tbody>
                {rentalInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.period}</td>
                    <td>{invoice.ownerId}</td>
                    <td>{invoice.contractId}</td>
                    <td>{displayAmount(invoice.amount, invoice.currency)}</td>
                    <td>{invoice.status}</td>
                    <td>{invoice.createdAt || invoice.dueDate || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    <AdminActionBar>
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
    </AdminActionBar>
    </>
  );
}

export default function AdminReportsPage() {
  return <AdminShell><ReportContent /></AdminShell>;
}
