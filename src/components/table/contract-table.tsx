import { TextLinkButton } from "@/components/button/text-link-button";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { type Contract } from "@/schema/contracts.schema";
import { CONTRACT_TABLE_HEADERS } from "@/components/table/constants/contract-table.constants";
import { DataTable, type DataTableColumn } from "./data-table";
import styles from "./data-table.module.css";

interface ContractTableProps {
  contracts: readonly Contract[];
  contractHref: (contractId: string) => string;
  draftStatusHref?: (contractId: string) => string;
  headerVariant?: "admin";
  ownerName?: (ownerId: string) => string;
  ownerHeader?: string;
  showContractIdColumn?: boolean;
  ownerHref?: (contractId: string) => string;
}

export function ContractTable({
  contracts,
  contractHref,
  draftStatusHref,
  headerVariant,
  ownerName,
  ownerHeader,
  showContractIdColumn = true,
  ownerHref,
}: ContractTableProps) {
  const renderOwner = (contract: Contract) => {
    const label = ownerName ? ownerName(contract.ownerId) : contract.ownerName?.trim() || "—";
    return ownerHref && label !== "—"
      ? <TextLinkButton href={ownerHref(contract.id)}>{label}</TextLinkButton>
      : label;
  };
  const renderPeriod = (contract: Contract) => {
    const displayDate = (value: string | null | undefined) => {
      if (!value) return "—";
      const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
    };
    return headerVariant === "admin"
      ? `${displayDate(contract.startDate)} – ${displayDate(contract.endDate)}`
      : `${contract.startDate ?? "—"} – ${contract.endDate ?? "—"}`;
  };

  const contractColumn: DataTableColumn<Contract> = {
    key: "contract",
    header: headerVariant === "admin" ? "Hợp đồng" : CONTRACT_TABLE_HEADERS.contract,
    render: (contract) => headerVariant === "admin"
      ? <strong><span title={contract.id} aria-label={contract.id}>{contract.id.slice(0, 8).toUpperCase()}</span></strong>
      : <TextLinkButton href={contractHref(contract.id)}><TruncatedId value={contract.id} /></TextLinkButton>,
  };
  const ownerColumn: DataTableColumn<Contract> = {
    key: "owner",
    header: headerVariant === "admin" ? "Khách hàng" : ownerHeader ?? (ownerName ? "Owner" : CONTRACT_TABLE_HEADERS.owner),
    render: renderOwner,
  };
  const periodColumn: DataTableColumn<Contract> = {
    key: "period",
    header: CONTRACT_TABLE_HEADERS.period,
    render: renderPeriod,
  };
  const typeColumn: DataTableColumn<Contract> = {
    key: "type",
    header: CONTRACT_TABLE_HEADERS.machineType,
    render: (contract) => headerVariant === "admin"
      ? contract.machineTypeSnapshot === "SMART_IOT" ? "Smart IoT"
        : contract.machineTypeSnapshot === "CONVENTIONAL" ? "Máy thường"
          : contract.machineTypeSnapshot ?? "—"
      : contract.machineTypeSnapshot ?? "—",
  };
  const statusColumn: DataTableColumn<Contract> = {
    key: "status",
    header: CONTRACT_TABLE_HEADERS.status,
    render: (contract) => {
      const label = contract.status === "ACTIVE" ? "Đang hiệu lực"
        : contract.status === "DRAFT" ? "Bản nháp"
          : contract.status === "TERMINATED" ? "Đã chấm dứt" : contract.status;
      const statusContent = <span className={styles.contractStatus} data-status={contract.status}>
        <span aria-hidden="true" className={styles.contractStatusDot} />
        {label}
      </span>;
      return contract.status === "DRAFT" && draftStatusHref
        ? <TextLinkButton href={draftStatusHref(contract.id)}>{statusContent}</TextLinkButton>
        : statusContent;
    },
  };
  const actionColumn: DataTableColumn<Contract> = {
    key: "action",
    header: "",
    render: (contract) => <ButtonBar
      href={contractHref(contract.id)}
      rollingLabel
      aria-label={`Mở hồ sơ hợp đồng ${contract.id}`}
    >Mở hồ sơ</ButtonBar>,
  };
  const columns: DataTableColumn<Contract>[] = headerVariant === "admin"
    ? [contractColumn, ownerColumn, typeColumn, statusColumn, actionColumn]
    : [contractColumn, ownerColumn, periodColumn, typeColumn, statusColumn, actionColumn];

  return (
    <DataTable
      variant="accounts"
      className={styles.contractTable}
      rows={contracts}
      rowKey={(contract) => contract.id}
      columns={columns.filter((column) => showContractIdColumn || column.key !== "contract")}

    />
  );
}
