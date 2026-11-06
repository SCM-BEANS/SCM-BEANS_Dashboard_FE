import { TextLinkButton } from "@/components/button/text-link-button";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { type Contract } from "@/schema/contracts.schema";
import { CONTRACT_TABLE_HEADERS } from "@/components/table/constants/contract-table.constants";
import { DataTable } from "./data-table";

interface ContractTableProps {
  contracts: readonly Contract[];
  contractHref: (contractId: string) => string;
  draftStatusHref?: (contractId: string) => string;
  headerVariant?: "admin";
  ownerName?: (ownerId: string) => string;
  ownerHeader?: string;
}

export function ContractTable({ contracts, contractHref, draftStatusHref, headerVariant, ownerName, ownerHeader }: ContractTableProps) {
  return (
    <DataTable
      variant="moderator"
      headerVariant={headerVariant}
      rows={contracts}
      rowKey={(contract) => contract.id}
      columns={[
        {
          key: "contract",
          header: CONTRACT_TABLE_HEADERS.contract,
          render: (contract) => (
            <TextLinkButton href={contractHref(contract.id)}>{contract.id}</TextLinkButton>
          ),
        },
        {
          key: "owner",
          header: ownerName ? ownerHeader ?? "Owner" : CONTRACT_TABLE_HEADERS.owner,
          render: (contract) => ownerName ? ownerName(contract.ownerId) : contract.ownerId,
        },
        {
          key: "period",
          header: CONTRACT_TABLE_HEADERS.period,
          render: (contract) => `${contract.startDate ?? "—"} – ${contract.endDate ?? "—"}`,
        },
        {
          key: "status",
          header: CONTRACT_TABLE_HEADERS.status,
          render: (contract) => {
            const label = headerVariant === "admin"
              ? <StatusBadge status={contract.status}>{contract.status}</StatusBadge>
              : contract.status;
            return contract.status === "DRAFT" && draftStatusHref
              ? <TextLinkButton href={draftStatusHref(contract.id)}>{label}</TextLinkButton>
              : label;
          },
        },
        {
          key: "type",
          header: CONTRACT_TABLE_HEADERS.machineType,
          render: (contract) => contract.machineTypeSnapshot ?? "—",
        },
      ]}
    />
  );
}
