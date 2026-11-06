import type { ReactNode } from "react";
import styles from "./status-badge.module.css";

export type StatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const SUCCESS_STATUSES = new Set([
  "ACTIVE", "PAID", "DELIVERED", "APPROVED", "APPROVED_REFUND", "COMPLETED", "CONFIRMED", "CLOSED",
  "CANCELLED_REFUNDED", "PAYOUT_RECORDED", "OWNER_CONFIRMED", "RECORDED",
  "DISPUTE_CONFIRMED", "DISPUTE_RETRY", "REFUNDED", "EXCESS_RETURNED",
  "EXCESS_INCLUDED_IN_REFUND", "IN_WAREHOUSE", "AVAILABLE_FOR_RENT", "ACKNOWLEDGED",
]);
const WARNING_STATUSES = new Set([
  "DRAFT", "PENDING", "PENDING_APPROVAL", "PENDING_PAYMENT", "PARTIALLY_PAID", "WAITING_STOCK",
  "CANCELLATION_REFUND_PENDING", "SUBMITTED", "REQUESTED", "REFUND_PENDING", "UNPAID",
  "PENDING_ACTIVATION", "PENDING_QA", "UNDER_MAINTENANCE", "REFURBISHING", "QUEUED", "RESCHEDULE_REQUESTED",
  "OPEN", "IN_PROGRESS", "IN_REVIEW",
]);
const DANGER_STATUSES = new Set([
  "DISABLED", "INACTIVE", "REJECTED", "REJECTED_PROOF", "FAILED", "DISPUTED", "NO_FUNDS",
  "OVERDUE", "EXPIRED", "RETIRED", "CANCELLED", "TERMINATED", "OVERDUE_REVIEW",
]);
const INFO_STATUSES = new Set(["DEPLOYED_CONTRACT_OWNER", "DEPLOYED_STORE_OWNER", "PROCESSING", "TRIAGED"]);

function statusTone(status: string | null | undefined): StatusBadgeTone {
  const normalized = status?.trim().toUpperCase();
  if (normalized && SUCCESS_STATUSES.has(normalized)) return "success";
  if (normalized && WARNING_STATUSES.has(normalized)) return "warning";
  if (normalized && DANGER_STATUSES.has(normalized)) return "danger";
  if (normalized && INFO_STATUSES.has(normalized)) return "info";
  return "neutral";
}

export function StatusBadge({
  children,
  status,
  tone,
}: {
  children: ReactNode;
  status?: string | null;
  tone?: StatusBadgeTone;
}) {
  const resolvedTone = tone ?? statusTone(status);
  const toneClass = resolvedTone === "neutral" ? "" : styles[resolvedTone];
  return <span className={[styles.badge, toneClass].filter(Boolean).join(" ")}>{children}</span>;
}
