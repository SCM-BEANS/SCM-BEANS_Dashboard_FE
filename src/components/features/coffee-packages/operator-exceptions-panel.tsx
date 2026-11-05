import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

type Disposition = "NO_FUNDS" | "EXCESS_RETURNED" | "EXCESS_INCLUDED_IN_REFUND";

export function OperatorExceptionsPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const [selectedProofId, setSelectedProofId] = useState("");
  const [disposition, setDisposition] = useState<Disposition>("NO_FUNDS");
  const [verifiedAmount, setVerifiedAmount] = useState("0");
  const [bankReference, setBankReference] = useState("");
  const [returnBankReference, setReturnBankReference] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<File | null>(null);
  const proof = workflow.exceptions.data?.items.find((item) => item.id === selectedProofId);

  const submitDisposition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!proof || !bankReference.trim() || !reason.trim() || !evidence) return;
    workflow.run({
      type: "DISPOSE_EXCEPTION",
      proofId: proof.id,
      disposition,
      verifiedAmount: Number(verifiedAmount),
      bankReference: bankReference.trim(),
      ...(returnBankReference.trim() ? { returnBankReference: returnBankReference.trim() } : {}),
      reason: reason.trim(),
      evidence,
    });
    setSelectedProofId("");
    setDisposition("NO_FUNDS");
    setVerifiedAmount("0");
    setBankReference("");
    setReturnBankReference("");
    setReason("");
    setEvidence(null);
    event.currentTarget.reset();
  };

  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-exceptions-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-exceptions-title">Thanh toán ngoại lệ</h2>
          <p>Đối soát khoản tiền không khớp và ghi nhận cách xử lý phần chênh lệch.</p>
        </div>
        {workflow.exceptions.data ? <span>{workflow.exceptions.data.items.length} khoản cần xem</span> : null}
      </div>
      {workflow.exceptions.isPending ? <p className={styles.notice} role="status">Đang tải khoản thanh toán ngoại lệ…</p> : null}
      {workflow.exceptions.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.exceptions.error)}</p> : null}
      {!workflow.exceptions.isPending && !workflow.exceptions.isError && workflow.exceptions.data?.items.length === 0 ? <p className={styles.notice}>Không có khoản thanh toán ngoại lệ.</p> : null}

      {workflow.exceptions.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Chứng từ</th><th>Hóa đơn</th><th className={styles.numeric}>Đã khai báo</th><th>Trạng thái</th><th>Gửi lúc</th><th /></tr></thead>
            <tbody>{workflow.exceptions.data.items.map((item) => (
              <tr key={item.id} className={selectedProofId === item.id ? styles.selectedRow : undefined}>
                <td>{item.originalFilename ?? item.id}</td>
                <td className={styles.code}>{item.invoiceId}</td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(item.amount, "VND")}</td>
                <td><span className={styles.status}>{coffeePackageStatusLabel(item.status)}</span></td>
                <td>{formatCoffeePackageDateTime(item.submittedAt)}</td>
                <td className={styles.buttonCell}>
                  <ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DOWNLOAD_PROOF", proofId: item.id, filename: item.originalFilename ?? "chung-tu-thanh-toan" })}>Tải chứng từ</ButtonBar>
                  {item.dispositionEvidencePath ? <ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DOWNLOAD_DISPOSITION_EVIDENCE", proofId: item.id })}>Tải biên nhận xử lý</ButtonBar> : null}
                  <ButtonBar type="button" onClick={() => setSelectedProofId(item.id)}>Xử lý</ButtonBar>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}

      {proof ? (
        <form className={styles.subpanel} onSubmit={submitDisposition}>
          <div>
            <h3>Xử lý khoản thanh toán</h3>
            <p>{proof.originalFilename ?? "Chứng từ thanh toán"} · số tiền Owner khai báo {formatCoffeePackageMoney(proof.amount, "VND")}</p>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Cách xử lý</span>
              <select value={disposition} onChange={(event) => setDisposition(event.target.value as Disposition)}>
                <option value="NO_FUNDS">Không nhận được tiền</option>
                <option value="EXCESS_RETURNED">Đã hoàn phần tiền thừa</option>
                <option value="EXCESS_INCLUDED_IN_REFUND">Gộp phần tiền thừa vào khoản hoàn</option>
              </select>
            </label>
            <label className={styles.field}><span>Số tiền đã xác minh (VND)</span><input type="number" min="0" step="0.01" value={verifiedAmount} onChange={(event) => setVerifiedAmount(event.target.value)} required /></label>
            <label className={styles.field}><span>Mã giao dịch ngân hàng</span><input value={bankReference} onChange={(event) => setBankReference(event.target.value)} maxLength={160} required /></label>
            {disposition === "EXCESS_RETURNED" ? <label className={styles.field}><span>Mã giao dịch hoàn phần dư</span><input value={returnBankReference} onChange={(event) => setReturnBankReference(event.target.value)} maxLength={160} /></label> : null}
            <label className={styles.field}><span>Biên nhận xử lý (PDF, JPEG hoặc PNG)</span><input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} required /></label>
            <label className={styles.field}><span>Lý do / ghi chú</span><textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
          </div>
          {disposition === "NO_FUNDS" ? <p className={styles.hint}>Với lựa chọn này, số tiền đã xác minh phải bằng 0.</p> : null}
          <div className={styles.actionRow}>
            <ButtonBar type="submit" disabled={!bankReference.trim() || !reason.trim() || !evidence || (disposition === "NO_FUNDS" && Number(verifiedAmount) !== 0) || workflow.pending}>Lưu kết quả xử lý</ButtonBar>
            <ButtonBar type="button" onClick={() => setSelectedProofId("")}>Đóng</ButtonBar>
          </div>
        </form>
      ) : null}
    </section>
  );
}
