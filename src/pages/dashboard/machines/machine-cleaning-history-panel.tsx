import { useState } from "react";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { adminStyles } from "@/pages/admin/admin-shell";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import type { OwnerCleaningRecord, OwnerCleaningRecordsPage } from "@/schema/owner-analytics.schema";
import styles from "@/components/machines/machines.module.css";

export function getVietnamToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatOwnerRecordTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function summarizeMachineCleaning(records: readonly OwnerCleaningRecord[], machineId: string, complete: boolean) {
  const summarize = (type: OwnerCleaningRecord["cleaningType"]) => {
    const matching = records.filter((record) => record.machineId === machineId && record.cleaningType === type);
    if (matching.some((record) => record.status === "COMPLETED")) return "Hoàn tất";
    if (!complete) return "Chưa kiểm tra đầy đủ";
    const latest = matching.reduce<OwnerCleaningRecord | undefined>((selected, record) => !selected || Date.parse(record.startedAt) > Date.parse(selected.startedAt) ? record : selected, undefined);
    return latest ? latest.status === "ABORTED" ? "Bị gián đoạn" : "Chưa hoàn tất" : "Chưa ghi nhận";
  };
  return { startup: summarize("STARTUP"), closing: summarize("CLOSING") };
}

const statusLabels = { COMPLETED: "Hoàn tất", FAILED: "Chưa hoàn tất", ABORTED: "Bị gián đoạn" };

export function MachineCleaningHistoryPanel({ data, loading, error, onRetry, onPageChange }: {
  data?: OwnerCleaningRecordsPage; loading: boolean; error?: string;
  onRetry: () => void; onPageChange: (page: number) => void;
}) {
  const [selected, setSelected] = useState<OwnerCleaningRecord | null>(null);
  return <section className={styles.operationalOverviewPanel} aria-labelledby="owner-cleaning-history-title">
    <h2 id="owner-cleaning-history-title">Lịch sử vệ sinh</h2>
    {error ? <div className={styles.operationalOverviewError} role="alert"><p>{error}</p><ButtonBar onClick={onRetry}>Thử lại</ButtonBar></div>
      : loading ? <p role="status">Đang tải lịch sử vệ sinh…</p>
        : data ? <>
          <DataTable variant="accounts" headerVariant="admin" rows={data.content} rowKey={(row) => row.id} emptyMessage="Chưa có bản ghi vệ sinh trong khoảng đã chọn." columns={[
            { key: "started", header: "Bắt đầu", render: (row) => <time dateTime={row.startedAt}>{formatOwnerRecordTime(row.startedAt)}</time> },
            { key: "type", header: "Loại vệ sinh", render: (row) => row.cleaningType === "STARTUP" ? "Đầu ngày" : "Cuối ngày" },
            { key: "status", header: "Kết quả", render: (row) => <span className={adminStyles.machinePlainStatus} data-status={row.status}>{statusLabels[row.status]}</span> },
            { key: "content", header: "", render: (row) => <ButtonBar rollingLabel onClick={() => setSelected(row)}>Xem chi tiết</ButtonBar> },

          ]} />
          <nav className={styles.ownerHistoryPagination} aria-label="Phân trang lịch sử vệ sinh">
            <span>{data.totalElements.toLocaleString("vi-VN")} bản ghi · Trang {data.page + 1}</span>
            <ButtonBar disabled={data.first || loading} onClick={() => onPageChange(data.page - 1)}>Trang trước</ButtonBar>
            <ButtonBar disabled={data.last || loading} onClick={() => onPageChange(data.page + 1)}>Trang sau</ButtonBar>
          </nav>
        </> : null}
    {selected && <NotificationDialog variant="info" title="Chi tiết vệ sinh" onClose={() => setSelected(null)} primaryAction={{ label: "Đóng", onClick: () => setSelected(null) }}>
      <dl className={styles.ownerCleaningFlags}>
        <div><dt>Bắt đầu</dt><dd>{formatOwnerRecordTime(selected.startedAt)}</dd></div>
        <div><dt>Kết thúc</dt><dd>{formatOwnerRecordTime(selected.finishedAt)}</dd></div>
        {([["Đường cà phê", selected.coffeeCleaned], ["Đường sữa", selected.milkCleaned], ["Gia nhiệt", selected.heatingCompleted], ["Xả đầu pha", selected.groupheadPurged]] as const).map(([label, done]) => <div key={label}><dt>{label}</dt><dd>{done ? "Đã thực hiện" : "Chưa thực hiện"}</dd></div>)}
        <div><dt>Ghi chú</dt><dd>{selected.notes || "Chưa có ghi chú."}</dd></div>
      </dl>
    </NotificationDialog>}
  </section>;
}
