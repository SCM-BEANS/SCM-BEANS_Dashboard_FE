import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { type Contract } from "@/schema/contracts.schema";
import { CONTRACT_TABLE_HEADERS } from "@/components/table/constants/contract-table.constants";
import { DataTable, type DataTableColumn } from "./data-table";
import styles from "./data-table.module.css";

interface ContractTableProps {
  contracts: readonly Contract[];
  contractHref: (contractId: string) => string;
  installationRequestHref?: (contractId: string) => string;
  ownerName?: (ownerId: string) => string;
}

export function ContractTable({
  contracts,
  contractHref,
  installationRequestHref,
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
      return <span className={styles.contractStatus} data-status={contract.status}>
        <span aria-hidden="true" className={styles.contractStatusDot} />
        {label}
      </span>;
    },
  };
  const columns: DataTableColumn<Contract>[] = [contractColumn, ownerColumn, typeColumn, statusColumn];
  if (installationRequestHref) {
    columns.push({
      key: "actions",
      header: "Thao tác",
      align: "right",
      render: (contract) => contract.status === "DRAFT"
        ? <ButtonBar className={styles.contractDraftAction} href={installationRequestHref(contract.id)}>Cần giao lệnh lắp đặt</ButtonBar>
        : "—",
    });
  }

  return (
    <div className={installationRequestHref ? styles.contractTable : undefined}>
      <DataTable
        rows={contracts}
        rowKey={(contract) => contract.id}
        columns={columns}
      />
    </div>
  );
}
