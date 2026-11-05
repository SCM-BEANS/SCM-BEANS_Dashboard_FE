import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OperatorPaymentReviewPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const [selectedProofId, setSelectedProofId] = useState("");
  const [proofReason, setProofReason] = useState("");
  const selectedProof = workflow.proofs.data?.items.find((proof) => proof.id === selectedProofId);

  const reviewProof = (approve: boolean) => {
    if (!selectedProofId || !proofReason.trim()) return;
    workflow.run({ type: "REVIEW_PROOF", proofId: selectedProofId, approve, reason: proofReason.trim() });
    setProofReason("");
    setSelectedProofId("");
  };

  if (workflow.invoice.isPending) return <p className={styles.notice} role="status">Đang tải hóa đơn…</p>;
  if (workflow.invoice.isError) return <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.invoice.error)}</p>;
  if (!workflow.invoice.data) return null;

  const invoice = workflow.invoice.data;
  return (
    <section className={styles.subpanel} aria-labelledby="coffee-operator-invoice-title">
      <div>
        <h3 id="coffee-operator-invoice-title">Hóa đơn và chứng từ thanh toán</h3>
        <p>Đối chiếu khoản Owner khai báo với số tiền trên hóa đơn.</p>
      </div>
      <dl className={styles.details}>
        <div><dt>Số tiền hóa đơn</dt><dd>{formatCoffeePackageMoney(invoice.approvedAmount ?? invoice.total, invoice.currency ?? "VND")}</dd></div>
        <div><dt>Trạng thái hóa đơn</dt><dd><span className={styles.status}>{coffeePackageStatusLabel(invoice.status)}</span></dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{formatCoffeePackageDateTime(invoice.dueAt)}</dd></div>
        <div><dt>Đã thanh toán lúc</dt><dd>{formatCoffeePackageDateTime(invoice.paidAt)}</dd></div>
      </dl>

      {workflow.proofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ…</p> : null}
      {workflow.proofs.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.proofs.error)}</p> : null}
      {workflow.proofs.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Tên tệp</th><th className={styles.numeric}>Số tiền khai báo</th><th>Trạng thái</th><th>Gửi lúc</th><th>Kết quả</th><th>Thao tác</th></tr></thead>
            <tbody>{workflow.proofs.data.items.map((proof) => (
              <tr key={proof.id} className={selectedProofId === proof.id ? styles.selectedRow : undefined}>
                <td>{proof.originalFilename ?? "Chứng từ thanh toán"}</td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(proof.amount, invoice.currency ?? "VND")}</td>
                <td><span className={styles.status}>{coffeePackageStatusLabel(proof.status)}</span></td>
                <td>{formatCoffeePackageDateTime(proof.submittedAt)}</td>
                <td>{proof.reviewReason ?? proof.dispositionReason ?? "Chưa có kết quả"}</td>
                <td className={styles.buttonCell}>
                  <ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DOWNLOAD_PROOF", proofId: proof.id, filename: proof.originalFilename ?? "chung-tu-goi-ca-phe" })}>Tải tệp</ButtonBar>
                  {proof.status === "SUBMITTED" ? <ButtonBar type="button" onClick={() => setSelectedProofId(proof.id)}>Đối soát</ButtonBar> : null}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : !workflow.proofs.isPending && !workflow.proofs.isError ? <p className={styles.notice}>Chưa có chứng từ thanh toán.</p> : null}

      {selectedProof ? (
        <div className={styles.reviewBox}>
          <div>
            <h4>Đối soát chứng từ</h4>
            <p>{selectedProof.originalFilename ?? "Chứng từ thanh toán"} · Owner khai báo {formatCoffeePackageMoney(selectedProof.amount, invoice.currency ?? "VND")}</p>
          </div>
          <label className={styles.field}><span>Lý do đối soát</span><textarea maxLength={2000} value={proofReason} onChange={(event) => setProofReason(event.target.value)} required /></label>
          <div className={styles.actionRow}>
            <ButtonBar type="button" disabled={!proofReason.trim() || workflow.pending} onClick={() => reviewProof(true)}>Duyệt chứng từ</ButtonBar>
            <ButtonBar type="button" disabled={!proofReason.trim() || workflow.pending} onClick={() => reviewProof(false)}>Từ chối chứng từ</ButtonBar>
            <ButtonBar type="button" onClick={() => setSelectedProofId("")}>Đóng</ButtonBar>
          </div>
        </div>
      ) : null}
    </section>
  );
}
