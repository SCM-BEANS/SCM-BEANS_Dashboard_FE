import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { replacementAssignmentsApi } from "@/apis/replacement-assignments.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import {
  MachineTypeSchema,
  type ReplacementAssignmentCreateRequest,
} from "@/schema/machines.schema";
import styles from "./direct-replacement-assignment-panel.module.css";

type OperatorRole = "ADMIN" | "MODERATOR";
type Draft = Pick<ReplacementAssignmentCreateRequest, "replacementMachineId" | "startAt" | "endAt" | "reason">;

const emptyDraft: Draft = { replacementMachineId: "", startAt: "", endAt: "", reason: "" };

function machineLabel(machine: { machineId: string; serialNumber?: string | null; modelCode?: string | null; displayName?: string | null }) {
  const description = machine.displayName || machine.modelCode || machine.serialNumber || machine.machineId;
  return `${description} · ${machine.machineId}`;
}

export function DirectReplacementAssignmentPanel({
  contractId,
  primaryMachineId,
  machineType,
  role,
}: {
  contractId: string;
  primaryMachineId: string;
  machineType?: string | null;
  role: OperatorRole;
}) {
  const queryClient = useQueryClient();
  const parsedMachineType = MachineTypeSchema.safeParse(machineType);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [createdAssignmentId, setCreatedAssignmentId] = useState("");

  const candidates = useQuery({
    queryKey: ["dolores", role, "replacement-candidates", parsedMachineType.success ? parsedMachineType.data : "unknown"],
    queryFn: ({ signal }) => machinesApi.listRentalCandidates(signal, {
      ...(parsedMachineType.success ? { machineType: parsedMachineType.data } : {}),
      size: 100,
    }),
    enabled: parsedMachineType.success,
    retry: false,
  });

  const assignment = useQuery({
    queryKey: ["dolores", role, "replacement-assignment", createdAssignmentId],
    queryFn: ({ signal }) => replacementAssignmentsApi.getById(createdAssignmentId, signal),
    enabled: Boolean(createdAssignmentId),
    retry: false,
  });

  const create = useMutation({
    mutationFn: (input: ReplacementAssignmentCreateRequest) => replacementAssignmentsApi.create(contractId, input),
    onSuccess: async (value) => {
      setCreatedAssignmentId(value.id);
      await queryClient.invalidateQueries({ queryKey: ["dolores", role, "replacement-assignment"] });
    },
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => replacementAssignmentsApi.cancel(id, {
      reason,
      idempotencyKey: createIdempotencyKey(),
      correlationId: createIdempotencyKey(),
    }),
    onSuccess: async (value) => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", role, "replacement-assignment", value.id] });
      await assignment.refetch();
      setShowCancel(false);
      setCancelReason("");
    },
  });

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = new Date(draft.startAt);
    const end = new Date(draft.endAt);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return;
    create.mutate({
      ...draft,
      idempotencyKey: createIdempotencyKey(),
      correlationId: createIdempotencyKey(),
    });
  };

  const candidate = candidates.data?.find((item) => item.machineId === draft.replacementMachineId);
  const canCreate = parsedMachineType.success && Boolean(candidate) && candidate?.machineId !== primaryMachineId &&
    Boolean(draft.startAt && draft.endAt && draft.reason.trim()) && !create.isPending;
  const displayedAssignment = assignment.data ?? create.data;

  return (
    <section className={styles.panel} aria-labelledby="direct-replacement-title">
      <h2 id="direct-replacement-title">Thay máy tạm theo hợp đồng</h2>
      <p className={styles.description}>
        Lập lịch thay máy cùng loại cho Contract này. Hệ thống trả về trạng thái và mã assignment để theo dõi.
      </p>

      {!parsedMachineType.success ? (
        <p className={styles.notice} role="status">Không có loại máy hợp lệ trên Contract; chưa thể tìm máy thay thế phù hợp.</p>
      ) : null}
      {candidates.isPending && parsedMachineType.success ? <p className={styles.notice} role="status">Đang tải máy sẵn sàng…</p> : null}
      {candidates.isError ? (
        <div className={styles.error} role="alert">
          <p>{getApiErrorMessage(candidates.error)}</p>
          <ButtonBar type="button" onClick={() => void candidates.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {candidates.data?.length === 0 && !candidates.isError ? <p className={styles.notice} role="status">Chưa có máy cùng loại sẵn sàng.</p> : null}

      {!createdAssignmentId && parsedMachineType.success && candidates.data?.length ? (
        <form className={styles.form} onSubmit={submitCreate}>
          <label className={styles.field}>
            <span>Máy thay thế</span>
            <select required value={draft.replacementMachineId} onChange={(event) => setDraft({ ...draft, replacementMachineId: event.target.value })}>
              <option value="">Chọn máy sẵn sàng</option>
              {candidates.data.filter((item) => item.machineId !== primaryMachineId && item.machineType === parsedMachineType.data).map((item) => (
                <option key={item.machineId} value={item.machineId}>{machineLabel(item)}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Bắt đầu</span>
            <input required type="datetime-local" value={draft.startAt} onChange={(event) => setDraft({ ...draft, startAt: event.target.value })} />
          </label>
          <label className={styles.field}>
            <span>Kết thúc</span>
            <input required min={draft.startAt || undefined} type="datetime-local" value={draft.endAt} onChange={(event) => setDraft({ ...draft, endAt: event.target.value })} />
          </label>
          <label className={styles.field}>
            <span>Lý do</span>
            <textarea required maxLength={2000} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} />
          </label>
          {draft.startAt && draft.endAt && new Date(draft.endAt) <= new Date(draft.startAt) ? <p className={styles.error} role="alert">Thời điểm kết thúc phải sau thời điểm bắt đầu.</p> : null}
          {create.isError ? (
            <div className={styles.error} role="alert">
              <p>{getApiErrorMessage(create.error)}</p>
              {create.variables ? <ButtonBar type="button" disabled={create.isPending} onClick={() => create.mutate(create.variables!)}>Tải lại cùng yêu cầu</ButtonBar> : null}
            </div>
          ) : null}
          <ButtonBar type="submit" disabled={!canCreate}>{create.isPending ? "Đang lập kế hoạch…" : "Lập kế hoạch thay máy"}</ButtonBar>
        </form>
      ) : null}

      {createdAssignmentId && (
        <div className={styles.assignment}>
          {assignment.isPending ? <p className={styles.notice} role="status">Đang xác minh assignment vừa tạo…</p> : null}
          {assignment.isError ? (
            <div className={styles.error} role="alert">
              <p>Đã nhận mã assignment từ thao tác tạo nhưng chưa xác minh được trạng thái qua API đọc.</p>
              <ButtonBar type="button" onClick={() => void assignment.refetch()}>Tải lại trạng thái</ButtonBar>
            </div>
          ) : null}
          {displayedAssignment ? (
            <dl className={styles.details}>
              <div><dt>Mã assignment</dt><dd>{displayedAssignment.id}</dd></div>
              <div><dt>Trạng thái</dt><dd>{displayedAssignment.status}</dd></div>
              <div><dt>Máy chính</dt><dd>{displayedAssignment.primaryMachineId}</dd></div>
              <div><dt>Máy thay thế</dt><dd>{displayedAssignment.replacementMachineId}</dd></div>
              <div><dt>Khoảng thời gian</dt><dd>{displayedAssignment.startAt} – {displayedAssignment.endAt}</dd></div>
            </dl>
          ) : null}

          {displayedAssignment?.status === "PLANNED" ? (
            <>
              <p className={styles.notice} role="status">Kích hoạt và release đang chờ API upload/đọc evidence riêng tư được xác nhận. Không nhập URL hoặc mã evidence thủ công ở đây.</p>
              <ButtonBar type="button" disabled aria-disabled="true">Kích hoạt — cần evidence bàn giao</ButtonBar>
              {!showCancel ? (
                <ButtonBar type="button" disabled={cancel.isPending} onClick={() => setShowCancel(true)}>Hủy lịch đã lập</ButtonBar>
              ) : (
                <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (cancelReason.trim() && displayedAssignment) cancel.mutate({ id: displayedAssignment.id, reason: cancelReason.trim() }); }}>
                  <label className={styles.field}>
                    <span>Lý do hủy</span>
                    <textarea required maxLength={2000} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
                  </label>
                  {cancel.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(cancel.error)}</p> : null}
                  <div className={styles.actions}>
                    <ButtonBar type="submit" disabled={!cancelReason.trim() || cancel.isPending}>{cancel.isPending ? "Đang hủy…" : "Xác nhận hủy"}</ButtonBar>
                    <ButtonBar type="button" disabled={cancel.isPending} onClick={() => setShowCancel(false)}>Đóng</ButtonBar>
                  </div>
                </form>
              )}
            </>
          ) : null}
          {displayedAssignment?.status === "ACTIVE" ? <p className={styles.notice} role="status">Assignment đang hoạt động. Release cần private evidence và hiện đang chờ API upload/đọc được xác nhận.</p> : null}
          {displayedAssignment?.status === "CANCELLED" || displayedAssignment?.status === "RELEASED" ? <p className={styles.notice} role="status">Assignment đã kết thúc theo trạng thái do Dolores trả về.</p> : null}
        </div>
      )}
    </section>
  );
}
