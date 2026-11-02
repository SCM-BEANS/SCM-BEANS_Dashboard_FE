import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { TECHNICIAN_WORK_ITEMS_QUERY_KEY } from "@/apis/technician-work-items.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MaintenanceTicketIdSchema, type MaintenanceTicket } from "@/schema/machines.schema";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { PATH_TECHNICIAN } from "@/routes/path";
import styles from "./technician-maintenance-ticket-screen.module.css";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function TicketDetail({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [partsReplaced, setPartsReplaced] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const validId = MaintenanceTicketIdSchema.safeParse(ticketId).success;
  const ticketKey = ["dolores", "technician", querySubject("technician"), "maintenance-ticket", ticketId] as const;
  const ticketQuery = useQuery({
    queryKey: ticketKey,
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(ticketId, signal),
    enabled: validId,
    retry: false,
  });
  const ticket = ticketQuery.data;

  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ticketKey }),
    queryClient.invalidateQueries({ queryKey: ["dolores", "technician", querySubject("technician"), "maintenance-tickets"] }),
    queryClient.invalidateQueries({ queryKey: TECHNICIAN_WORK_ITEMS_QUERY_KEY }),
  ]);

  const startWork = useMutation({
    mutationFn: () => machinesApi.updateMaintenanceTicketStatus(ticketId, "IN_PROGRESS"),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ kind: "success", text: "Đã bắt đầu thực hiện ticket." });
      await refresh();
    },
    onError: async (error: unknown) => {
      setFeedback({ kind: "error", text: getApiErrorMessage(error) });
      await refresh();
    },
  });
  const recordParts = useMutation({
    mutationFn: () => machinesApi.recordMaintenanceTicketParts(ticketId, {
      ...(partsReplaced.trim() ? { partsReplaced: partsReplaced.trim() } : {}),
      ...(partsCost.trim() ? { partsCost: Number(partsCost) } : {}),
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ kind: "success", text: "Đã ghi nhận linh kiện và chi phí vật tư." });
      await refresh();
    },
    onError: async (error: unknown) => {
      setFeedback({ kind: "error", text: getApiErrorMessage(error) });
      await refresh();
    },
  });

  const submitParts = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (partsCost.trim() && (!Number.isFinite(Number(partsCost)) || Number(partsCost) < 0)) {
      setFeedback({ kind: "error", text: "Chi phí vật tư phải là số không âm." });
      return;
    }
    recordParts.mutate();
  };
  const canStart = ticket?.status === "ASSIGNED" && !ticket.repairCaseId;
  const canRecordParts = ticket?.status === "IN_PROGRESS" && !ticket.repairCaseId;

  return (
    <section className={styles.pageContent} aria-labelledby="technician-maintenance-ticket-title">
      <BackButtonHeading
        back={{ label: "Danh sách công việc", fallbackHref: PATH_TECHNICIAN.TASKS }}
        title="Chi tiết phiếu bảo trì"
        titleId="technician-maintenance-ticket-title"
        description="Cập nhật tiến độ và vật tư cho ticket được giao."
        className={styles.pageHeading}
      />
      {!validId ? <p className={styles.notice} role="alert">Mã ticket bảo trì không hợp lệ.</p> : null}
      {validId && ticketQuery.isPending ? <p className={styles.notice} role="status">Đang tải ticket…</p> : null}
      {validId && ticketQuery.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(ticketQuery.error)}</p>
          <button className={styles.button} type="button" onClick={() => void ticketQuery.refetch()}>Thử lại</button>
        </div>
      ) : null}
      {ticket ? (
        <>
          <dl className={styles.detailGrid}>
            <div><dt>Mã ticket</dt><dd className={styles.code}>{ticket.id ?? "—"}</dd></div>
            <div><dt>Thiết bị</dt><dd className={styles.code}>{ticket.machineId ?? "—"}</dd></div>
            <div><dt>Trạng thái</dt><dd>{ticket.status ?? "—"}</dd></div>
            <div><dt>Nguồn</dt><dd>{ticket.source ?? "—"}</dd></div>
            <div><dt>Lịch dự kiến</dt><dd>{formatDateTime(ticket.scheduledDueAt ?? ticket.maintenanceWindowDeadline)}</dd></div>
            <div><dt>Kỹ thuật viên được giao</dt><dd className={styles.code}>{ticket.assignedTechnicianId ?? "—"}</dd></div>
            <div><dt>Vật tư đã thay</dt><dd>{ticket.partsReplaced ?? "Chưa ghi nhận"}</dd></div>
            <div><dt>Chi phí vật tư</dt><dd>{ticket.partsCost ?? "Chưa ghi nhận"}</dd></div>
          </dl>
          {ticket.actionableInstructions ? <p className={styles.notice}>{ticket.actionableInstructions}</p> : null}
          {ticket.repairCaseId ? (
            <div className={styles.notice}>
              <p>Ticket này thuộc quy trình RepairCase; hãy dùng timeline và các bước của hồ sơ sửa chữa.</p>
              <a className={styles.link} href={PATH_TECHNICIAN.TASK_REPAIR_CASE_DETAIL(ticket.repairCaseId)}>Mở hồ sơ sửa chữa</a>
            </div>
          ) : null}
          {canStart ? (
            <section className={styles.panel}>
              <h2>Bắt đầu công việc</h2>
              <p>Trạng thái chuyển sang đang thực hiện sau khi server xác nhận.</p>
              <button className={styles.button} type="button" disabled={startWork.isPending} onClick={() => startWork.mutate()}>
                {startWork.isPending ? "Đang cập nhật…" : "Bắt đầu công việc"}
              </button>
            </section>
          ) : null}
          {canRecordParts ? (
            <form className={styles.panel} onSubmit={submitParts}>
              <h2>Ghi nhận vật tư</h2>
              <label htmlFor="maintenance-parts">Linh kiện đã thay</label>
              <textarea id="maintenance-parts" value={partsReplaced} maxLength={4000} onChange={(event) => setPartsReplaced(event.target.value)} rows={3} />
              <label htmlFor="maintenance-parts-cost">Chi phí vật tư</label>
              <input id="maintenance-parts-cost" type="number" min="0" step="0.01" value={partsCost} onChange={(event) => setPartsCost(event.target.value)} />
              <button className={styles.button} type="submit" disabled={recordParts.isPending || (!partsReplaced.trim() && !partsCost.trim())}>
                {recordParts.isPending ? "Đang lưu…" : "Lưu vật tư"}
              </button>
            </form>
          ) : null}
          {ticket.status === "IN_PROGRESS" && !ticket.repairCaseId ? (
            <div className={styles.notice}>
              <h2>Hoàn tất và duyệt chi phí</h2>
              <p>Chưa thể hoàn tất hoặc gửi đề xuất chi phí vì hệ thống hiện chưa có API upload và đọc minh chứng riêng tư cho ticket bảo trì. Khi có nguồn minh chứng này, quy trình sẽ mở các bước tiếp theo.</p>
              <button className={styles.disabledButton} type="button" disabled aria-describedby="maintenance-evidence-block">Hoàn tất ticket</button>
              <button className={styles.disabledButton} type="button" disabled aria-describedby="maintenance-evidence-block">Gửi đề xuất chi phí</button>
              <p className={styles.hint} id="maintenance-evidence-block">Cần API lưu trữ minh chứng riêng tư được liên kết với ticket.</p>
            </div>
          ) : null}
        </>
      ) : null}
      {feedback ? <p className={[styles.notice, feedback.kind === "error" ? styles.error : styles.success].join(" ")} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
    </section>
  );
}

export function TechnicianMaintenanceTicketScreen({ ticketId }: { ticketId: string }) {
  return <TicketDetail ticketId={ticketId} />;
}
