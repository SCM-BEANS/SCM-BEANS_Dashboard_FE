import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { contractsApi } from "@/apis/contracts.api";
import { profilesApi } from "@/apis/profiles.api";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, formatMoney, QueryFeedback, statusLabel, UnavailableIdentity, useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function ContractsScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const { ownerId, checked } = useOwnerSubject();
  const [page, setPage] = useState(0);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const contractId = ContractIdSchema.safeParse(contractCandidate).success ? contractCandidate : null;
  const isList = sectionPath === "contracts";
  const list = useQuery({
    queryKey: ["owner-contracts", ownerId, page],
    queryFn: ({ signal }) => profilesApi.getContracts(ownerId!, page, 20, signal),
    enabled: Boolean(ownerId && isList),
  });
  const detail = useQuery({
    queryKey: ["owner-contract", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId!, signal),
    enabled: Boolean(contractId),
  });

  if (!checked && isList) {
    return (
      <section className={styles.pageContent} aria-labelledby="customer-screen-title">
        <BackButtonHeading title={messages.CONTRACTS_TITLE} titleId="customer-screen-title" className={styles.pageHeading} back={null} />
        <div className={styles.loadingNotice} role="status">{messages.LOADING}</div>
      </section>
    );
  }
  if (!ownerId && isList) {
    return <UnavailableIdentity title={messages.CONTRACTS_TITLE} />;
  }

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={contractId ? messages.CONTRACT_DETAIL_TITLE : messages.CONTRACTS_TITLE}
        titleId="customer-screen-title"
        description={messages.CONTRACTS_DESCRIPTION}
        className={styles.pageHeading}
      />
      {contractId ? (
        <>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_CONTRACTS} />
          {detail.data ? (
            <dl className={styles.detailGrid}>
              <DetailItem label={messages.FIELD_CONTRACT_ID} value={detail.data.id} />
              <DetailItem label={messages.FIELD_MACHINE_ID} value={detail.data.machineId} />
              <DetailItem label={messages.FIELD_STATUS} value={statusLabel(detail.data.status)} />
              <DetailItem label={messages.FIELD_START_DATE} value={formatDate(detail.data.startDate)} />
              <DetailItem label={messages.FIELD_END_DATE} value={formatDate(detail.data.endDate)} />
              <DetailItem label={messages.FIELD_MONTHLY_FEE} value={formatMoney(detail.data.monthlyRentalFee)} />
              <DetailItem label={messages.FIELD_DEPOSIT} value={formatMoney(detail.data.depositAmount)} />
            </dl>
          ) : null}
        </>
      ) : (
        <>
          <QueryFeedback
            loading={list.isPending}
            failed={list.isError}
            empty={!list.data?.items.length}
            emptyText={messages.NO_CONTRACTS}
          />
          {list.data?.items.length ? (
            <>
              <div className={styles.recordList}>
                {list.data.items.map((contract, index) => {
                  const id = contract.contractId ?? contract.id;
                  return (
                    <article className={styles.recordCard} key={id ?? "contract-" + index}>
                      <div>
                        <h2>{messages.FIELD_CONTRACT_ID}: {id ?? "—"}</h2>
                        <p>{messages.FIELD_MACHINE_ID}: {contract.machineId ?? "—"}</p>
                        <p>{messages.FIELD_STATUS}: {statusLabel(contract.status)}</p>
                        <p>{formatDate(contract.startDate)} – {formatDate(contract.endDate)}</p>
                      </div>
                      {id ? <Link className={styles.secondaryLink} href={PATH_CUSTOMER.CONTRACT_DETAIL(id)}>{messages.VIEW_DETAILS}</Link> : null}
                    </article>
                  );
                })}
              </div>
              <div className={styles.pagination}>
                <button className={styles.secondaryButton} disabled={page <= 0 || list.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">
                  {messages.PREVIOUS}
                </button>
                <span>{messages.PAGE} {page + 1} / {Math.max(1, list.data.totalPages)}</span>
                <button className={styles.secondaryButton} disabled={page + 1 >= list.data.totalPages || list.isFetching} onClick={() => setPage((current) => current + 1)} type="button">
                  {messages.NEXT}
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
