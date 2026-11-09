import styles from "./machines.module.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { contractsApi } from "@/apis/contracts.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";

const labels = { DRAFT: "Bản nháp", ACTIVE: "Đang hiệu lực", TERMINATED: "Đã chấm dứt" } as const;
export function MachineContractHistory({ machineId, role }: { machineId: string; role: "ADMIN" | "MODERATOR" | "OWNER" | "TECHNICIAN" }) {
  const [status, setStatus] = useState<keyof typeof labels | "">("");
  const [page, setPage] = useState(0);
  const subject = authScopedQuerySubject(role);
  const query = useQuery({ queryKey: ["dolores", "machine-contract-history", subject, machineId, status, page], queryFn: ({ signal }) => contractsApi.listByMachine(machineId, { ...(status ? { status } : {}), page, size: 10 }, signal), retry: false });
  const base = role === "OWNER" ? "/dashboard/contracts" : role === "MODERATOR" ? "/moderator/contracts" : "/admin/contracts";
  return <section className={styles.smartIotPanel} aria-label="Lịch sử hợp đồng của máy">
    <h2>Lịch sử hợp đồng của máy</h2>
    <label className={styles.historyFilter}>Trạng thái <select value={status} onChange={event => { setStatus(event.target.value as keyof typeof labels | ""); setPage(0); }}><option value="">Tất cả</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    {query.isPending ? <p role="status">Đang tải lịch sử hợp đồng…</p> : null}
    {query.isError ? <p role="alert">{getApiErrorMessage(query.error)}</p> : null}
    {query.data ? <><DataTable rows={query.data.items} rowKey={row => row.id} emptyMessage="Không có lịch sử hợp đồng." columns={[
      { key: "id", header: "Mã hợp đồng", render: row => role === "TECHNICIAN" ? row.id : <Link href={role === "ADMIN" ? `/admin/contracts?view=detail&id=${encodeURIComponent(row.id)}` : `${base}/${encodeURIComponent(row.id)}`}>{row.id}</Link> },
      { key: "status", header: "Trạng thái", render: row => <StatusBadge status={row.status}>{labels[row.status]}</StatusBadge> },
      { key: "start", header: "Ngày bắt đầu", render: row => row.startDate ?? "—" },
      { key: "end", header: "Ngày kết thúc", render: row => row.endDate ?? "—" },
      { key: "owner", header: "Chủ sở hữu", render: row => row.ownerName ?? "—" },
    ]} /><nav className={styles.ownerHistoryPagination} aria-label="Phân trang lịch sử hợp đồng"><ButtonBar type="button" disabled={page === 0 || query.isFetching} onClick={() => setPage(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar type="button" disabled={!query.data.hasNext || query.isFetching} onClick={() => setPage(page + 1)}>Trang sau</ButtonBar></nav></> : null}
  </section>;
}
