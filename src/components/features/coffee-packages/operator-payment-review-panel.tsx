import { coffeePackagesApi } from "@/apis/coffee-packages.api";
import { CoffeePackageDownloadButton } from "./coffee-package-download-button";
import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
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

  if (workflow.selectedOrder && ["PENDING_APPROVAL", "REJECTED"].includes(workflow.selectedOrder.status)) {
    return <section className={styles.invoiceSection}><h3>Nội dung đơn</h3><p className={styles.hint}>{workflow.selectedOrder.status === "REJECTED" ? "Đơn đã bị từ chối nên không có hóa đơn." : "Hóa đơn sẽ xuất hiện sau khi đơn được duyệt."}</p></section>;
  }
  if (workflow.invoice.isPending) return <p className={styles.notice} role="status">Đang tải hóa đơn…</p>;
  if (workflow.invoice.isError) return <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.invoice.error)}</p>;
  if (!workflow.invoice.data) return <p className={styles.notice}>Hóa đơn sẽ xuất hiện sau khi đơn được duyệt.</p>;

  const invoice = workflow.invoice.data;
  return (
    <section className={styles.invoiceSection} aria-labelledby="coffee-operator-invoice-title">
      <div>
        <h3 id="coffee-operator-invoice-title">Nội dung đơn</h3>
      </div>
      <dl className={styles.details}>
        <div><dt>Số tiền hóa đơn</dt><dd>{formatCoffeePackageMoney(invoice.approvedAmount ?? invoice.total, invoice.currency ?? "VND")}</dd></div>
        <div><dt>Trạng thái hóa đơn</dt><dd><StatusBadge variant="dot" status={invoice.status}>{coffeePackageStatusLabel(invoice.status)}</StatusBadge></dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{formatCoffeePackageDateTime(invoice.dueAt)}</dd></div>
        <div><dt>Đã thanh toán lúc</dt><dd>{formatCoffeePackageDateTime(invoice.paidAt)}</dd></div>
      </dl>

      {workflow.proofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ…</p> : null}
      {workflow.proofs.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.proofs.error)}</p> : null}
      {workflow.proofs.data?.items.length ? (
        <section className={styles.paymentHistory} aria-label="Chứng từ thanh toán">
          <h4>Chứng từ thanh toán ({workflow.proofs.data.items.length})</h4>
          <ul className={styles.proofList}>
            {workflow.proofs.data.items.map((proof) => (
              <li key={proof.id} aria-current={selectedProofId === proof.id ? "true" : undefined}>
                <div className={styles.proofIdentity}>
                  <strong>{proof.originalFilename ?? "Chứng từ thanh toán"}</strong>
                  <span className={styles.orderMeta}>{formatCoffeePackageMoney(proof.amount, invoice.currency ?? "VND")} · {formatCoffeePackageDateTime(proof.submittedAt)}</span>
                  <StatusBadge variant="dot" status={proof.status}>{coffeePackageStatusLabel(proof.status)}</StatusBadge>
                  {proof.reviewReason || proof.dispositionReason ? <span className={styles.muted}>{proof.reviewReason ?? proof.dispositionReason}</span> : null}
                </div>
                <div className={styles.proofActions}>
                  <CoffeePackageDownloadButton filename={proof.originalFilename ?? "chung-tu-goi-ca-phe"} download={(signal, onProgress) => coffeePackagesApi.downloadPaymentProofContent(proof.id, signal, onProgress)} />
                  {proof.status === "SUBMITTED" ? <ButtonBar type="button" onClick={() => setSelectedProofId(proof.id)}>Đối soát</ButtonBar> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
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
            <ButtonBar variant="danger" type="button" holdToConfirm disabled={!proofReason.trim() || workflow.pending} onClick={() => reviewProof(false)}>Từ chối chứng từ</ButtonBar>
            <ButtonBar type="button" onClick={() => setSelectedProofId("")}>Đóng</ButtonBar>
          </div>
        </div>
      ) : null}
    </section>
  );
}
