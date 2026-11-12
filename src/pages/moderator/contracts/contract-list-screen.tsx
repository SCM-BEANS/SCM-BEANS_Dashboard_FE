import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ContractTable } from "@/components/table/contract-table";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { contractsApi } from "@/apis/contracts.api";
import { PATH_MODERATOR } from "@/routes/path";
import { getApiErrorMessage } from "@/lib/api-errors";
import { moderatorStyles as styles } from "../moderator-shell";
import { adminStyles } from "@/pages/admin/admin-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ADMIN_CONTRACT_LIST_DESCRIPTION, ADMIN_CONTRACT_LIST_TITLE } from "@/components/table/constants/contract-table.constants";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { ModeratorPageHeading } from "../moderator-page-heading";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
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
    return <p className={adminStyles.emptyText} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <ButtonBar type="button" onClick={() => void query.refetch()}>{MODERATOR_MESSAGES.READ_SCREENS.RETRY}</ButtonBar>
      </div>
    );
  }
  return null;
}

export function ContractListScreen() {
  const [searchDraft, setSearchDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const contracts = useQuery({
    queryKey: ["dolores", "contracts"],
    queryFn: ({ signal }) => contractsApi.list(signal),
    retry: false,
  });
  const filteredContracts = (contracts.data ?? []).filter((item) => {
    const searchable = [item.id, item.ownerId, item.ownerName ?? "", item.machineTypeSnapshot ?? ""]
      .join(" ")
      .toLocaleLowerCase();
    return (!search || searchable.includes(search.toLocaleLowerCase()))
      && (!statusFilter || item.status === statusFilter)
      && (!typeFilter || item.machineTypeSnapshot === typeFilter);
  });
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleContracts = filteredContracts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setStatusFilter(statusDraft);
    setTypeFilter(typeDraft);
    setPage(1);
  };

  return (
    <div className={`${styles.pageContent} ${adminStyles.userPage}`}>
      <div className={`${adminStyles.pageHeading} ${adminStyles.userPageHeading}`}>
        <div>
          <h1 id="moderator-contracts-title">{ADMIN_CONTRACT_LIST_TITLE}</h1>
          <p>{ADMIN_CONTRACT_LIST_DESCRIPTION}</p>
        </div>
        <ButtonBar variant="primary" href={PATH_MODERATOR.NEW_CONTRACT}>{T.CONTRACTS.CREATE}</ButtonBar>
      </div>
      <section className={`${adminStyles.panel} ${adminStyles.contractListPanel}`} aria-labelledby="moderator-contract-list-title">
          <div className={adminStyles.userSectionHeading}>
            <h2 id="moderator-contract-list-title">Danh sách hợp đồng</h2>
            {contracts.data && <span className={adminStyles.contractListCount}>{filteredContracts.length.toLocaleString("vi-VN")} hợp đồng</span>}
          </div>
          <QueryFeedback query={contracts} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACTS} />
          <TableFilters
            search={{ ariaLabel: "Tìm hợp đồng", maxLength: 100, placeholder: "Tìm mã hợp đồng hoặc khách hàng", value: searchDraft, onChange: setSearchDraft }}
            selects={[
              { id: "moderator-contract-status-filter", ariaLabel: "Lọc hợp đồng theo trạng thái", value: statusDraft, options: [
                { value: "", label: "Tất cả trạng thái" },
                { value: "ACTIVE", label: T.CONTRACTS.ACTIVE },
                { value: "DRAFT", label: T.CONTRACTS.DRAFT },
                { value: "TERMINATED", label: T.CONTRACTS.TERMINATED },
              ], onChange: setStatusDraft },
              { id: "moderator-contract-machine-type-filter", ariaLabel: "Lọc hợp đồng theo loại máy", value: typeDraft, options: [
                { value: "", label: "Tất cả loại máy" },
                { value: "CONVENTIONAL", label: T.MACHINES.CONVENTIONAL },
                { value: "SMART_IOT", label: T.MACHINES.SMART },
              ], onChange: setTypeDraft },
            ]}
            submitLabel="Tìm kiếm"
            onSubmit={submitFilters}
          />
          {contracts.data?.length === 0 && <p className={adminStyles.emptyText} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_CONTRACTS}</p>}
          {(contracts.data?.length ?? 0) > 0 && filteredContracts.length === 0 && <p className={adminStyles.emptyText}>Không tìm thấy hợp đồng phù hợp bộ lọc.</p>}
          {visibleContracts.length > 0 && <ContractTable
            contracts={visibleContracts}
            headerVariant="admin"
            contractHref={PATH_MODERATOR.CONTRACT_DETAIL}
            draftStatusHref={PATH_MODERATOR.CONTRACT_INSTALLATION_REQUEST}
            ownerHeader="Khách hàng"
          />}
          {filteredContracts.length > 0 && <div className={adminStyles.accountPagination}>
            <span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredContracts.length)} / {filteredContracts.length} hợp đồng</span>
            <div>
              <button className={adminStyles.accountSecondaryButton} type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trang trước</button>
              <span>Trang {currentPage}/{totalPages}</span>
              <button className={adminStyles.accountSecondaryButton} type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Trang sau</button>
            </div>
          </div>}
      </section>
    </div>
  );
}

export function ContractHistoryScreen({ id }: { id: string }) {
  const validId = ContractIdSchema.safeParse(id).success;
  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", id],
    queryFn: ({ signal }) => contractsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });
  const history = useQuery({
    queryKey: ["dolores", "machine-contract-history", contract.data?.machineId],
    queryFn: ({ signal }) => contractsApi.getMachineHistory(contract.data!.machineId!, signal),
    enabled: Boolean(contract.data?.machineId),
    retry: false,
  });

  return (
    <div className={`${styles.pageContent} ${adminStyles.userPage}`}>
      <ModeratorPageHeading title="Lịch sử hợp đồng" description="Các hợp đồng gắn với cùng máy." />
      {!validId && <div className={adminStyles.notice} role="alert">Mã hợp đồng không hợp lệ.</div>}
      {validId && <QueryFeedback query={contract} loadingMessage={T.COMMON.LOADING} />}
      {contract.data && !contract.data.machineId && <p className={adminStyles.emptyText} role="status">Hợp đồng này chưa gắn với máy.</p>}
      {contract.data?.machineId && <section className={`${adminStyles.panel} ${adminStyles.contractListPanel}`} aria-labelledby="moderator-contract-history-title">
        <div className={adminStyles.userSectionHeading}>
          <h2 id="moderator-contract-history-title">Hợp đồng theo máy</h2>
          {history.data && <span className={adminStyles.contractListCount}>{history.data.length.toLocaleString("vi-VN")} hợp đồng</span>}
        </div>
        <QueryFeedback query={history} loadingMessage={T.COMMON.LOADING} />
        {history.data && history.data.length === 0 && <p className={adminStyles.emptyText} role="status">{T.COMMON.EMPTY}</p>}
        {history.data && history.data.length > 0 && <DataTable
          headerVariant="admin"
          rows={history.data}
          rowKey={(item) => item.id}
          columns={[
            { key: "contract", header: "Hợp đồng", render: (item) => <TextLinkButton href={PATH_MODERATOR.CONTRACT_DETAIL(item.id)}><TruncatedId value={item.id} /></TextLinkButton> },
            { key: "owner", header: "Khách hàng", render: (item) => item.ownerName ?? item.ownerId.slice(0, 8) },
            { key: "period", header: "Thời hạn", render: (item) => `${formatDate(item.startDate)} – ${formatDate(item.endDate)}` },
            { key: "status", header: "Trạng thái", render: (item) => <StatusBadge status={item.status}>{item.status === "ACTIVE" ? T.CONTRACTS.ACTIVE : item.status === "DRAFT" ? T.CONTRACTS.DRAFT : T.CONTRACTS.TERMINATED}</StatusBadge> },
          ]}
        />}
      </section>}
    </div>
  );
}
