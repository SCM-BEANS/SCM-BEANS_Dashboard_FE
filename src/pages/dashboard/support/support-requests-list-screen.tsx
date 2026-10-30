"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { machinesApi } from "@/apis/machines.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import type { MaintenanceRequest, RepairCase } from "@/schema/machines.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

const requestStatusLabels: Record<MaintenanceRequest["status"], string> = {
  REQUESTED: "Đã gửi",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Đã yêu cầu đổi lịch",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};

const repairCaseStatusLabels: Record<RepairCase["status"], string> = {
  REPORTED: "Đã gửi",
  TRIAGE: "Đang xem xét",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ cửa hàng xác nhận",
  REPLACEMENT_PLANNED: "Đã lên kế hoạch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy cần sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang kiểm tra",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy cho cửa hàng",
  OWNER_ACKNOWLEDGED: "Đã xác nhận bàn giao",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

const custodyEventLabels = {
  PRIMARY_COLLECTED: "Đã nhận máy chính để sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy chính",
} as const;

const typeLabels = { REPAIR: "Sửa chữa", PREVENTIVE: "Bảo trì định kỳ" } as const;

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match?.[1] ?? "";
}

function toLocalDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

function getHttpHref(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function SupportRequestsListScreen({ requestId }: { requestId?: string }) {
  const queryClient = useQueryClient();
  const [appointmentValue, setAppointmentValue] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<Record<string, string>>({});
  const [fallbackReason, setFallbackReason] = useState("");

  const list = useQuery({
    queryKey: ["owner-maintenance-requests"],
    queryFn: ({ signal }) => maintenanceRequestsApi.list(signal),
  });
  const machines = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const repairCases = useQuery({
    queryKey: ["owner-repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
    enabled: list.isSuccess,
  });
  const requestDetail = useQuery({
    queryKey: ["owner-maintenance-request", requestId],
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(requestId!, signal),
    enabled: Boolean(requestId),
  });
  const custodyEvents = useQuery({
    queryKey: ["owner-maintenance-custody-events", requestId],
    queryFn: ({ signal }) => maintenanceRequestsApi.getCustodyEvents(requestId!, signal),
    enabled: Boolean(requestId && requestDetail.data?.requestType === "PREVENTIVE"),
  });

  const linkedRepairCase = repairCases.data?.find((item) => item.maintenanceRequestId === requestId);
  const repairCaseDetail = useQuery({
    queryKey: ["owner-repair-case", linkedRepairCase?.id],
    queryFn: ({ signal }) => repairCasesApi.getById(linkedRepairCase!.id, signal),
    enabled: Boolean(linkedRepairCase?.id),
  });
  const repairTimelinePage = Math.max(0, Math.ceil((repairCaseDetail.data?.timelineCount ?? 0) / 50) - 1);
  const repairTimeline = useQuery({
    queryKey: ["owner-repair-case-timeline", linkedRepairCase?.id, repairTimelinePage],
    queryFn: ({ signal }) => repairCasesApi.getTimeline(linkedRepairCase!.id, repairTimelinePage, 50, signal),
    enabled: Boolean(linkedRepairCase?.id && repairCaseDetail.isSuccess),
  });
  const repairCustodyEvents = useQuery({
    queryKey: ["owner-repair-case-custody-events", linkedRepairCase?.id],
    queryFn: ({ signal }) => repairCasesApi.getCustodyEvents(linkedRepairCase!.id, signal),
    enabled: Boolean(linkedRepairCase?.id),
  });

  const refreshRequest = async (id: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["owner-maintenance-request", id] }),
      queryClient.invalidateQueries({ queryKey: ["owner-maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["owner-maintenance-custody-events", id] }),
      queryClient.invalidateQueries({ queryKey: ["owner-repair-cases"] }),
    ]);
  };

  const confirmAppointment = useMutation({
    mutationFn: () => maintenanceRequestsApi.confirm(requestId!, { appointmentAt: toLocalDateTime(appointmentValue) }),
    onSuccess: (request) => refreshRequest(request.id),
  });
  const requestReschedule = useMutation({
    mutationFn: () => maintenanceRequestsApi.reschedule(requestId!, { appointmentAt: toLocalDateTime(appointmentValue) }),
    onSuccess: (request) => refreshRequest(request.id),
  });
  const acknowledgeEvent = useMutation({
    mutationFn: ({ eventId, acknowledgement }: { eventId: string; acknowledgement: string }) =>
      maintenanceRequestsApi.acknowledgeCustodyEvent(eventId, { acknowledgement }),
    onSuccess: (event) => refreshRequest(event.maintenanceRequestId),
  });
  const acknowledgeRepairEvent = useMutation({
    mutationFn: ({ eventId, acknowledgement }: { eventId: string; acknowledgement: string }) =>
      repairCasesApi.acknowledgeCustodyEvent(linkedRepairCase!.id, eventId, acknowledgement),
    onSuccess: async (event) => {
      await Promise.all([
        refreshRequest(event.maintenanceRequestId),
        queryClient.invalidateQueries({ queryKey: ["owner-repair-case", event.repairCaseId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-repair-case-timeline", event.repairCaseId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-repair-case-custody-events", event.repairCaseId] }),
      ]);
    },
  });
  const decideFallback = useMutation({
    mutationFn: (accepted: boolean) => {
      const offer = repairTimeline.data?.content.slice().reverse()
        .find((event) => event.eventType === "FALLBACK_REPLACEMENT_OFFERED");
      if (!linkedRepairCase || !offer?.relatedMachineId) throw new Error("No replacement offer is available for this repair case.");
      return repairCasesApi.decideFallback(linkedRepairCase.id, {
        replacementMachineId: offer.relatedMachineId,
        accepted,
        reason: fallbackReason,
      });
    },
    onSuccess: async (event) => {
      await Promise.all([
        requestId ? refreshRequest(requestId) : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ["owner-repair-case", event.repairCaseId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-repair-case-timeline", event.repairCaseId] }),
      ]);
    },
  });

  const machineLabels = new Map((machines.data ?? []).map((machine) => [machine.id, machine.serialNumber] as const));
  const casesByRequestId = new Map((repairCases.data ?? []).map((repairCase) => [repairCase.maintenanceRequestId, repairCase] as const));
  const requests = list.data ?? [];
  const isListLoading = !list.isError && (
    list.isPending || machines.isPending || (list.isSuccess && repairCases.isPending)
  );

  if (requestId) {
    const request = requestDetail.data;
    const hasMaintenanceWindow = Boolean(request?.windowStart && request?.windowEnd);
    const canConfirm = hasMaintenanceWindow && request?.requestType === "PREVENTIVE"
      && ["REQUESTED", "RESCHEDULE_REQUESTED"].includes(request.status);
    const canReschedule = hasMaintenanceWindow && request?.requestType === "PREVENTIVE"
      && ["REQUESTED", "CONFIRMED"].includes(request.status);
    const isAppointmentPending = confirmAppointment.isPending || requestReschedule.isPending;
    const currentAppointment = appointmentValue
      || toDateTimeLocal(request?.confirmedAppointmentAt ?? request?.requestedAppointmentAt);
    const isDetailLoading = requestDetail.isPending || (list.isSuccess && repairCases.isPending);
    const requestEvidenceHref = getHttpHref(request?.evidenceReference);
    const latestFallbackOffer = repairTimeline.data?.content.slice().reverse()
      .find((event) => event.eventType === "FALLBACK_REPLACEMENT_OFFERED");
    const canDecideFallback = linkedRepairCase?.status === "WAITING_OWNER_DECISION"
      && Boolean(latestFallbackOffer?.relatedMachineId);

    return (
      <section className={styles.pageContent} aria-labelledby="customer-support-detail-title">
        <BackButtonHeading
          back={{ label: "Yêu cầu hỗ trợ", fallbackHref: "/dashboard/support" }}
          title="Chi tiết yêu cầu hỗ trợ"
          titleId="customer-support-detail-title"
          description="Theo dõi tiến độ xử lý, lịch bảo trì và lịch sử bàn giao máy."
          className={styles.pageHeading}
        />
        {isDetailLoading ? (
          <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p>
        ) : null}
        {requestDetail.isError ? (
          <p className={styles.errorNotice} role="alert">Không tải được yêu cầu này. Hãy quay lại danh sách và thử mở lại.</p>
        ) : null}
        {request ? (
          <>
            <section className={styles.dataPanel} aria-labelledby="support-request-summary-title">
              <h2 id="support-request-summary-title">Thông tin yêu cầu</h2>
              <dl className={styles.detailGrid}>
                <DetailItem label="Mã yêu cầu">{request.id}</DetailItem>
                <DetailItem label="Loại yêu cầu">{typeLabels[request.requestType]}</DetailItem>
                <DetailItem label="Máy">{machineLabels.get(request.machineId) || request.machineId}</DetailItem>
                <DetailItem label="Trạng thái">
                  {linkedRepairCase
                    ? repairCaseStatusLabels[linkedRepairCase.status]
                    : requestStatusLabels[request.status]}
                </DetailItem>
                <DetailItem label="Nội dung">{request.issueDescription?.trim() || "Không có mô tả"}</DetailItem>
                <DetailItem label="Ngày gửi">{formatDateTime(request.reportedAt ?? request.createdAt)}</DetailItem>
                {request.evidenceReference ? (
                  <DetailItem label="Minh chứng">
                    {requestEvidenceHref ? (
                      <a href={requestEvidenceHref} target="_blank" rel="noreferrer">Mở minh chứng</a>
                    ) : <code>{request.evidenceReference}</code>}
                  </DetailItem>
                ) : null}
                {request.windowStart || request.windowEnd ? (
                  <DetailItem label="Khung bảo trì">{request.windowStart ?? "—"} – {request.windowEnd ?? "—"}</DetailItem>
                ) : null}
                {request.requestedAppointmentAt ? (
                  <DetailItem label="Lịch đề nghị">{formatDateTime(request.requestedAppointmentAt)}</DetailItem>
                ) : null}
                {request.confirmedAppointmentAt ? (
                  <DetailItem label="Lịch đã xác nhận">{formatDateTime(request.confirmedAppointmentAt)}</DetailItem>
                ) : null}
              </dl>
            </section>

            {request.requestType === "PREVENTIVE" ? (
              <section className={styles.dataPanel} aria-labelledby="support-appointment-title">
                <h2 id="support-appointment-title">Lịch bảo trì</h2>
                <p>Chọn thời gian nằm trong khung bảo trì ghi trên yêu cầu.</p>
                {canConfirm || canReschedule ? (
                  <form
                    className={styles.formField}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!currentAppointment) return;
                      if (canConfirm) confirmAppointment.mutate();
                      else if (canReschedule) requestReschedule.mutate();
                    }}
                  >
                    <label className={styles.formField} htmlFor="owner-appointment-at">
                      <span>Thời gian mong muốn</span>
                      <input
                        id="owner-appointment-at"
                        type="datetime-local"
                        min={request.windowStart ? `${request.windowStart}T00:00` : undefined}
                        max={request.windowEnd ? `${request.windowEnd}T23:59` : undefined}
                        value={currentAppointment}
                        onChange={(event) => setAppointmentValue(event.target.value)}
                        required
                      />
                    </label>
                    <div className={styles.actionRow}>
                      {canConfirm ? (
                        <button className={styles.primaryButton} type="submit" disabled={isAppointmentPending || !currentAppointment}>
                          {confirmAppointment.isPending ? "Đang xác nhận…" : "Xác nhận lịch"}
                        </button>
                      ) : null}
                      {canReschedule ? (
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          disabled={isAppointmentPending || !currentAppointment}
                          onClick={() => requestReschedule.mutate()}
                        >
                          {requestReschedule.isPending ? "Đang gửi…" : "Đề nghị đổi lịch"}
                        </button>
                      ) : null}
                    </div>
                    <p className={styles.dataFootnote}>
                      Xác nhận áp dụng khi đang chờ lịch; đề nghị đổi lịch áp dụng trước khi lịch bảo trì bắt đầu.
                    </p>
                  </form>
                ) : (
                  <p className={styles.dataFootnote}>
                    {hasMaintenanceWindow
                      ? `Yêu cầu hiện ở trạng thái ${requestStatusLabels[request.status]}; các thao tác đặt lịch không khả dụng.`
                      : "Yêu cầu chưa có khung bảo trì từ hợp đồng nên chưa thể xác nhận hoặc đổi lịch."}
                  </p>
                )}
                {confirmAppointment.isSuccess || requestReschedule.isSuccess ? (
                  <p className={styles.successNotice} role="status">Đã cập nhật lịch bảo trì.</p>
                ) : null}
                {confirmAppointment.isError || requestReschedule.isError ? (
                  <p className={styles.errorNotice} role="alert">Không cập nhật được lịch. Hãy kiểm tra thời gian trong khung bảo trì rồi thử lại.</p>
                ) : null}
              </section>
            ) : null}

            {linkedRepairCase ? (
              <section className={styles.dataPanel} aria-labelledby="repair-case-progress-title">
                <h2 id="repair-case-progress-title">Tiến độ sửa chữa</h2>
                <p>Mã hồ sơ sửa chữa: {linkedRepairCase.id}</p>
                {repairCaseDetail.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được chi tiết hồ sơ sửa chữa.</p>
                ) : null}
                {repairTimeline.isPending ? (
                  <p className={styles.loadingNotice} role="status">Đang tải lịch sử xử lý…</p>
                ) : null}
                {repairTimeline.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được lịch sử xử lý.</p>
                ) : null}
                {repairTimeline.data?.content.length ? (
                  <ol className={styles.simpleList}>
                    {repairTimeline.data.content.map((item) => (
                      <li key={item.id}>
                        <strong>{formatDateTime(item.occurredAt)} · {item.toStatus ?? item.eventType}</strong>
                        {item.reason || item.details ? <span> — {item.reason ?? item.details}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : repairTimeline.isSuccess ? (
                  <p className={styles.emptyNotice}>Chưa có cập nhật tiến độ.</p>
                ) : null}
              </section>
            ) : request.requestType === "REPAIR" && repairCases.isSuccess ? (
              <p className={styles.pendingNotice}>Hồ sơ sửa chữa chưa được Moderator tiếp nhận hoặc tạo.</p>
            ) : null}
            {request.requestType === "REPAIR" && repairCases.isError ? (
              <p className={styles.errorNotice} role="alert">Không tải được hồ sơ xử lý sửa chữa.</p>
            ) : null}

            {canDecideFallback && latestFallbackOffer?.relatedMachineId ? (
              <section className={styles.dataPanel} aria-labelledby="repair-fallback-decision-title">
                <h2 id="repair-fallback-decision-title">Đề nghị máy thay thế</h2>
                <p>Moderator đề nghị máy {machineLabels.get(latestFallbackOffer.relatedMachineId) || latestFallbackOffer.relatedMachineId}.</p>
                {latestFallbackOffer.reason ? <p>{latestFallbackOffer.reason}</p> : null}
                {latestFallbackOffer.offeredStartAt || latestFallbackOffer.offeredEndAt ? (
                  <p className={styles.dataFootnote}>
                    Thời gian đề nghị: {formatDateTime(latestFallbackOffer.offeredStartAt)} – {formatDateTime(latestFallbackOffer.offeredEndAt)}
                  </p>
                ) : null}
                <label className={styles.formField} htmlFor="repair-fallback-reason">
                  <span>Lý do quyết định</span>
                  <textarea
                    id="repair-fallback-reason"
                    maxLength={1000}
                    value={fallbackReason}
                    onChange={(event) => setFallbackReason(event.target.value)}
                    placeholder="Ghi lý do chấp nhận hoặc từ chối đề nghị."
                    required
                  />
                </label>
                {decideFallback.isError ? (
                  <p className={styles.errorNotice} role="alert">Không gửi được quyết định. Nếu chấp nhận, máy cùng loại có thể đã khả dụng; hãy tải lại trạng thái trước khi thử lại.</p>
                ) : null}
                <div className={styles.actionRow}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={!fallbackReason.trim() || decideFallback.isPending}
                    onClick={() => decideFallback.mutate(true)}
                  >
                    {decideFallback.isPending ? "Đang gửi…" : "Chấp nhận máy thay thế"}
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    disabled={!fallbackReason.trim() || decideFallback.isPending}
                    onClick={() => decideFallback.mutate(false)}
                  >
                    Từ chối đề nghị
                  </button>
                </div>
              </section>
            ) : null}

            {linkedRepairCase ? (
              <section className={styles.dataPanel} aria-labelledby="repair-custody-title">
                <h2 id="repair-custody-title">Bàn giao máy sửa chữa</h2>
                {repairCustodyEvents.isPending ? (
                  <p className={styles.loadingNotice} role="status">Đang tải lịch sử bàn giao…</p>
                ) : null}
                {repairCustodyEvents.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được lịch sử bàn giao.</p>
                ) : null}
                {repairCustodyEvents.data?.length ? repairCustodyEvents.data.map((item) => (
                  <article className={styles.recordCard} key={item.id}>
                    <div>
                      <h3>{custodyEventLabels[item.eventType]}</h3>
                      <p>{formatDateTime(item.occurredAt)} · Máy {machineLabels.get(item.machineId) || item.machineId}</p>
                      {item.conditionNotes ? <p>Tình trạng: {item.conditionNotes}</p> : null}
                      {item.evidenceReference ? (
                        <p>
                          {getHttpHref(item.evidenceReference) ? (
                            <a href={getHttpHref(item.evidenceReference)!} target="_blank" rel="noreferrer">Xem minh chứng</a>
                          ) : <>Minh chứng: <code>{item.evidenceReference}</code></>}
                        </p>
                      ) : null}
                      {item.ownerAcknowledgedAt ? (
                        <p>Đã xác nhận {formatDateTime(item.ownerAcknowledgedAt)}: {item.ownerAcknowledgement}</p>
                      ) : null}
                    </div>
                    {!item.ownerAcknowledgedAt ? (
                      <form
                        className={styles.formField}
                        onSubmit={(event) => {
                          event.preventDefault();
                          const acknowledgement = acknowledgements[item.id]?.trim();
                          if (acknowledgement) acknowledgeRepairEvent.mutate({ eventId: item.id, acknowledgement });
                        }}
                      >
                        <label className={styles.formField} htmlFor={`repair-custody-ack-${item.id}`}>
                          <span>Xác nhận tình trạng bàn giao</span>
                          <textarea
                            id={`repair-custody-ack-${item.id}`}
                            maxLength={1000}
                            value={acknowledgements[item.id] ?? ""}
                            onChange={(event) => setAcknowledgements((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder="Ghi nhận máy đã nhận và tình trạng thực tế."
                            required
                          />
                        </label>
                        <button
                          className={styles.secondaryButton}
                          type="submit"
                          disabled={acknowledgeRepairEvent.isPending || !acknowledgements[item.id]?.trim()}
                        >
                          {acknowledgeRepairEvent.isPending ? "Đang lưu…" : "Xác nhận bàn giao"}
                        </button>
                      </form>
                    ) : null}
                  </article>
                )) : null}
                {repairCustodyEvents.isSuccess && repairCustodyEvents.data.length === 0 ? (
                  <p className={styles.emptyNotice}>Chưa có sự kiện bàn giao máy sửa chữa.</p>
                ) : null}
                {acknowledgeRepairEvent.isError ? (
                  <p className={styles.errorNotice} role="alert">Không lưu được xác nhận bàn giao. Hãy thử lại.</p>
                ) : null}
              </section>
            ) : null}

            {request.requestType === "PREVENTIVE" ? (
              <section className={styles.dataPanel} aria-labelledby="custody-history-title">
                <h2 id="custody-history-title">Lịch sử bàn giao máy</h2>
                {custodyEvents.isPending ? (
                  <p className={styles.loadingNotice} role="status">Đang tải lịch sử bàn giao…</p>
                ) : null}
                {custodyEvents.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được lịch sử bàn giao.</p>
                ) : null}
                {custodyEvents.data?.length ? custodyEvents.data.map((item) => (
                  <article className={styles.recordCard} key={item.id}>
                    <div>
                      <h3>{custodyEventLabels[item.eventType]}</h3>
                      <p>{formatDateTime(item.occurredAt)} · Máy {machineLabels.get(item.machineId) || item.machineId}</p>
                      {item.conditionNotes ? <p>Tình trạng: {item.conditionNotes}</p> : null}
                      {item.evidenceReference ? (
                        <p>
                          {getHttpHref(item.evidenceReference) ? (
                            <a href={getHttpHref(item.evidenceReference)!} target="_blank" rel="noreferrer">Xem ảnh bàn giao</a>
                          ) : <>Minh chứng: <code>{item.evidenceReference}</code></>}
                        </p>
                      ) : null}
                      {item.acknowledgementUnavailableReason ? <p>Lý do chưa thể xác nhận: {item.acknowledgementUnavailableReason}</p> : null}
                      {item.ownerAcknowledgedAt ? (
                        <p>Đã xác nhận {formatDateTime(item.ownerAcknowledgedAt)}: {item.ownerAcknowledgement}</p>
                      ) : null}
                    </div>
                    {!item.ownerAcknowledgedAt ? (
                      <form
                        className={styles.formField}
                        onSubmit={(event) => {
                          event.preventDefault();
                          const acknowledgement = acknowledgements[item.id]?.trim();
                          if (acknowledgement) acknowledgeEvent.mutate({ eventId: item.id, acknowledgement });
                        }}
                      >
                        <label className={styles.formField} htmlFor={`custody-ack-${item.id}`}>
                          <span>Ghi nhận bàn giao</span>
                          <textarea
                            id={`custody-ack-${item.id}`}
                            maxLength={1000}
                            value={acknowledgements[item.id] ?? ""}
                            onChange={(event) => setAcknowledgements((current) => ({ ...current, [item.id]: event.target.value }))}
                            placeholder="Ví dụ: Đã nhận máy và xác nhận tình trạng bàn giao."
                            required
                          />
                        </label>
                        <button
                          className={styles.secondaryButton}
                          type="submit"
                          disabled={acknowledgeEvent.isPending || !acknowledgements[item.id]?.trim()}
                        >
                          {acknowledgeEvent.isPending ? "Đang lưu…" : "Xác nhận bàn giao"}
                        </button>
                      </form>
                    ) : null}
                  </article>
                )) : null}
                {custodyEvents.isSuccess && custodyEvents.data.length === 0 ? (
                  <p className={styles.emptyNotice}>Chưa có sự kiện bàn giao máy.</p>
                ) : null}
                {acknowledgeEvent.isError ? (
                  <p className={styles.errorNotice} role="alert">Không lưu được xác nhận bàn giao. Hãy thử lại.</p>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    );
  }

  const columns: readonly DataTableColumn<MaintenanceRequest>[] = [
    {
      key: "request-id",
      header: messages.SUPPORT_TABLE_REQUEST_ID,
      render: (request) => <Link className={styles.tableLink} href={`/dashboard/support/${encodeURIComponent(request.id)}`}>{request.id}</Link>,
    },
    {
      key: "type",
      header: "Loại yêu cầu",
      render: (request) => typeLabels[request.requestType],
    },
    {
      key: "machine",
      header: messages.SUPPORT_TABLE_MACHINE,
      render: (request) => machineLabels.get(request.machineId) || request.machineId,
    },
    {
      key: "content",
      header: messages.SUPPORT_TABLE_CONTENT,
      render: (request) => request.issueDescription?.trim() || "—",
    },
    {
      key: "status",
      header: messages.SUPPORT_TABLE_STATUS,
      render: (request) => {
        const repairCase = casesByRequestId.get(request.id);
        return repairCase ? repairCaseStatusLabels[repairCase.status] : requestStatusLabels[request.status];
      },
    },
  ];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-support-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-support-title">{messages.SUPPORT_TITLE}</h1>
        <p>{messages.SUPPORT_DESCRIPTION}</p>
      </header>
      <section className={styles.dataPanel} aria-labelledby="customer-support-list-heading">
        <h2 id="customer-support-list-heading">{messages.SUPPORT_LIST_TITLE}</h2>
        {isListLoading ? (
          <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p>
        ) : null}
        {list.isError || machines.isError ? (
          <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p>
        ) : null}
        {repairCases.isError && !isListLoading ? (
          <p className={styles.pendingNotice} role="status">Không tải được trạng thái chi tiết của hồ sơ sửa chữa; trạng thái yêu cầu vẫn được hiển thị.</p>
        ) : null}
        {!isListLoading && !list.isError && !machines.isError ? (
          <DataTable columns={columns} rows={requests} rowKey={(request) => request.id} variant="customer" />
        ) : null}
        {!isListLoading && !list.isError && !machines.isError && requests.length === 0 ? (
          <p className={styles.emptyNotice} role="status">{messages.SUPPORT_LIST_EMPTY}</p>
        ) : null}
      </section>
    </section>
  );
}
