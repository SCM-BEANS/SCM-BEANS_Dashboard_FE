import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { getAccessTokenSubject } from "@/lib/auth-role";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function useOwnerSubject() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    const subject = token ? getAccessTokenSubject(token) : null;
    setOwnerId(ProfileIdSchema.safeParse(subject).success ? subject : null);
    setChecked(true);
  }, []);

  return { ownerId, checked };
}

export function QueryFeedback({
  loading,
  failed,
  empty,
  emptyText,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  emptyText: string;
}) {
  if (loading) {
    return <div className={styles.loadingNotice} role="status">{messages.LOADING}</div>;
  }
  if (failed) {
    return <div className={styles.errorNotice} role="alert">{messages.LOAD_ERROR}</div>;
  }
  if (empty) {
    return <div className={styles.emptyNotice} role="status">{emptyText}</div>;
  }
  return null;
}

export function DetailItem({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value === null || value === undefined || value === "" ? "—" : value}</dd>
    </div>
  );
}

export function statusLabel(status: string | null | undefined) {
  return status ? status.toLowerCase().replaceAll("_", " ") : "—";
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

export function formatMoney(value: number | null | undefined, currency = "VND") {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return value.toLocaleString("vi-VN") + " " + currency;
  }
}

export function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function UnavailableIdentity({ title }: { title: string }) {
  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}><h1 id="customer-screen-title">{title}</h1></header>
      <div className={styles.errorNotice} role="alert">{messages.IDENTITY_UNAVAILABLE}</div>
    </section>
  );
}
