import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject } from "@/lib/query-subject";
import type { TerminationCaseCreateRequest } from "@/schema/termination-workflow.schema";
import { RecallWorkOrdersScreen } from "./recall-work-orders-screen";
import styles from "../repair-workflow/repair-workflow.module.css";

export function ContractTerminationPanel({ contractId, role }: { contractId: string; role: "ADMIN" | "MODERATOR" }) {
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject(role);
  const [caseId, setCaseId] = useState("");
  const [type, setType] = useState<TerminationCaseCreateRequest["type"]>("NORMAL");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const recallOrders = useQuery({
    queryKey: ["dolores", "recall-work-orders", subject, contractId, 0],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ contractId, page: 0, size: 20 }, signal),
    retry: false,
  });
  const openRecallCaseId = recallOrders.data?.content.find((item) => item.status !== "CANCELLED")?.terminationCaseId ?? "";
  const activeCaseId = caseId || openRecallCaseId;
  const terminationCase = useQuery({
    queryKey: ["dolores", "termination-case", subject, activeCaseId],
    queryFn: ({ signal }) => terminationCasesApi.getById(activeCaseId, signal),
    enabled: Boolean(activeCaseId),
    retry: false,
  });
  const invalidate = async (returnedId?: string) => {
    await Promise.allSettled([
      recallOrders.refetch(),
      ...(activeCaseId || returnedId ? [queryClient.invalidateQueries({ queryKey: ["dolores", "termination-case", subject, returnedId ?? activeCaseId] })] : []),
    ]);
  };
  const create = useMutation({
    mutationFn: (input: TerminationCaseCreateRequest) => terminationCasesApi.create(contractId, input),
    onSuccess: async (value) => {
      setCaseId(value.id);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", subject, contractId] });
    },
    onSettled: async (_data, _error, variables) => invalidate(_data?.id),
  });
  const beginRecovery = useMutation({
    mutationFn: () => terminationCasesApi.beginRecovery(activeCaseId, { correlationId: createIdempotencyKey() }),
    onSettled: async (_data) => invalidate(_data?.id),
  });
  const reject = useMutation({
    mutationFn: () => terminationCasesApi.reject(activeCaseId, { reason: rejectReason.trim(), correlationId: createIdempotencyKey() }),
    onSettled: async (_data) => invalidate(_data?.id),
  });

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      type,
      reason: reason.trim(),
      ...(effectiveDate ? { effectiveDate } : {}),
      idempotencyKey: createIdempotencyKey(),
      correlationId: createIdempotencyKey(),
    };
    create.mutate(input);
  };

  const hasOpenRecall = Boolean(openRecallCaseId);
  return (
    <section className={styles.panel} aria-labelledby="termination-contract-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="termination-contract-title">Kết thúc hợp đồng và thu hồi máy</h2>
          <p>Case chỉ được chuyển Contract sang TERMINATED sau kiểm tra, settlement và xác nhận hoàn tất từ Dolores.</p>
        </div>
        <ButtonBar type="button" disabled={recallOrders.isFetching} onClick={() => void recallOrders.refetch()}>Làm mới</ButtonBar>
      </div>
      {recallOrders.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(recallOrders.error)}</p><ButtonBar type="button" onClick={() => void recallOrders.refetch()}>Thử lại</ButtonBar></div> : null}
      {!activeCaseId && !hasOpenRecall && recallOrders.isSuccess ? (
        <form className={styles.assignmentForm} onSubmit={submitCreate}>
          <label className={styles.formField}><span>Loại kết thúc</span><select value={type} onChange={(event) => setType(event.target.value as TerminationCaseCreateRequest["type"])}><option value="NORMAL">Theo hạn mức / thông thường</option><option value="EARLY">Trước hạn</option><option value="VIOLATION">Do vi phạm</option></select></label>
          <label className={styles.formField}><span>Lý do</span><textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <label className={styles.formField}><span>Ngày hiệu lực (tùy chọn)</span><input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
          {create.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(create.error)}</p>{create.variables ? <ButtonBar type="button" onClick={() => create.mutate(create.variables!)}>Gửi lại cùng idempotency key</ButtonBar> : null}</div> : null}
          <ButtonBar type="submit" disabled={!reason.trim() || create.isPending || create.isError}>{create.isPending ? "Đang mở case…" : "Mở termination case"}</ButtonBar>
        </form>
      ) : null}

      {activeCaseId && terminationCase.isPending ? <p className={styles.notice} role="status">Đang tải trạng thái hồ sơ kết thúc…</p> : null}
      {activeCaseId && terminationCase.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(terminationCase.error)}</p><ButtonBar type="button" onClick={() => void terminationCase.refetch()}>Thử lại</ButtonBar></div> : null}
      {terminationCase.data ? (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}><dt>Case</dt><dd className={styles.codeValue}>{terminationCase.data.id}</dd></div>
            <div className={styles.detailItem}><dt>Trạng thái case</dt><dd>{terminationCase.data.status}</dd></div>
            <div className={styles.detailItem}><dt>Máy</dt><dd className={styles.codeValue}>{terminationCase.data.machineId}</dd></div>
            <div className={styles.detailItem}><dt>Inspection ticket</dt><dd className={styles.codeValue}>{terminationCase.data.inspectionTicketId ?? "Chưa tạo"}</dd></div>
          </dl>
          {terminationCase.data.status === "REQUESTED" ? (
            <div className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Bắt đầu thu hồi</h3>
              {beginRecovery.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(beginRecovery.error)}</p> : null}
              <ButtonBar type="button" disabled={beginRecovery.isPending || recallOrders.isError} onClick={() => beginRecovery.mutate()}>{beginRecovery.isPending ? "Đang bắt đầu…" : "Bắt đầu thu hồi máy"}</ButtonBar>
            </div>
          ) : null}
          {terminationCase.data.status === "REQUESTED" ? (
            <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); if (rejectReason.trim()) reject.mutate(); }}>
              <h3 className={styles.sectionTitle}>Từ chối yêu cầu</h3>
              <label className={styles.formField}><span>Lý do từ chối</span><textarea required maxLength={2000} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></label>
              {reject.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(reject.error)}</p> : null}
              <ButtonBar type="submit" disabled={!rejectReason.trim() || reject.isPending}>Từ chối case</ButtonBar>
            </form>
          ) : null}
          {terminationCase.data.status === "RECOVERY_PENDING" ? <p className={styles.notice} role="status">Đang chờ kỹ thuật viên nhận máy, Owner xác nhận bàn giao và operator duyệt biên nhận kho.</p> : null}
          {terminationCase.data.status === "SETTLEMENT_PENDING" ? <p className={styles.notice} role="status">Kiểm tra đã xong. Settlement cần evidence riêng tư; Maintenance Ticket hiện chưa có API upload/đọc evidence được xác nhận.</p> : null}
          {terminationCase.data.status === "APPROVED" ? <p className={styles.notice} role="status">Settlement đã được backend chấp nhận. Chỉ gọi hoàn tất khi mọi handover/inspection đã được xác nhận.</p> : null}
          {terminationCase.data.status === "COMPLETED" ? <p className={styles.notice} role="status">Dolores đã hoàn tất hồ sơ và trả về Contract chấm dứt.</p> : null}
          <RecallWorkOrdersScreen role="operator" queryScopeRole={role} contractId={contractId} />
        </>
      ) : null}
      {!activeCaseId && recallOrders.isPending ? <p className={styles.notice} role="status">Đang kiểm tra lệnh thu hồi đang mở…</p> : null}
      {!activeCaseId && hasOpenRecall ? <p className={styles.notice} role="status">Đã phát hiện lệnh thu hồi đang mở. Mã case: {openRecallCaseId}</p> : null}
      {role === "MODERATOR" ? <p className={styles.formHint}>Moderator chỉ thao tác trong phạm vi Contract được backend cho phép.</p> : null}
    </section>
  );
}
