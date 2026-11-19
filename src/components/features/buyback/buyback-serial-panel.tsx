import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { ButtonBar } from "@/components/button/button-bar";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { BuybackSerialSchema, type BuybackCase } from "@/schema/buybacks.schema";
import { formatBuybackDateTime } from "./buyback-formatters";
import { BuybackErrorNotice } from "./buyback-workflow-shared";
import styles from "../repair-workflow/repair-workflow.module.css";

const closedStatuses = new Set(["REGISTERED", "AVAILABLE_FOR_RENT", "REJECTED", "CANCELLED"]);

export function BuybackSerialPanel({ caseData, invalidate }: {
  caseData: BuybackCase;
  invalidate: (caseId: string) => Promise<unknown>;
}) {
  const [newSerial, setNewSerial] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ["dolores", "buyback-serial-history", authScopedQuerySubject("MODERATOR"), caseData.id],
    queryFn: ({ signal }) => buybacksApi.listSerialHistory(caseData.id, signal),
    enabled: open,
    retry: false,
  });
  const correction = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.correctSerial>[1]) => buybacksApi.correctSerial(caseData.id, input),
    onSuccess: () => { setNewSerial(""); setReason(""); },
    onSettled: () => Promise.all([invalidate(caseData.id), history.refetch()]),
  });
  const canCorrect = !closedStatuses.has(caseData.status)
    && !caseData.registeredMachineId && caseData.serialRevision !== undefined;
  const validSerial = BuybackSerialSchema.safeParse(newSerial);

  return <details className={styles.formPanel} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>Serial khai báo và lịch sử cập nhật</summary>
    <p>Serial hiện tại: {caseData.intakeSerial ?? "Chưa khai báo"}</p>
    {canCorrect ? (
      <form className={styles.assignmentForm} onSubmit={(event) => {
        event.preventDefault();
        if (!validSerial.success || !reason.trim() || caseData.serialRevision === undefined || correction.isPending) return;
        correction.mutate({
          expectedSerial: caseData.intakeSerial ?? null,
          expectedRevision: caseData.serialRevision,
          newSerial: validSerial.data,
          reason: reason.trim(),
          correlationId: createIdempotencyKey(),
        });
      }}>
        <p className={styles.formHint}>Chỉ sửa khi đã kiểm tra tem máy. Chứng cứ thu máy trước đó sẽ phải xác minh lại.</p>
        <label className={styles.formField}><span>Serial đã xác minh</span>
          <input required maxLength={160} value={newSerial} onChange={(event) => setNewSerial(event.target.value)} />
        </label>
        {newSerial && !validSerial.success ? <p role="alert">Serial chỉ dùng ký tự ASCII in được, tối đa 160 ký tự.</p> : null}
        <label className={styles.formField}><span>Lý do sửa serial</span>
          <textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <ButtonBar type="submit" disabled={!validSerial.success || !reason.trim() || correction.isPending}>Lưu serial</ButtonBar>
      </form>
    ) : null}
    {correction.isError ? <BuybackErrorNotice error={correction.error} /> : null}
    {open && history.isFetching ? <p role="status">Đang tải lịch sử serial…</p> : null}
    {history.isError ? <div><BuybackErrorNotice error={history.error} /><ButtonBar type="button" onClick={() => void history.refetch()}>Tải lại lịch sử</ButtonBar></div> : null}
    {history.data?.length === 0 ? <p>Chưa có lần sửa serial nào.</p> : null}
    {history.data?.length ? <ul>{history.data.map((item) => (
      <li key={item.id}><strong>{item.oldSerial ?? "Chưa khai báo"} → {item.newSerial}</strong>
        <div>{formatBuybackDateTime(item.occurredAt)} · {item.reason}</div>
      </li>
    ))}</ul> : null}
  </details>;
}
