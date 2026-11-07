import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
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

  if (workflow.invoice.isPending) return <p className={styles.notice} role="status">Đang tải hóa đơn…</p>;
  if (workflow.invoice.isError) return <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.invoice.error)}</p>;
  const invoice = workflow.invoice.data;
  if (!invoice) return null;

  return (
    <section className={styles.subpanel} aria-labelledby="coffee-package-invoice-title">
      <div>
        <h3 id="coffee-package-invoice-title">Hóa đơn và chứng từ</h3>
        <p>Kiểm tra số tiền, thời hạn thanh toán và kết quả đối soát.</p>
      </div>
      <dl className={styles.details}>
        <div><dt>Số tiền cần thanh toán</dt><dd>{formatCoffeePackageMoney(invoice.approvedAmount ?? invoice.total, invoice.currency ?? "VND")}</dd></div>
        <div><dt>Trạng thái hóa đơn</dt><dd><StatusBadge status={invoice.status}>{coffeePackageStatusLabel(invoice.status)}</StatusBadge></dd></div>
        <div><dt>Hạn thanh toán</dt><dd>{formatCoffeePackageDateTime(invoice.dueAt)}</dd></div>
        <div><dt>Đã thanh toán lúc</dt><dd>{formatCoffeePackageDateTime(invoice.paidAt)}</dd></div>
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

      {workflow.proofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ…</p> : null}
      {workflow.proofs.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.proofs.error)}</p> : null}
      {workflow.proofs.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Tên tệp</th><th className={styles.numeric}>Số tiền khai báo</th><th>Trạng thái</th><th>Gửi lúc</th><th>Kết quả đối soát</th><th /></tr></thead>
            <tbody>{workflow.proofs.data.items.map((proof) => (
              <tr key={proof.id}>
                <td>{proof.originalFilename ?? "Chứng từ thanh toán"}</td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(proof.amount, invoice.currency ?? "VND")}</td>
                <td><StatusBadge status={proof.status}>{coffeePackageStatusLabel(proof.status)}</StatusBadge></td>
                <td>{formatCoffeePackageDateTime(proof.submittedAt)}</td>
                <td>{proof.reviewReason ?? proof.dispositionReason ?? "Đang chờ đối soát"}</td>
                <td><ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DOWNLOAD_PROOF", proofId: proof.id, filename: proof.originalFilename ?? "chung-tu-goi-ca-phe" })}>Tải chứng từ</ButtonBar></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : !workflow.proofs.isPending && !workflow.proofs.isError ? <p className={styles.notice}>Chưa có chứng từ thanh toán.</p> : null}
    </section>
  );
}
