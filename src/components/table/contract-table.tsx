import { TextLinkButton } from "@/components/button/text-link-button";
import { type Contract } from "@/schema/contracts.schema";
import { CONTRACT_TABLE_HEADERS } from "@/components/table/constants/contract-table.constants";
import { DataTable, type DataTableColumn } from "./data-table";
import styles from "./data-table.module.css";

interface ContractTableProps {
  contracts: readonly Contract[];
  contractHref: (contractId: string) => string;
  draftStatusHref?: (contractId: string) => string;
  ownerName?: (ownerId: string) => string;
}

export function ContractTable({
  contracts,
  contractHref,
  draftStatusHref,
  ownerName,
}: ContractTableProps) {
  const renderOwner = (contract: Contract) => {
    return ownerName ? ownerName(contract.ownerId) : contract.ownerName?.trim() || "—";
  };
  const contractColumn: DataTableColumn<Contract> = {
    key: "contract",
    header: "Hợp đồng",
    render: (contract) => <TextLinkButton href={contractHref(contract.id)} title={contract.id}>{contract.id.slice(0, 8).toUpperCase()}</TextLinkButton>,
  };
  const ownerColumn: DataTableColumn<Contract> = {
    key: "owner",
    header: "Khách hàng",
    render: renderOwner,
  };
  const typeColumn: DataTableColumn<Contract> = {
    key: "type",
    header: CONTRACT_TABLE_HEADERS.machineType,
    render: (contract) => contract.machineTypeSnapshot === "SMART_IOT" ? "Smart IoT"
      : contract.machineTypeSnapshot === "CONVENTIONAL" ? "Máy thường"
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
  const columns: DataTableColumn<Contract>[] = [contractColumn, ownerColumn, typeColumn, statusColumn];

  return (
    <DataTable
      rows={contracts}
      rowKey={(contract) => contract.id}
      columns={columns}
    />
  );
}
