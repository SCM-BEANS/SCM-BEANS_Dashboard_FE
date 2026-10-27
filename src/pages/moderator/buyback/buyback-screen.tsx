import { useQuery } from "@tanstack/react-query";

import { buybacksApi } from "@/apis/buybacks.api";

import { BuybackIdSchema, type BuybackCase } from "@/schema/buybacks.schema";

import { getApiErrorMessage } from "@/lib/api-errors";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

function amountText(value: number | null | undefined, currency: string): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 }).format(value) + " " + currency;
}

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {messages.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

export function ModeratorBuybackScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "buyback" || sectionPath === "buyback/list";
  const requestedId = isList ? "" : sectionPath.slice("buyback/".length);
  const validId = BuybackIdSchema.safeParse(requestedId).success ? requestedId : "";
  const buyback = useQuery({
    queryKey: ["dolores", "moderator", "buybacks", validId],
    queryFn: ({ signal }) => buybacksApi.getById(validId, signal),
    enabled: Boolean(validId),
  });

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading title={messages.BUYBACK_TITLE} description={messages.BUYBACK_DESCRIPTION} />
      {isList ? (
        <p className={styles.pendingNotice} role="status">{messages.BUYBACK_LIST_UNAVAILABLE}</p>
      ) : validId ? (
        <>
          <QueryFeedback query={buyback} loadingMessage={messages.LOADING_BUYBACK} />
          {buyback.data && !buyback.isError && <BuybackDetails buyback={buyback.data} />}
        </>
      ) : (
        <p className={styles.pendingNotice} role="status">{messages.BUYBACK_LEGACY_ID}</p>
      )}
    </div>
  );
}

function BuybackDetails({ buyback }: { buyback: BuybackCase }) {
  return (
    <dl className={styles.detailGrid}>
      <DetailField label={messages.BUYBACK_ID} value={buyback.id} />
      <DetailField label={messages.BUYBACK_TENANT} value={buyback.tenantId} />
      <DetailField label={messages.BUYBACK_CONTRACT} value={buyback.contractId} />
      <DetailField label={messages.BUYBACK_MACHINE} value={buyback.machineId} />
      <DetailField label={messages.BUYBACK_STATUS} value={buyback.status} />
      <DetailField label={messages.BUYBACK_REQUESTED_PRICE} value={amountText(buyback.requestedPrice, buyback.currency)} />
      <DetailField label={messages.BUYBACK_APPROVED_PRICE} value={amountText(buyback.approvedPrice, buyback.currency)} />
      <DetailField label={messages.BUYBACK_CURRENCY} value={buyback.currency} />
      <DetailField label={messages.BUYBACK_REASON} value={buyback.reason} />
      <DetailField label={messages.BUYBACK_REQUESTED_AT} value={buyback.requestedAt} />
      <DetailField label={messages.BUYBACK_AGREEMENT} value={buyback.externalAgreementReference} />
      {buyback.collectionEvidence != null && (
        <DetailField label={messages.BUYBACK_COLLECTION_EVIDENCE} value={messages.BUYBACK_EVIDENCE_AVAILABLE} />
      )}
    </dl>
  );
}
