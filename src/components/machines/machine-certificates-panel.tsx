import { useState } from "react";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { TextActionButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { MachineCertificate, MachineCertificateDetail, MachineCertificatePage, MachineCertificateStatus } from "@/schema/machine-certificates.schema";
import { SmartIotPanel } from "./smart-iot-panel";
import styles from "./machines.module.css";

export type MachineCertificatesPanelProps = {
  page?: MachineCertificatePage;
  detail?: MachineCertificateDetail;
  status: "" | MachineCertificateStatus;
  pageNumber: number;
  loading: boolean;
  detailLoading: boolean;
  error?: string;
  detailError?: string;
  actionError?: string;
  notice?: string;
  busy: boolean;
  issueBlocked: boolean;
  embedded?: boolean;
  showRefresh?: boolean;
  selectedCertificateId?: string;
  onIssue: () => void;
  onSelect: (id: string) => void;
  onStatusChange: (status: "" | MachineCertificateStatus) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onDownload: (id: string, format: "zip" | "json", signal: AbortSignal) => Promise<Blob>;
  onDelete: (id: string) => void;
};

const statusLabels = { ACTIVE: "Đang hoạt động", REVOKED: "Đã thu hồi", EXPIRED: "Đã hết hạn" };

function formatDate(value: string) {
  const utcValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(utcValue));
}

export function MachineCertificatesPanel(props: MachineCertificatesPanelProps) {
  const [deleting, setDeleting] = useState<MachineCertificate | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const detail = !props.error && props.detail?.id === props.selectedCertificateId ? props.detail : undefined;

  const content = <>
    <div className={styles.monitoringChartToolbar}>
      <label className={styles.telemetryFieldSelector}>Trạng thái chứng chỉ
        <select value={props.status} disabled={props.busy} onChange={(event) => props.onStatusChange(event.target.value as "" | MachineCertificateStatus)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className={styles.telemetryRangePresets}>
        {props.showRefresh !== false && <ButtonBar disabled={props.busy || props.loading} onClick={props.onRefresh}>Làm mới</ButtonBar>}
        <ButtonBar variant="primary" disabled={props.busy || props.loading || props.issueBlocked || Boolean(props.error)} onClick={props.onIssue}>Phát hành chứng chỉ</ButtonBar>
      </div>
    </div>
    {props.actionError && <p className={styles.telemetryError} role="alert">{props.actionError}</p>}
    {props.notice && <p role="status">{props.notice}</p>}
    {props.error ? <p className={styles.telemetryError} role="alert">{props.error}</p>
      : props.loading ? <p role="status">Đang tải chứng chỉ…</p>
        : props.page && <DataTable rows={props.page.content} rowKey={(item) => item.id} emptyMessage="Chưa có chứng chỉ trong danh sách này." columns={[
          { key: "serial", header: "Số chứng chỉ", render: (item) => <TextActionButton disabled={props.busy} onClick={() => props.onSelect(item.id)}>{item.certificateSerial ?? item.id}</TextActionButton> },
          { key: "status", header: "Trạng thái", render: (item) => statusLabels[item.status] },
          { key: "issued", header: "Ngày phát hành", render: (item) => formatDate(item.issuedAt) },
          { key: "expires", header: "Ngày hết hạn", render: (item) => formatDate(item.expiresAt) },
          { key: "actions", header: "Thao tác", render: (item) => <div className={styles.telemetryRangePresets}>
            <ProgressDownloadButton filename={`machine-${item.machineId}-certificate-${item.id}.zip`} download={(signal) => { setDownloadError(""); return props.onDownload(item.id, "zip", signal); }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải ZIP</ProgressDownloadButton>
            <ProgressDownloadButton filename={`machine-${item.machineId}-certificate-${item.id}.json`} download={(signal) => { setDownloadError(""); return props.onDownload(item.id, "json", signal); }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải JSON</ProgressDownloadButton>
            <ButtonBar variant="danger" disabled={props.busy} onClick={() => setDeleting(item)}>Xóa chứng chỉ</ButtonBar>
          </div> },
        ]} />}
    {downloadError && <p className={styles.telemetryError} role="alert">{downloadError}</p>}
    {props.page && !props.error && <div className={styles.telemetryRangePresets}>
      <ButtonBar disabled={props.busy || props.loading || props.page.first} onClick={() => props.onPageChange(props.pageNumber - 1)}>Trang trước</ButtonBar>
      <span>Trang {props.pageNumber + 1} / {Math.max(1, props.page.totalPages)}</span>
      <ButtonBar disabled={props.busy || props.loading || props.page.last} onClick={() => props.onPageChange(props.pageNumber + 1)}>Trang sau</ButtonBar>
    </div>}
    {props.detailLoading ? <p role="status">Đang tải chi tiết chứng chỉ…</p>
      : props.detailError ? <p className={styles.telemetryError} role="alert">{props.detailError}</p>
        : detail && <div className={styles.telemetryHistory}>
          <h3>Chi tiết chứng chỉ</h3>
          <dl className={styles.operationalMetricGrid}>
            {[["Tên thiết bị", detail.commonName], ["Tổ chức", detail.organization], ["SPIFFE ID", detail.spiffeId], ["Dấu vân tay", detail.fingerprint]].map(([label, value]) => <div className={styles.operationalMetricCard} key={label}><dt>{label}</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{value ?? "—"}</dd></div>)}
          </dl>
          {detail.clientCrtPem ? <details><summary>Chứng chỉ công khai</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.clientCrtPem}</pre></details> : <p>Chứng chỉ công khai hiện chưa khả dụng.</p>}
          {detail.caCrtPem ? <details><summary>Chứng chỉ CA</summary><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{detail.caCrtPem}</pre></details> : <p>Chứng chỉ CA hiện chưa khả dụng.</p>}
        </div>}
    {deleting && !props.error && <NotificationDialog variant="confirm" title="Xóa chứng chỉ?" description={<>Chứng chỉ <strong>{deleting.certificateSerial ?? deleting.id}</strong> và bộ tệp kết nối liên quan sẽ bị xóa khỏi hệ thống.</>}
      primaryAction={{ label: "Xóa chứng chỉ", holdToConfirm: true, disabled: props.busy, onClick: () => { props.onDelete(deleting.id); setDeleting(null); } }}
      secondaryAction={{ label: "Hủy", disabled: props.busy, onClick: () => setDeleting(null) }}
      onClose={() => { if (!props.busy) setDeleting(null); }} closeOnEscape={!props.busy} />}
  </>;
  return props.embedded ? content : <SmartIotPanel title="Chứng chỉ kết nối">{content}</SmartIotPanel>;
}
