import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { contractsApi } from "@/apis/contracts.api";
import { machinesApi } from "@/apis/machines.api";
import { ContractIdSchema, type Contract } from "@/schema/contracts.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, formatMoney, QueryFeedback, statusLabel, UnavailableIdentity, useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const PAGE_SIZE = 20;

function formatContractPeriod(startDate?: string | null, endDate?: string | null) {
  const formatPart = (value?: string | null) => {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? { year: match[1], dayMonth: `${match[3]}/${match[2]}` } : null;
  };
  const start = formatPart(startDate);
  const end = formatPart(endDate);
  if (!start && !end) return "—";
  if (!start) return `${end!.dayMonth}/${end!.year}`;
  if (!end) return `${start.dayMonth}/${start.year}`;
  return start.year === end.year
    ? `${start.dayMonth}–${end.dayMonth}/${end.year}`
    : `${start.dayMonth}/${start.year}–${end.dayMonth}/${end.year}`;
}

function contractStatusLabel(contract: Contract) {
  if (contract.status === "DRAFT") return "Chờ hiệu lực";
  if (contract.status === "TERMINATED") return "Đã kết thúc";
  if (!contract.endDate) return "Đang hiệu lực";

  const endDate = new Date(`${contract.endDate}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) return "Đang hiệu lực";
  const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / 86_400_000);
  if (daysRemaining < 0) return "Đã hết hạn";
  if (daysRemaining <= 31) return "Còn 1 tháng";
  return "Đang hiệu lực";
}

export function ContractsScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const { ownerId, checked } = useOwnerSubject();
  const [page, setPage] = useState(0);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const contractId = ContractIdSchema.safeParse(contractCandidate).success ? contractCandidate : null;
  const isList = sectionPath === "contracts";
  const list = useQuery({
    queryKey: ["owner-contracts", ownerId],
    queryFn: ({ signal }) => contractsApi.listByOwner(ownerId!, signal),
    enabled: Boolean(ownerId && isList),
  });
  const machines = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
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

  const contracts = list.data ?? [];
  const isListLoading = !list.isError && (list.isPending || machines.isPending);
  const visibleContracts = contracts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(contracts.length / PAGE_SIZE));
  const machineById = new Map((machines.data ?? []).map((machine) => [machine.id, machine] as const));
  const columns: readonly DataTableColumn<Contract>[] = [
    {
      key: "contract-id",
      header: messages.FIELD_CONTRACT_ID,
      render: (contract) => (
        <Link className={styles.tableLink} href={PATH_CUSTOMER.CONTRACT_DETAIL(contract.id)}>
          {contract.id} ›
        </Link>
      ),
    },
    {
      key: "machine",
      header: messages.CONTRACT_TABLE_MACHINE,
      render: (contract) => {
        const machine = contract.machineId ? machineById.get(contract.machineId) : undefined;
        const machineType = contract.machineTypeSnapshot ?? machine?.machineType;
        const modelName = machineType === "SMART_IOT" ? "Smart" : machineType === "CONVENTIONAL" ? "Classic" : "";
        return [modelName, machine?.serialNumber ?? contract.machineId ?? "—"].filter(Boolean).join(" ");
      },
    },
    {
      key: "machine-type",
      header: messages.FIELD_MACHINE_TYPE,
      render: (contract) => {
        const machineType = contract.machineTypeSnapshot ?? (contract.machineId ? machineById.get(contract.machineId)?.machineType : undefined);
        return machineType === "SMART_IOT" ? "Smart IoT" : machineType === "CONVENTIONAL" ? "Thông thường" : "—";
      },
    },
    {
      key: "term",
      header: messages.CONTRACT_TABLE_TERM,
      render: (contract) => formatContractPeriod(contract.startDate, contract.endDate),
    },
    {
      key: "rental-fee",
      header: messages.CONTRACT_TABLE_RENTAL_FEE,
      render: (contract) => {
        const fee = formatMoney(contract.monthlyRentalFee);
        if (fee === "—") return fee;
        return contract.paygUnitPrice && contract.paygUnitPrice > 0 ? `${fee} + PAYG` : `${fee} / tháng`;
      },
    },
    {
      key: "status",
      header: messages.FIELD_STATUS,
      render: (contract) => contractStatusLabel(contract),
    },
  ];

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
        <section className={styles.dataPanel} aria-label={messages.CONTRACTS_TITLE}>
          {isListLoading ? <div className={styles.loadingNotice} role="status">{messages.LOADING}</div> : null}
          {list.isError ? <div className={styles.errorNotice} role="alert">{messages.LOAD_ERROR}</div> : null}
          {!isListLoading && !list.isError && contracts.length === 0 ? (
            <div className={styles.emptyNotice} role="status">{messages.NO_CONTRACTS}</div>
          ) : null}
          {!isListLoading && !list.isError && contracts.length > 0 ? (
            <>
              <DataTable
                columns={columns}
                rows={visibleContracts}
                rowKey={(contract) => contract.id}
                variant="customer"
              />
              {totalPages > 1 ? (
                <div className={styles.pagination}>
                  <button className={styles.secondaryButton} disabled={page <= 0 || list.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">
                    {messages.PREVIOUS}
                  </button>
                  <span>{messages.PAGE} {page + 1} / {totalPages}</span>
                  <button className={styles.secondaryButton} disabled={page + 1 >= totalPages || list.isFetching} onClick={() => setPage((current) => current + 1)} type="button">
                    {messages.NEXT}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      )}
    </section>
  );
}
