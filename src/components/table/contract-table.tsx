import { TextLinkButton } from "@/components/button/text-link-button";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
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

  return (
    <DataTable
      variant="moderator"
      headerVariant={headerVariant}
      rows={contracts}
      rowKey={(contract) => contract.id}
      columns={[
        ...(showContractIdColumn ? [{
          key: "contract",
          header: CONTRACT_TABLE_HEADERS.contract,
          render: (contract: Contract) => (
            <TextLinkButton href={contractHref(contract.id)}><TruncatedId value={contract.id} /></TextLinkButton>
          ),
        }] : []),
        {
          key: "owner",
          header: ownerHeader ?? (ownerName ? "Owner" : CONTRACT_TABLE_HEADERS.owner),
          render: renderOwner,
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
