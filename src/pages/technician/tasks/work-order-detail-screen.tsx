import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import shellStyles from "../technician-shell.module.css";
import styles from "./work-order-detail-screen.module.css";

const messages = T.WORKFLOWS;
const detailQueryKey = (workOrderId: string) => ["dolores", "installation-work-orders", "id", workOrderId] as const;
const assignedQueryKey = ["dolores", "technician", "installation-work-orders", "assigned"] as const;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const statusLabels: Record<AssignedInstallationWorkOrderSummary["status"], string> = {
  PENDING: messages.TASKS_STATUS_PENDING,
  ASSIGNED: messages.TASKS_STATUS_ASSIGNED,
  IN_PROGRESS: messages.TASKS_STATUS_IN_PROGRESS,
  COMPLETED: messages.TASKS_STATUS_COMPLETED,
  FAILED: messages.TASKS_STATUS_FAILED,
  CANCELLED: messages.TASKS_STATUS_CANCELLED,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function formatFileSize(value: number) {
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function DetailValue({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

export function TechnicianInstallationWorkOrderScreen({ workOrderId }: { workOrderId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [handoverRecipient, setHandoverRecipient] = useState("");
  const [evidenceError, setEvidenceError] = useState("");

  const details = useQuery({
    queryKey: detailQueryKey(workOrderId),
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    retry: false,
  });

  const refreshWorkOrder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey(workOrderId) }),
      queryClient.invalidateQueries({ queryKey: assignedQueryKey }),
    ]);
  };

  const start = useMutation({
    mutationFn: () => installationWorkOrdersApi.start(workOrderId),
    onSuccess: refreshWorkOrder,
    onError: refreshWorkOrder,
  });
  const uploadEvidence = useMutation({
    mutationFn: (file: File) => installationWorkOrdersApi.uploadEvidence(workOrderId, file),
    onSuccess: async () => {
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await refreshWorkOrder();
    },
    onError: refreshWorkOrder,
  });
  const complete = useMutation({
    mutationFn: (recipient: string) => installationWorkOrdersApi.complete(workOrderId, { handoverRecipient: recipient }),
    onSuccess: refreshWorkOrder,
    onError: refreshWorkOrder,
  });

  const workOrder = details.data?.workOrder;
  const evidenceCount = details.data?.evidenceCount ?? details.data?.evidence.length ?? 0;
  const canComplete = Boolean(workOrder?.status === "IN_PROGRESS" && evidenceCount > 0 && handoverRecipient.trim());

  const handleFileChange = (file: File | null) => {
    setEvidenceError("");
    setSelectedFile(file);
    if (!file) return;
    if (file.size <= 0) {
      setEvidenceError("Tệp minh chứng không được để trống.");
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setEvidenceError("Tệp minh chứng không được vượt quá 20 MB.");
      return;
    }
    if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
      setEvidenceError("Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.");
    }
  };

  return (
    <TechnicianShell pageTitle={messages.TASK_DETAIL_TITLE}>
      <section className={shellStyles.pageContent} aria-labelledby="technician-work-order-title">
        <header className={shellStyles.pageHeading}>
          <h1 id="technician-work-order-title">{messages.TASK_DETAIL_TITLE}</h1>
          <p>Thực hiện lắp đặt, tải minh chứng bàn giao và xác nhận người nhận theo trạng thái của lệnh.</p>
          <TextLinkButton href={PATH_TECHNICIAN.TASKS}>Về danh sách công việc</TextLinkButton>
        </header>

        {details.isPending && <p className={shellStyles.pendingNotice} role="status">Đang tải chi tiết công việc…</p>}
        {details.isError && (
          <div className={styles.notice} role="alert">
            <p>{getApiErrorMessage(details.error)}</p>
            <ButtonBar type="button" disabled={details.isFetching} onClick={() => void details.refetch()}>
              {details.isFetching ? "Đang tải…" : "Tải lại"}
            </ButtonBar>
          </div>
        )}

        {workOrder && !details.isError && (
          <>
            <section className={styles.panel} aria-labelledby="work-order-overview-title">
              <h2 id="work-order-overview-title">Thông tin lệnh lắp đặt</h2>
              <dl className={styles.detailGrid}>
                <DetailValue label="Mã công việc" value={workOrder.id} code />
                <DetailValue label="Trạng thái" value={statusLabels[workOrder.status]} />
                <DetailValue label="Mã hợp đồng" value={workOrder.contractId} code />
                <DetailValue label="Mã máy" value={workOrder.machineId} code />
                <DetailValue label="Loại máy" value={workOrder.machineType === "SMART_IOT" ? messages.TASKS_MACHINE_TYPE_SMART_IOT : messages.TASKS_MACHINE_TYPE_CONVENTIONAL} />
                <DetailValue label="Chủ sở hữu" value={workOrder.ownerId} code />
                <DetailValue label="Lịch dự kiến" value={formatDateTime(workOrder.scheduledFor)} />
                <DetailValue label="Bắt đầu lúc" value={formatDateTime(workOrder.startedAt)} />
                <DetailValue label="Hoàn tất lúc" value={formatDateTime(workOrder.completedAt)} />
                <DetailValue label="Người nhận bàn giao" value={workOrder.handoverRecipient ?? "—"} />
                {workOrder.failureReason && <DetailValue label="Lý do thất bại" value={workOrder.failureReason} />}
              </dl>
              {details.data.installationNotes && <p className={styles.notes}><strong>Ghi chú:</strong> {details.data.installationNotes}</p>}
            </section>

            {workOrder.status === "ASSIGNED" && (
              <section className={styles.panel} aria-labelledby="work-order-start-title">
                <h2 id="work-order-start-title">Bắt đầu lắp đặt</h2>
                <p className={styles.hint}>Lệnh chỉ có thể bắt đầu khi đang ở trạng thái “Đã phân công”.</p>
                {start.isError && <p className={styles.error} role="alert">{getApiErrorMessage(start.error, "mutation")}</p>}
                <ButtonBar type="button" disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? "Đang bắt đầu…" : "Bắt đầu lắp đặt"}
                </ButtonBar>
              </section>
            )}

            {workOrder.status === "IN_PROGRESS" && (
              <>
                <section className={styles.panel} aria-labelledby="work-order-evidence-title">
                  <h2 id="work-order-evidence-title">Minh chứng bàn giao ({evidenceCount})</h2>
                  <p className={styles.hint}>Tải ít nhất một tệp PDF, JPEG hoặc PNG, dung lượng tối đa 20 MB. Tệp được lưu riêng tư.</p>
                  {details.data.evidence.length > 0 && (
                    <DataTable
                      variant="moderator"
                      rows={details.data.evidence}
                      rowKey={(item) => item.id}
                      columns={[
                        { key: "filename", header: "Tệp", render: (item) => item.originalFilename },
                        { key: "type", header: "Định dạng", render: (item) => item.contentType ?? "—" },
                        { key: "size", header: "Dung lượng", render: (item) => formatFileSize(item.sizeBytes) },
                        { key: "uploaded", header: "Ngày tải", render: (item) => formatDateTime(item.uploadedAt) },
                      ]}
                    />
                  )}
                  <div className={styles.uploadRow}>
                    <label className={styles.fileField} htmlFor="work-order-evidence-file">
                      <span>Chọn minh chứng</span>
                      <input
                        ref={fileInput}
                        id="work-order-evidence-file"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        disabled={uploadEvidence.isPending}
                        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    {selectedFile && <span className={styles.fileName}>{selectedFile.name} · {formatFileSize(selectedFile.size)}</span>}
                    <ButtonBar
                      type="button"
                      disabled={!selectedFile || Boolean(evidenceError) || uploadEvidence.isPending}
                      onClick={() => selectedFile && uploadEvidence.mutate(selectedFile)}
                    >
                      {uploadEvidence.isPending ? "Đang tải minh chứng…" : "Tải minh chứng"}
                    </ButtonBar>
                  </div>
                  {evidenceError && <p className={styles.error} role="alert">{evidenceError}</p>}
                  {uploadEvidence.isError && <p className={styles.error} role="alert">{getApiErrorMessage(uploadEvidence.error, "mutation")}</p>}
                </section>

                <section className={styles.panel} aria-labelledby="work-order-complete-title">
                  <h2 id="work-order-complete-title">Hoàn tất bàn giao</h2>
                  <p className={styles.hint}>Checklist không bắt buộc. Cần ít nhất một minh chứng đã tải lên và tên người nhận bàn giao.</p>
                  <label className={styles.recipientField} htmlFor="work-order-handover-recipient">
                    <span>Người nhận bàn giao</span>
                    <input
                      id="work-order-handover-recipient"
                      type="text"
                      value={handoverRecipient}
                      onChange={(event) => setHandoverRecipient(event.target.value)}
                    />
                  </label>
                  {complete.isError && <p className={styles.error} role="alert">{getApiErrorMessage(complete.error, "mutation")}</p>}
                  <ButtonBar
                    type="button"
                    disabled={!canComplete || complete.isPending || uploadEvidence.isPending}
                    onClick={() => complete.mutate(handoverRecipient.trim())}
                  >
                    {complete.isPending ? "Đang hoàn tất…" : "Xác nhận hoàn tất bàn giao"}
                  </ButtonBar>
                </section>
              </>
            )}

            {workOrder.status === "COMPLETED" && (
              <p className={styles.success} role="status">Đã hoàn tất bàn giao. Hợp đồng đã sẵn sàng để Admin hoặc Moderator kiểm tra và kích hoạt.</p>
            )}

            {workOrder.status === "PENDING" && (
              <p className={styles.notice} role="status">Công việc đang chờ Moderator phân công kỹ thuật viên.</p>
            )}

            {(workOrder.status === "FAILED" || workOrder.status === "CANCELLED") && (
              <p className={styles.notice} role="status">Lệnh lắp đặt đã kết thúc với trạng thái {statusLabels[workOrder.status]}.</p>
            )}

            <section className={styles.panel} aria-labelledby="work-order-checklist-title">
              <h2 id="work-order-checklist-title">Checklist tham khảo ({details.data.checklistItemCount ?? details.data.checklistItems.length})</h2>
              <p className={styles.hint}>Checklist chỉ để theo dõi; API hoàn tất bàn giao không yêu cầu ghi hoặc đạt checklist.</p>
              <DataTable
                variant="moderator"
                rows={details.data.checklistItems}
                rowKey={(item) => item.id}
                emptyMessage="Không có mục checklist cho lệnh này."
                columns={[
                  { key: "code", header: "Mã mục", render: (item) => item.itemCode },
                  { key: "label", header: "Nội dung", render: (item) => item.label },
                  { key: "required", header: "Bắt buộc", render: (item) => item.required ? "Có" : "Không" },
                  { key: "result", header: "Kết quả", render: (item) => item.result },
                  { key: "notes", header: "Ghi chú", render: (item) => item.notes ?? "—" },
                ]}
              />
            </section>

            {details.data.accessories.length > 0 && (
              <section className={styles.panel} aria-labelledby="work-order-accessories-title">
                <h2 id="work-order-accessories-title">Phụ kiện đã ghi nhận</h2>
                <DataTable
                  variant="moderator"
                  rows={details.data.accessories}
                  rowKey={(item) => item.id}
                  columns={[
                    { key: "name", header: "Phụ kiện", render: (item) => item.accessoryName },
                    { key: "quantity", header: "Số lượng", render: (item) => item.quantity },
                    { key: "serial", header: "Số sê-ri", render: (item) => item.serialNumber ?? "—" },
                    { key: "notes", header: "Ghi chú", render: (item) => item.notes ?? "—" },
                  ]}
                />
              </section>
            )}
          </>
        )}
      </section>
    </TechnicianShell>
  );
}
