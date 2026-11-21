import type { ReactNode } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import type { Contract } from "@/schema/contracts.schema";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { CONTRACT_TABLE_HEADERS } from "@/components/table/constants/contract-table.constants";
import { DataTable, type DataTableColumn } from "./data-table";
import styles from "./data-table.module.css";

interface ContractTableProps {
  contracts: readonly Contract[];
  contractHref: (contractId: string) => string;
  installationRequestHref?: (contractId: string) => string;
  ownerName?: (ownerId: string) => string;
  machineLabel?: (contract: Contract) => ReactNode;
  machineTypeLabel?: (contract: Contract) => string;
  statusLabel?: (contract: Contract) => string;
  contractHeader?: string;
}

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

export function ContractTable({
  contracts,
  contractHref,
  installationRequestHref,
  ownerName,
  machineLabel,
  machineTypeLabel,
  statusLabel,
  contractHeader,
}: ContractTableProps) {
  const contractColumn: DataTableColumn<Contract> = {
    key: "contract",
    header: contractHeader ?? CONTRACT_TABLE_HEADERS.contract,
    kind: "code",
    noWrap: true,
    render: (contract) => <TextLinkButton href={contractHref(contract.id)} title={contract.id}>{contract.id.slice(0, 8).toUpperCase()}</TextLinkButton>,
  };
  const ownerColumn: DataTableColumn<Contract> = {
    key: "owner",
    header: CONTRACT_TABLE_HEADERS.owner,
    kind: "name",
    render: (contract) => ownerName ? ownerName(contract.ownerId) : contract.ownerName?.trim() || "—",
  };
  const machineColumn: DataTableColumn<Contract> = {
    key: "machine",
    header: CONTRACT_TABLE_HEADERS.machine,
    kind: "code",
    noWrap: true,
    render: (contract) => machineLabel?.(contract) ?? (contract.machineId ? <TruncatedId value={contract.machineId} /> : "—"),
  };
  const typeColumn: DataTableColumn<Contract> = {
    key: "type",
    header: CONTRACT_TABLE_HEADERS.machineType,
    render: (contract) => machineTypeLabel?.(contract) ?? (contract.machineTypeSnapshot === "SMART_IOT" ? "Smart IoT"
      : contract.machineTypeSnapshot === "CONVENTIONAL" ? "Máy thường" : "—"),
  };
  const termColumn: DataTableColumn<Contract> = {
    key: "term",
    header: CONTRACT_TABLE_HEADERS.period,
    kind: "date",
    noWrap: true,
    render: (contract) => formatContractPeriod(contract.startDate, contract.endDate),
  };
  const statusColumn: DataTableColumn<Contract> = {
    key: "status",
    header: CONTRACT_TABLE_HEADERS.status,
    kind: "status",
    render: (contract) => {
      const label = statusLabel?.(contract) ?? (contract.status === "ACTIVE" ? "Đang hiệu lực"
        : contract.status === "DRAFT" ? "Bản nháp"
          : contract.status === "TERMINATED" ? "Đã chấm dứt" : "—");
      return <span className={styles.contractStatus} data-status={contract.status}>
        <span aria-hidden="true" className={styles.contractStatusDot} />
        {label}
      </span>;
    },
  };
  const columns: DataTableColumn<Contract>[] = [contractColumn, ownerColumn, machineColumn, typeColumn, termColumn, statusColumn];
  if (installationRequestHref) columns.push({
    key: "actions",
    header: "Thao tác",
    kind: "actions",
    width: "144px",
    minWidth: "144px",
    align: "right",
    render: (contract) => contract.status === "DRAFT"
        ? <ButtonBar href={installationRequestHref(contract.id)}>Cần giao lệnh lắp đặt</ButtonBar>
        : "—",
  });

  return (
    <div className={styles.contractTable}>
      <DataTable
        rows={contracts}
        rowKey={(contract) => contract.id}
        columns={columns}
      />
    </div>
  );
}
