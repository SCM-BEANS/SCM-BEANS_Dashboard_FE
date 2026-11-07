import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OwnerRefundPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const [disputeReason, setDisputeReason] = useState("");
  const [editingDispute, setEditingDispute] = useState(false);
  const createDispute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workflow.selectedRefundId || !disputeReason.trim()) return;
    workflow.run({ type: "CREATE_REFUND_DISPUTE", refundId: workflow.selectedRefundId, reason: disputeReason.trim() });
    setDisputeReason("");
    setEditingDispute(false);
  };
  const refund = workflow.refundDetail.data;
  const attempts = workflow.payoutAttempts.data ?? [];
  const latestAttempt = attempts[attempts.length - 1];

  return (
    <section className={styles.panel} aria-labelledby="coffee-package-refund-title">
      <div className={styles.panelHeading}>
        <div><h2 id="coffee-package-refund-title">Khoản hoàn tiền</h2><p className={styles.code}>{workflow.selectedRefundId}</p></div>
        <ButtonBar type="button" onClick={() => void workflow.refundDetail.refetch()}>Làm mới</ButtonBar>
      </div>
      {workflow.refundDetail.isPending ? <p className={styles.notice} role="status">Đang tải khoản hoàn…</p> : null}
      {workflow.refundDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.refundDetail.error)}</p> : null}
      {refund ? (
        <>
          <dl className={styles.details}>
            <div><dt>Số tiền hoàn</dt><dd>{formatCoffeePackageMoney(refund.amount, refund.currency ?? "VND")}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge status={refund.status}>{coffeePackageStatusLabel(refund.status)}</StatusBadge></dd></div>
            <div><dt>Lý do</dt><dd>{refund.reason ?? "—"}</dd></div>
            <div><dt>Đã xác nhận nhận tiền</dt><dd>{formatCoffeePackageDateTime(refund.ownerConfirmedAt)}</dd></div>
          </dl>
          {attempts.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Lần chuyển</th><th className={styles.numeric}>Số tiền</th><th>Mã giao dịch</th><th>Trạng thái</th><th>Ngày gửi</th><th /></tr></thead>
                <tbody>{attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.attemptNumber}</td><td className={styles.numeric}>{formatCoffeePackageMoney(attempt.amount, attempt.currency ?? "VND")}</td>
                    <td>{attempt.bankReference ?? "—"}</td><td><StatusBadge status={attempt.status}>{coffeePackageStatusLabel(attempt.status)}</StatusBadge></td>
                    <td>{formatCoffeePackageDateTime(attempt.createdAt)}</td>
                    <td><ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DOWNLOAD_PAYOUT", refundId: attempt.refundId, attemptNumber: attempt.attemptNumber })}>Tải chứng từ</ButtonBar></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : null}
          {refund.status === "PAYOUT_RECORDED" && ["RECORDED", "DISPUTE_CONFIRMED"].includes(latestAttempt?.status ?? "") ? (
            <div className={styles.actionRow}><span className={styles.hint}>Kiểm tra khoản tiền đã nhận trước khi xác nhận.</span><PageActions actions={[{ id: "confirm-refund", label: "Xác nhận đã nhận tiền", variant: "primary", priority: 50, pending: workflow.pending, onClick: () => workflow.run({ type: "CONFIRM_REFUND_RECEIVED", refundId: workflow.selectedRefundId }) }]} /></div>
          ) : null}
          {refund.status === "PAYOUT_RECORDED" ? (
            <form id="owner-refund-dispute-form" className={styles.subpanel} onSubmit={createDispute}>
              <h3>Báo khoản hoàn chưa chính xác</h3>
              <label className={styles.field}><span>Nội dung cần Dolores kiểm tra</span><textarea maxLength={2000} value={disputeReason} onFocus={() => setEditingDispute(true)} onChange={(event) => setDisputeReason(event.target.value)} required /></label>
              {editingDispute ? <PageActions actions={[{ id: "submit-refund-dispute", label: "Gửi yêu cầu kiểm tra", variant: "primary", priority: 100, type: "submit", form: "owner-refund-dispute-form", disabled: !disputeReason.trim(), disabledReason: "Nhập nội dung cần kiểm tra.", pending: workflow.pending }]} /> : <ButtonBar type="button" onClick={() => setEditingDispute(true)}>Báo khoản hoàn</ButtonBar>}
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
