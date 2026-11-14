import { coffeePackagesApi } from "@/apis/coffee-packages.api";
import { CoffeePackageDownloadButton } from "./coffee-package-download-button";
import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageRefund } from "@/schema/coffee-packages.schema";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OperatorPayoutAttemptsPanel({
  workflow,
  refund,
}: {
  workflow: CoffeePackageWorkflowController;
  refund: CoffeePackageRefund;
}) {
  const [failedAttemptNumber, setFailedAttemptNumber] = useState<number | null>(null);
  const [failedReason, setFailedReason] = useState("");

  const markPayoutFailed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (failedAttemptNumber == null || !failedReason.trim()) return;
    workflow.run({ type: "PAYOUT_FAILED", refundId: refund.id, attemptNumber: failedAttemptNumber, reason: failedReason.trim() });
    setFailedAttemptNumber(null);
    setFailedReason("");
  };

  return (
    <section aria-labelledby="coffee-payout-attempts-title">
      <div className={styles.panelHeading}>
        <h3 id="coffee-payout-attempts-title">Lịch sử chuyển khoản</h3>
        {workflow.payoutAttempts.data ? <span>{workflow.payoutAttempts.data.length} lần</span> : null}
      </div>
      {workflow.payoutAttempts.isPending ? <p className={styles.notice} role="status">Đang tải lịch sử chuyển khoản…</p> : null}
      {workflow.payoutAttempts.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.payoutAttempts.error)}</p> : null}
      {workflow.payoutAttempts.data?.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Lần chuyển</th><th>Mã giao dịch</th><th>Thời điểm</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{workflow.payoutAttempts.data.map((attempt) => (
              <tr key={attempt.id}>
                <td>{attempt.attemptNumber}</td>
                <td>{attempt.bankReference ?? "—"}</td>
                <td>{formatCoffeePackageDateTime(attempt.createdAt)}</td>
                <td><StatusBadge variant="dot" status={attempt.status}>{coffeePackageStatusLabel(attempt.status)}</StatusBadge></td>
                <td className={styles.buttonCell}>
                  <CoffeePackageDownloadButton filename="chung-tu-hoan-tien" download={(signal, onProgress) => coffeePackagesApi.downloadPayoutEvidenceContent(refund.id, attempt.attemptNumber, signal, onProgress)} />
                  {refund.status === "PAYOUT_RECORDED" && attempt.status === "RECORDED" && attempt.attemptNumber === refund.payoutAttempt ? <ButtonBar type="button" disabled={workflow.pending} onClick={() => setFailedAttemptNumber(attempt.attemptNumber)}>Ghi nhận thất bại</ButtonBar> : null}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : !workflow.payoutAttempts.isPending && !workflow.payoutAttempts.isError ? <p className={styles.notice}>Chưa có lần chuyển khoản nào.</p> : null}
      {failedAttemptNumber != null ? (
        <form className={styles.reviewBox} onSubmit={markPayoutFailed}>
          <h4>Ghi nhận lần chuyển {failedAttemptNumber} không thành công</h4>
          <label className={styles.field}><span>Lý do</span><textarea maxLength={2000} value={failedReason} onChange={(event) => setFailedReason(event.target.value)} required /></label>
          <div className={styles.actionRow}>
            <ButtonBar type="submit" disabled={!failedReason.trim() || workflow.pending}>Lưu lý do</ButtonBar>
            <ButtonBar type="button" onClick={() => { setFailedAttemptNumber(null); setFailedReason(""); }}>Hủy</ButtonBar>
          </div>
        </form>
      ) : null}
    </section>
  );
}
