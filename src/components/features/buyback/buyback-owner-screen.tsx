import { ButtonBar } from "@/components/button/button-bar";
import { buybackPaymentProofStatusLabel, formatBuybackDateTime, formatBuybackMoney } from "./buyback-formatters";
import {
  BuybackCaseList,
  BuybackCreatePanel,
  BuybackDetailPanel,
  BuybackErrorNotice,
  BuybackWorkflowLayout,
} from "./buyback-workflow-shared";
import { useBuybackWorkflowController } from "./buyback-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";

export function BuybackOwnerScreen({ listHref = "/dashboard/buyback", showCreateForm = true }: { listHref?: string; showCreateForm?: boolean }) {
  const workflow = useBuybackWorkflowController({ role: "owner", listHref, showCreateForm });
  const { caseData } = workflow;
  const hasSubmittedPaymentProof = workflow.paymentProofs.data?.items.some((proof) => proof.status === "SUBMITTED") ?? false;
  const hasUnreceivedPaymentProof = workflow.paymentProofs.data?.items.some((proof) => proof.status === "OWNER_NOT_RECEIVED") ?? false;

  return (
    <BuybackWorkflowLayout
      title="Đề nghị thu mua máy cũ"
      description="Theo dõi việc kiểm tra máy, giá Dolores duyệt, quyết định của bạn và tiến độ thu mua."
      back={workflow.detailId ? { label: "Danh sách hồ sơ", fallbackHref: listHref } : null}
    >
      <BuybackCaseList workflow={workflow} />
      <BuybackCreatePanel workflow={workflow} />
      <BuybackDetailPanel workflow={workflow}>
        {caseData ? <>
          {workflow.ownerDecisionAvailable ? (
            <div className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Quyết định giá thu mua</h3>
              <p className={styles.formHint}>Giá được duyệt: {formatBuybackMoney(caseData.approvedPrice, caseData.currency)}. Nếu chấp nhận, Dolores sẽ báo cho Moderator để điều phối thu máy; bạn không cần tạo khoản thanh toán.</p>
              <label className={styles.formField}>
                <span>Lý do chấp nhận hoặc từ chối</span>
                <textarea required maxLength={2000} value={workflow.ownerDecisionReason} onChange={(event) => workflow.setOwnerDecisionReason(event.target.value)} />
              </label>
              <div className={styles.technicalRequestActions}>
                <ButtonBar type="button" disabled={!workflow.ownerDecisionReason.trim() || workflow.decideOwnerPrice.isPending} onClick={() => {
                  const reason = workflow.ownerDecisionReason.trim();
                  const key = workflow.operationKey("owner-decision-accept", caseData.id, JSON.stringify({ accepted: true, reason }));
                  workflow.decideOwnerPrice.mutate({ id: caseData.id, accepted: true, reason, idempotencyKey: key, correlationId: key });
                }}>Chấp nhận giá</ButtonBar>
                <ButtonBar type="button" disabled={!workflow.ownerDecisionReason.trim() || workflow.decideOwnerPrice.isPending} onClick={() => {
                  const reason = workflow.ownerDecisionReason.trim();
                  const key = workflow.operationKey("owner-decision-reject", caseData.id, JSON.stringify({ accepted: false, reason }));
                  workflow.decideOwnerPrice.mutate({ id: caseData.id, accepted: false, reason, idempotencyKey: key, correlationId: key });
                }}>Từ chối giá</ButtonBar>
              </div>
            </div>
          ) : null}
          {workflow.isExternalBuyback && caseData.ownerAccepted === true ? <p className={styles.notice} role="status">Bạn đã chấp nhận giá {formatBuybackMoney(caseData.approvedPrice, caseData.currency)}. Dolores đang điều phối việc thu máy.</p> : null}
          {workflow.isExternalBuyback && caseData.ownerAccepted === false && caseData.ownerDecisionReason ? <p className={styles.notice} role="status">Bạn đã từ chối giá: {caseData.ownerDecisionReason}</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" ? <p className={styles.notice} role="status">Dolores đang điều phối Technician thu máy. Bạn có thể theo dõi trạng thái tại hồ sơ này.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTED" ? <p className={styles.notice} role="status">Dolores đã xác nhận nhận máy và đang xử lý khoản thanh toán.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "PAYMENT_PENDING" ? (
            <p className={styles.notice} role="status">
              {hasSubmittedPaymentProof
                ? "Đã có chứng từ thanh toán. Vui lòng xem chứng từ bên dưới rồi phản hồi ở mục Công việc cần xử lý trên bảng điều khiển."
                : hasUnreceivedPaymentProof
                  ? "Bạn đã báo chưa nhận được tiền. Moderator đã được thông báo và cần kiểm tra, cập nhật chứng từ thanh toán."
                  : "Đang chờ Moderator/Admin tải chứng từ thanh toán lên. Bạn sẽ được thông báo khi cần phản hồi về khoản tiền."}
            </p>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "PAID" ? <p className={styles.notice} role="status">Bạn đã xác nhận nhận khoản thanh toán. Hồ sơ đang tiếp tục sang bước tân trang.</p> : null}

          {!workflow.isExternalBuyback && caseData.status === "APPROVED" ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const key = workflow.operationKey("create-payment", caseData.id);
              workflow.createPayment.mutate({ id: caseData.id, paymentMethod: workflow.paymentMethod.trim(), ...(workflow.externalReference.trim() ? { externalReference: workflow.externalReference.trim() } : {}), idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Tạo nghĩa vụ thanh toán</h3>
              <label className={styles.formField}><span>Phương thức thanh toán</span><input required maxLength={64} value={workflow.paymentMethod} onChange={(event) => workflow.setPaymentMethod(event.target.value)} /></label>
              <label className={styles.formField}><span>Mã tham chiếu bên ngoài (tùy chọn)</span><input maxLength={256} value={workflow.externalReference} onChange={(event) => workflow.setExternalReference(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.paymentMethod.trim() || workflow.createPayment.isPending}>Tạo thông tin thanh toán</ButtonBar>
            </form>
          ) : null}
          {!workflow.isExternalBuyback && caseData.status === "PAYMENT_PENDING" ? (
            <div className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Chứng từ thanh toán riêng tư</h3>
              {workflow.paymentId ? <p className={styles.notice} role="status">Mã khoản thanh toán: <span className={styles.codeValue}>{workflow.paymentId}</span></p> : <p className={styles.formHint}>Nếu vừa tạo khoản thanh toán trong phiên này, mã sẽ hiện ở đây. Backend hiện chưa cung cấp API liệt kê khoản thanh toán theo hồ sơ.</p>}
              {workflow.paymentId ? (
                <form className={styles.assignmentForm} onSubmit={workflow.perform(() => {
                  if (!workflow.proofFile) return;
                  const key = workflow.paymentProofOperationKey(caseData.id, workflow.paymentId, workflow.proofFile);
                  workflow.submitProof.mutate({ id: caseData.id, paymentId: workflow.paymentId, key, correlationId: key, file: workflow.proofFile });
                })}>
                  <label className={styles.formField}><span>Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => workflow.setProofFile(event.target.files?.[0] ?? null)} /></label>
                  <ButtonBar type="submit" disabled={!workflow.proofFile || workflow.submitProof.isPending}>Tải chứng từ riêng tư</ButtonBar>
                </form>
              ) : null}
              {workflow.proofId ? <p className={styles.notice} role="status">Đã tải chứng từ. Chia sẻ mã hồ sơ/chứng từ với operator để họ duyệt: <span className={styles.codeValue}>{workflow.proofId}</span></p> : null}
            </div>
          ) : null}
          {workflow.paymentProofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ thanh toán…</p> : null}
          {workflow.paymentProofs.isError ? <div className={styles.formPanel}><BuybackErrorNotice error={workflow.paymentProofs.error} /><ButtonBar type="button" onClick={() => void workflow.paymentProofs.refetch()}>Tải lại chứng từ</ButtonBar></div> : null}
          {workflow.paymentProofs.data?.items.length ? (
            <section className={styles.formPanel} aria-label="Chứng từ Dolores thanh toán hồ sơ thu mua">
              <h3 className={styles.sectionTitle}>Chứng từ thanh toán từ Dolores</h3>
              <div className={styles.detailGrid}>
                {workflow.paymentProofs.data.items.map((proof) => (
                  <div className={styles.detailItem} key={proof.id}>
                    <strong>{buybackPaymentProofStatusLabel(proof.status)}</strong>
                    <span>{formatBuybackMoney(proof.amount, proof.currency ?? caseData.currency)}</span>
                    <span>{proof.originalFilename} · gửi lúc {formatBuybackDateTime(proof.submittedAt)}</span>
                    {proof.reviewReason ? <span>Lý do xét duyệt: {proof.reviewReason}</span> : null}
                    {proof.ownerRespondedAt ? <span>Owner phản hồi lúc {formatBuybackDateTime(proof.ownerRespondedAt)}</span> : null}
                    <ButtonBar type="button" disabled={workflow.downloadProof.isPending} onClick={() => workflow.downloadProof.mutate({ id: proof.id, filename: proof.originalFilename })}>Tải chứng từ riêng tư</ButtonBar>
                  </div>
                ))}
              </div>
              {workflow.paymentProofs.data.hasNext || workflow.proofPage > 0 ? (
                <div className={styles.technicalRequestActions}>
                  <ButtonBar type="button" disabled={workflow.proofPage === 0} onClick={() => workflow.setProofPage((value) => Math.max(0, value - 1))}>Chứng từ trước</ButtonBar>
                  <span>Trang {workflow.paymentProofs.data.page + 1}</span>
                  <ButtonBar type="button" disabled={!workflow.paymentProofs.data.hasNext} onClick={() => workflow.setProofPage((value) => value + 1)}>Chứng từ sau</ButtonBar>
                </div>
              ) : null}
            </section>
          ) : null}
        </> : null}
      </BuybackDetailPanel>
    </BuybackWorkflowLayout>
  );
}
