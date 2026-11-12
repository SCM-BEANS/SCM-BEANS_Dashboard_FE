import { Fragment, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { PaymentProof } from "@/schema/billing.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { DataTable } from "@/components/table/data-table";
import { moderatorStyles as styles } from "../moderator-shell";
import { amountText } from "./invoice-shared";
import {
  InvoicePaymentProofImagePreview,
  isPreviewableInvoicePaymentProofImage,
} from "./payment-proof-image-preview";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

function formatProofSubmittedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function proofStatusText(status: PaymentProof["status"]): string {
  if (status === "SUBMITTED") return messages.PROOF_STATUS_SUBMITTED;
  if (status === "APPROVED") return messages.PROOF_STATUS_APPROVED;
  if (status === "REJECTED") return messages.PROOF_STATUS_REJECTED;
  return status;
}

function proofStatusClassName(status: PaymentProof["status"]) {
  if (status === "APPROVED") return styles.paymentProofStatusAPPROVED;
  if (status === "REJECTED") return styles.paymentProofStatusREJECTED;
  return styles.paymentProofStatusSUBMITTED;
}

export function PaymentProofList({ proofs, invoiceId, currency }: { proofs: PaymentProof[]; invoiceId: string; currency: string }) {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reviewSelection, setReviewSelection] = useState<{ proofId: string; approve: boolean } | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const review = useMutation({
    mutationFn: (input: { proofId: string; approve: boolean; reason: string }) =>
      billingApi.reviewPaymentProof(input),
    onMutate: () => setReviewError(null),
    onSuccess: async () => {
      setReviewSelection(null);
      setReviewReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "billing", "invoice", invoiceId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "billing", "invoices"] }),
      ]);
    },
    onError: (error) => setReviewError(getApiErrorMessage(error)),
  });

  async function download(proof: PaymentProof) {
    setDownloadingId(proof.id);
    setDownloadError(null);
    try {
      const blob = await billingApi.downloadPaymentProofContent(proof.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = proof.originalFilename || proof.id;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-payment-proofs">
      <h2 id="moderator-payment-proofs" className={styles.sectionTitle}>{messages.PAYMENT_PROOFS}</h2>
      {proofs.length === 0 ? (
        <p role="status">{messages.EMPTY_PAYMENT_PROOFS}</p>
      ) : (
        <DataTable
          variant="moderator"
          className={styles.paymentProofTable}
          minWidth={1240}
          headers={["Chứng từ", messages.PROOF_STATUS, messages.PROOF_AMOUNT, messages.PROOF_SUBMITTED_AT, messages.PROOF_CONTENT, messages.PROOF_ACTION]}
        >
          {proofs.map((proof) => (
            <Fragment key={proof.id}>
              <tr>
                <td className={styles.proofFilenameCell}>
                  <div className={styles.proofFilePreview}>
                    {isPreviewableInvoicePaymentProofImage(proof.contentType) ? (
                      <InvoicePaymentProofImagePreview proof={proof} />
                    ) : (
                      <span className={styles.proofFileTypeBadge}>
                        {proof.contentType === "application/pdf" ? "PDF" : "Tệp đính kèm"}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`${styles.paymentProofStatus} ${proofStatusClassName(proof.status)}`}>
                    {proofStatusText(proof.status)}
                  </span>
                </td>
                <td>{proof.amount == null ? messages.PROOF_AMOUNT_UNAVAILABLE : amountText(proof.amount, proof.currency ?? currency)}</td>
                <td><time dateTime={proof.submittedAt}>{formatProofSubmittedAt(proof.submittedAt)}</time></td>
                <td className={styles.proofContentCell}>
                  {proof.reviewedAt && proof.reviewReason?.trim()
                    ? proof.reviewReason
                    : proof.status === "SUBMITTED"
                      ? messages.PROOF_AWAITING_REVIEW
                      : messages.PROOF_NO_REVIEW_NOTE}
                </td>
                <td>
                  <div className={styles.proofActionCell}>
                    <button className={`${styles.retryButton} ${styles.proofActionButton}`} type="button" disabled={downloadingId === proof.id} onClick={() => void download(proof)}>
                      {downloadingId === proof.id ? messages.DOWNLOADING_PROOF : messages.DOWNLOAD_PROOF}
                    </button>
                    {proof.status === "SUBMITTED" && (
                      <div className={styles.proofReviewChoices}>
                        <button className={`${styles.retryButton} ${styles.proofActionButton}`} type="button" disabled={review.isPending} onClick={() => { setReviewSelection({ proofId: proof.id, approve: true }); setReviewReason(""); setReviewError(null); }}>
                          {messages.APPROVE_PROOF}
                        </button>
                        <button className={`${styles.retryButton} ${styles.proofActionButton}`} type="button" disabled={review.isPending} onClick={() => { setReviewSelection({ proofId: proof.id, approve: false }); setReviewReason(""); setReviewError(null); }}>
                          {messages.REJECT_PROOF}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {reviewSelection?.proofId === proof.id && (
                <tr className={styles.proofReviewRow}>
                  <td colSpan={6}>
                    <section className={styles.proofReviewPanel} aria-labelledby={`payment-proof-review-title-${proof.id}`}>
                      <div className={styles.proofReviewHeader}>
                        <div>
                          <h3 id={`payment-proof-review-title-${proof.id}`} className={styles.proofReviewTitle}>
                            {reviewSelection.approve ? "Duyệt chứng từ thanh toán" : "Từ chối chứng từ thanh toán"}
                          </h3>
                          <p className={styles.proofReviewHelp}>Ghi rõ căn cứ đối soát để lưu cùng kết quả xử lý chứng từ này.</p>
                        </div>
                        <button className={`${styles.retryButton} ${styles.proofReviewCancel}`} type="button" disabled={review.isPending} onClick={() => { setReviewSelection(null); setReviewReason(""); setReviewError(null); }}>
                          {messages.CANCEL}
                        </button>
                      </div>
                      <label className={styles.proofReviewLabel} htmlFor={`payment-proof-reason-${proof.id}`}>
                        {messages.PROOF_REVIEW_REASON} <span>Bắt buộc</span>
                      </label>
                      <textarea
                        className={styles.proofReviewTextarea}
                        id={`payment-proof-reason-${proof.id}`}
                        value={reviewReason}
                        maxLength={1000}
                        required
                        aria-required="true"
                        aria-describedby={`payment-proof-reason-help-${proof.id}${reviewError ? ` payment-proof-review-error-${proof.id}` : ""}`}
                        placeholder={reviewSelection.approve
                          ? "Ví dụ: Đã xác nhận số tiền và giao dịch khớp với hóa đơn."
                          : "Nêu rõ điểm chưa khớp, chẳng hạn số tiền hoặc thông tin giao dịch."}
                        rows={3}
                        disabled={review.isPending}
                        onChange={(event) => setReviewReason(event.target.value)}
                      />
                      <div className={styles.proofReviewFooter}>
                        <p className={styles.proofReviewCounter} id={`payment-proof-reason-help-${proof.id}`}>
                          {reviewReason.trim().length === 0 ? "Nhập lý do để tiếp tục." : "Nội dung sẽ được lưu vào lịch sử đối soát."} · {reviewReason.length}/1000
                        </p>
                        <button
                          className={`${styles.retryButton} ${styles.proofReviewSubmit}`}
                          type="button"
                          disabled={!reviewReason.trim() || review.isPending}
                          onClick={() => review.mutate({ proofId: proof.id, approve: reviewSelection.approve, reason: reviewReason.trim() })}
                        >
                          {review.isPending && review.variables?.proofId === proof.id
                            ? messages.PROOF_REVIEWING
                            : reviewSelection.approve ? "Xác nhận duyệt" : "Xác nhận từ chối"}
                        </button>
                      </div>
                      {reviewError && <p className={styles.proofReviewError} id={`payment-proof-review-error-${proof.id}`} role="alert">{reviewError}</p>}
                    </section>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </DataTable>
      )}
      {downloadError && <p role="alert">{downloadError}</p>}
      <p className={styles.formHint}>{messages.INVOICE_PROOF_SCOPE} {invoiceId}</p>
    </section>
  );
}
