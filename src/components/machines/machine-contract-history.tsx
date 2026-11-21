import { adminStyles } from "@/pages/admin/admin-shell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TextLinkButton } from "@/components/button/text-link-button";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { contractsApi } from "@/apis/contracts.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { Panel } from "@/components/panel/panel";
import { Pagination } from "@/components/pagination/pagination";
import { TableFilters } from "@/components/table/table-filters";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";

const labels = { DRAFT: "Bản nháp", ACTIVE: "Đang hiệu lực", TERMINATED: "Đã chấm dứt" } as const;
export function MachineContractHistory({ machineId, role }: { machineId: string; role: "ADMIN" | "MODERATOR" | "OWNER" | "TECHNICIAN" }) {
  const [status, setStatus] = useState<keyof typeof labels | "">("");
  const [page, setPage] = useState(0);
  const subject = authScopedQuerySubject(role);
  const query = useQuery({ queryKey: ["dolores", "machine-contract-history", subject, machineId, status, page], queryFn: ({ signal }) => contractsApi.listByMachine(machineId, { ...(status ? { status } : {}), page, size: 10 }, signal), retry: false });
  const base = role === "OWNER" ? "/dashboard/contracts" : role === "MODERATOR" ? "/moderator/contracts" : "/admin/contracts";
  return <Panel title="Lịch sử hợp đồng của máy" aria-label="Lịch sử hợp đồng của máy">
    <TableFilters selects={[{ id: "machine-contract-status", ariaLabel: "Trạng thái", label: "Trạng thái", value: status, options: [{ value: "", label: "Tất cả" }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))], onChange: (value) => { setStatus(value as keyof typeof labels | ""); setPage(0); } }]} showSubmit={false} />
    {query.isPending ? <p role="status">Đang tải lịch sử hợp đồng…</p> : null}
    {query.isError ? <p role="alert">{getApiErrorMessage(query.error)}</p> : null}
    {query.data ? <><DataTable rows={query.data.items} rowKey={row => row.id} emptyMessage="Không có lịch sử hợp đồng." columns={[
      { key: "id", header: "Mã hợp đồng", render: row => role === "TECHNICIAN" ? <TruncatedId value={row.id} /> : <TextLinkButton href={role === "ADMIN" ? `/admin/contracts?view=detail&id=${encodeURIComponent(row.id)}` : `${base}/${encodeURIComponent(row.id)}`}>{row.id.slice(0, 8).toUpperCase()}</TextLinkButton> },
      { key: "status", header: "Trạng thái", render: row => role === "OWNER" ? <span className={adminStyles.machinePlainStatus} data-status={row.status}>{labels[row.status]}</span> : <StatusBadge status={row.status}>{labels[row.status]}</StatusBadge> },
      { key: "start", header: "Ngày bắt đầu", render: row => row.startDate ?? "—" },
      { key: "end", header: "Ngày kết thúc", render: row => row.endDate ?? "—" },
      ...(role === "OWNER" ? [{ key: "open", header: "", render: (row: { id: string }) => <ButtonBar rollingLabel href={base + "/" + encodeURIComponent(row.id)}>Xem hợp đồng</ButtonBar> }] : [{ key: "owner", header: "Khách hàng", render: (row: { ownerName?: string | null }) => row.ownerName ?? "—" }]),
    ]} /><Pagination page={page} hasNext={query.data.hasNext} isFetching={query.isFetching} ariaLabel={M.PAGINATE_MACHINE_CONTRACT_HISTORY} onPageChange={setPage} previousLabel={M.PREVIOUS_PAGE} nextLabel={M.NEXT_PAGE} hideWhenSinglePage={false} /></> : null}
  </Panel>;
}
