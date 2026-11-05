import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OperatorPayoutAttemptsPanel } from "./operator-payout-attempts-panel";

export function OperatorRefundDetailPanel({
  workflow,
  isAdmin,
}: {
  workflow: CoffeePackageWorkflowController;
  isAdmin: boolean;
}) {
  const [reason, setReason] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [resolution, setResolution] = useState<"CONFIRM_PAYOUT" | "RETRY_PAYOUT">("CONFIRM_PAYOUT");
  const refund = workflow.refundDetail.data;
  const payoutAttempts = workflow.payoutAttempts.data ?? [];
  const latestPayoutAttempt = payoutAttempts[payoutAttempts.length - 1];
  const payoutDisputed = refund?.status === "PAYOUT_RECORDED" && latestPayoutAttempt?.status === "DISPUTED";

  const approveRefund = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refund || !reason.trim()) return;
    workflow.run({ type: "APPROVE_REFUND", refundId: refund.id, reason: reason.trim() });
    setReason("");
  };

  const createPayout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refund || !bankReference.trim() || !reason.trim() || !evidence) return;
    workflow.run({ type: "CREATE_PAYOUT", refundId: refund.id, bankReference: bankReference.trim(), reason: reason.trim(), evidence });
    setBankReference("");
    setReason("");
    setEvidence(null);
    event.currentTarget.reset();
  };

  const resolveDispute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refund || !reason.trim()) return;
    workflow.run({ type: "RESOLVE_REFUND_DISPUTE", refundId: refund.id, resolution, reason: reason.trim() });
    setReason("");
  };

  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-refund-detail-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-refund-detail-title">Chi tiết khoản hoàn</h2>
          <p className={styles.code}>{workflow.selectedRefundId}</p>
        </div>
        <ButtonBar type="button" onClick={() => void workflow.refundDetail.refetch()}>Làm mới</ButtonBar>
      </div>
      {workflow.refundDetail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết hoàn tiền…</p> : null}
      {workflow.refundDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.refundDetail.error)}</p> : null}
      {refund ? (
        <>
          <dl className={styles.details}>
            <div><dt>Trạng thái</dt><dd><span className={styles.status}>{coffeePackageStatusLabel(refund.status)}</span></dd></div>
            <div><dt>Số tiền hoàn</dt><dd>{formatCoffeePackageMoney(refund.amount, refund.currency ?? "VND")}</dd></div>
            <div><dt>Đơn hàng</dt><dd className={styles.code}>{refund.orderId ?? "—"}</dd></div>
            <div><dt>Hóa đơn</dt><dd className={styles.code}>{refund.invoiceId ?? "—"}</dd></div>
            <div><dt>Lý do</dt><dd>{refund.reason ?? "—"}</dd></div>
            <div><dt>Chuyển khoản gần nhất</dt><dd>{refund.payoutBankReference ?? "—"}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{formatCoffeePackageDateTime(refund.createdAt)}</dd></div>
            <div><dt>Owner xác nhận</dt><dd>{formatCoffeePackageDateTime(refund.ownerConfirmedAt)}</dd></div>
          </dl>

          {refund.status === "REQUESTED" ? (
            <form className={styles.subpanel} onSubmit={approveRefund}>
              <h3>Duyệt khoản hoàn</h3>
              <label className={styles.field}><span>Ghi chú phê duyệt</span><textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
              <ButtonBar type="submit" disabled={!reason.trim() || workflow.pending}>Duyệt hoàn tiền</ButtonBar>
            </form>
          ) : null}

          {refund.status === "APPROVED" ? (
            <form className={styles.subpanel} onSubmit={createPayout}>
              <h3>Ghi nhận chuyển khoản</h3>
              <p>Đính kèm biên nhận chuyển khoản để Owner có thể xác nhận đã nhận tiền.</p>
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Mã giao dịch ngân hàng</span><input value={bankReference} onChange={(event) => setBankReference(event.target.value)} maxLength={160} required /></label>
                <label className={styles.field}><span>Chứng từ chuyển khoản (PDF, JPEG hoặc PNG)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} required /></label>
              </div>
              <label className={styles.field}><span>Ghi chú chuyển khoản</span><textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
              <ButtonBar type="submit" disabled={!bankReference.trim() || !reason.trim() || !evidence || workflow.pending}>Lưu chứng từ chuyển khoản</ButtonBar>
            </form>
          ) : null}

          {isAdmin && payoutDisputed ? (
            <form className={styles.subpanel} onSubmit={resolveDispute}>
              <h3>Xử lý tranh chấp khoản hoàn</h3>
              <p>Owner đã báo tranh chấp lần chuyển khoản gần nhất. Chọn kết quả sau khi xác minh.</p>
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Hướng xử lý</span><select value={resolution} onChange={(event) => setResolution(event.target.value as typeof resolution)}><option value="CONFIRM_PAYOUT">Xác nhận đã chuyển khoản</option><option value="RETRY_PAYOUT">Cho phép chuyển lại</option></select></label>
                <label className={styles.field}><span>Lý do</span><textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
              </div>
              <ButtonBar type="submit" disabled={!reason.trim() || workflow.pending}>Lưu hướng xử lý</ButtonBar>
            </form>
          ) : null}

          <OperatorPayoutAttemptsPanel workflow={workflow} refund={refund} />
        </>
      ) : null}
    </section>
  );
}
