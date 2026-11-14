import { coffeePackagesApi } from "@/apis/coffee-packages.api";
import { CoffeePackageDownloadButton } from "./coffee-package-download-button";
import { useState, type FormEvent } from "react";
import { PageActions } from "@/components/action-bar/page-actions";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OwnerInvoicePanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const [proofAmount, setProofAmount] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [editingProof, setEditingProof] = useState(false);

  const submitProof = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workflow.invoice.data || !proofFile) return;
    workflow.run({ type: "SUBMIT_PROOF", invoiceId: workflow.invoice.data.id, amount: Number(proofAmount), file: proofFile });
    setProofFile(null);
    setProofAmount("");
    setEditingProof(false);
  };

  if (workflow.selectedOrder && ["PENDING_APPROVAL", "REJECTED"].includes(workflow.selectedOrder.status)) {
    return <section className={styles.invoiceSection}><h3>Nội dung đơn</h3><p className={styles.hint}>{workflow.selectedOrder.status === "REJECTED" ? "Đơn đã bị từ chối nên không có hóa đơn." : "Hóa đơn sẽ xuất hiện sau khi đơn được duyệt."}</p></section>;
  }
  if (workflow.invoice.isPending) return <p className={styles.notice} role="status">Đang tải hóa đơn…</p>;
  if (workflow.invoice.isError) return <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.invoice.error)}</p>;
  const invoice = workflow.invoice.data;
  if (!invoice) return null;

  return (
    <section className={styles.invoiceSection} aria-labelledby="coffee-package-invoice-title">
      <div>
        <h3 id="coffee-package-invoice-title">Nội dung đơn</h3>
      </div>
      <dl className={styles.details}>
        <div><dt>Giá trị hóa đơn</dt><dd>{formatCoffeePackageMoney(invoice.approvedAmount ?? invoice.total, invoice.currency ?? "VND")}</dd></div>
        <div><dt>Trạng thái hóa đơn</dt><dd><StatusBadge variant="dot" status={invoice.status}>{coffeePackageStatusLabel(invoice.status)}</StatusBadge></dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{formatCoffeePackageDateTime(invoice.dueAt)}</dd></div>
      </dl>

      {invoice.status === "PENDING" ? (
        <form id="owner-invoice-proof-form" className={styles.form} onFocusCapture={() => setEditingProof(true)} onSubmit={submitProof}>
          <h4>Gửi chứng từ thanh toán</h4>
          <p className={styles.hint}>Nhập số tiền đã chuyển và tải biên lai PDF, JPG hoặc PNG (tối đa 20 MB).</p>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Số tiền đã chuyển (VND)</span><input type="number" min="1" step="0.01" value={proofAmount} onChange={(event) => setProofAmount(event.target.value)} required /></label>
            <label className={styles.field}><span>Chứng từ</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} required /></label>
          </div>
          {editingProof ? <PageActions actions={[{ id: "submit-invoice-proof", label: "Gửi chứng từ", variant: "primary", priority: 100, type: "submit", form: "owner-invoice-proof-form", disabled: !proofFile || Number(proofAmount) <= 0, disabledReason: "Nhập số tiền và chọn chứng từ.", pending: workflow.pending }]} /> : null}
        </form>
      ) : null}

      <section className={styles.paymentHistory} aria-labelledby="owner-payment-history-title">
        <h4 id="owner-payment-history-title">Chứng từ thanh toán{workflow.proofs.data ? ` (${workflow.proofs.data.items.length})` : ""}</h4>
        {invoice.paidAt ? <p className={styles.hint}>Đã thanh toán lúc {formatCoffeePackageDateTime(invoice.paidAt)}</p> : null}
      {workflow.proofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ…</p> : null}
      {workflow.proofs.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.proofs.error)}</p> : null}
      {workflow.proofs.data?.items.length ? (
        <ul className={styles.proofList}>
          {workflow.proofs.data.items.map((proof) => (
            <li key={proof.id}>
              <div className={styles.proofIdentity}>
                <strong>{proof.originalFilename ?? "Chứng từ thanh toán"}</strong>
                <span className={styles.orderMeta}>{formatCoffeePackageMoney(proof.amount, invoice.currency ?? "VND")} · {formatCoffeePackageDateTime(proof.submittedAt)}</span>
                <StatusBadge variant="dot" status={proof.status}>{coffeePackageStatusLabel(proof.status)}</StatusBadge>
                {proof.reviewReason || proof.dispositionReason ? <span className={styles.muted}>{proof.reviewReason ?? proof.dispositionReason}</span> : null}
              </div>
              <CoffeePackageDownloadButton filename={proof.originalFilename ?? "chung-tu-goi-ca-phe"} download={(signal, onProgress) => coffeePackagesApi.downloadPaymentProofContent(proof.id, signal, onProgress)} />
            </li>
          ))}
        </ul>
      ) : !workflow.proofs.isPending && !workflow.proofs.isError ? <p className={styles.notice}>Chưa có chứng từ thanh toán.</p> : null}
      </section>
    </section>
  );
}
