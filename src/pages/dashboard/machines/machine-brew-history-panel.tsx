import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import type { OwnerBrewRecordsPage } from "@/schema/owner-analytics.schema";
import { formatOwnerRecordTime } from "./machine-cleaning-history-panel";
import styles from "@/components/machines/machines.module.css";

export function MachineBrewHistoryPanel({ data, loading, error, onRetry, onPageChange }: {
  data?: OwnerBrewRecordsPage; loading: boolean; error?: string;
  onRetry: () => void; onPageChange: (page: number) => void;
}) {
  return <section className={styles.operationalOverviewPanel} aria-labelledby="owner-brew-history-title">
    <h2 id="owner-brew-history-title">Lịch sử pha chế</h2>
    {error ? <div className={styles.operationalOverviewError} role="alert"><p>{error}</p><ButtonBar onClick={onRetry}>Thử lại</ButtonBar></div>
      : loading ? <p role="status">Đang tải lịch sử pha chế…</p>
        : data ? <>
          <DataTable rows={data.content} rowKey={(row) => row.id} emptyMessage="Chưa có lần pha nào trong khoảng đã chọn." columns={[
            { key: "time", header: "Thời gian", render: (row) => <time dateTime={row.brewedAt}>{formatOwnerRecordTime(row.brewedAt)}</time> },
            { key: "recipe", header: "Món", render: (row) => row.recipeName },
            { key: "machine", header: "Máy", render: (row) => row.machineSerialNumber },
          ]} />
          <nav className={styles.ownerHistoryPagination} aria-label="Phân trang lịch sử pha chế">
            <span>{data.totalElements.toLocaleString("vi-VN")} lần pha · Trang {data.page + 1}</span>
            <ButtonBar disabled={data.first || loading} onClick={() => onPageChange(data.page - 1)}>Trang trước</ButtonBar>
            <ButtonBar disabled={data.last || loading} onClick={() => onPageChange(data.page + 1)}>Trang sau</ButtonBar>
          </nav>
        </> : null}
  </section>;
}
