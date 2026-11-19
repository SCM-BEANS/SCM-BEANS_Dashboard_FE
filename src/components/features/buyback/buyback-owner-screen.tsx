import { useRouter } from "next/router";
import { useState } from "react";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { BuybackRequestDetailScreen } from "./buyback-request-detail-screen";
import adminStyles from "./buyback-admin.module.css";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { buybacksApi } from "@/apis/buybacks.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PageActions } from "@/components/action-bar/page-actions";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import type { BuybackPaymentProof } from "@/schema/buybacks.schema";
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
  const router = useRouter();
  const caseId = typeof router.query.caseId === "string" ? router.query.caseId : "";
  if (caseId && router.query.view !== "work-order") return <BuybackRequestDetailScreen caseId={caseId} role="OWNER" listHref={listHref} />;
  return <BuybackOwnerWorkOrderScreen listHref={listHref} showCreateForm={showCreateForm} />;
}

function BuybackOwnerWorkOrderScreen({ listHref, showCreateForm }: { listHref: string; showCreateForm: boolean }) {
  const [recordsTab, setRecordsTab] = useState<"payment" | "documents">("payment");
  const [downloadError, setDownloadError] = useState("");
  const [receiptDecision, setReceiptDecision] = useState<{ proof: BuybackPaymentProof; received: boolean | null } | null>(null);
  const workflow = useBuybackWorkflowController({ role: "owner", listHref, showCreateForm });
  const { caseData } = workflow;
  const hasSubmittedPaymentProof = workflow.paymentProofs.data?.items.some((proof) => proof.status === "SUBMITTED") ?? false;
  const hasUnreceivedPaymentProof = workflow.paymentProofs.data?.items.some((proof) => proof.status === "OWNER_NOT_RECEIVED") ?? false;

  return (
    <BuybackWorkflowLayout
      className={adminStyles.screen}
      title={caseData ? `Lệnh thu mua · ${caseData.id.slice(0, 8).toUpperCase()}` : "Đề nghị thu mua máy cũ"}
      back={workflow.detailId ? { label: "Về yêu cầu kỹ thuật", fallbackHref: `${listHref}?caseId=${encodeURIComponent(workflow.detailId)}` } : null}
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
              <PageActions actions={[true, false].map((accepted) => ({ id: accepted ? "accept-price" : "reject-price", label: accepted ? "Chấp nhận giá" : "Từ chối giá", variant: accepted ? "primary" : "secondary", priority: 50, holdToConfirm: !accepted, disabled: !workflow.ownerDecisionReason.trim(), disabledReason: "Nhập lý do quyết định.", pending: workflow.decideOwnerPrice.isPending, onClick: () => {
                  const reason = workflow.ownerDecisionReason.trim();
                  const key = workflow.operationKey(accepted ? "owner-decision-accept" : "owner-decision-reject", caseData.id, JSON.stringify({ accepted, reason }));
                  workflow.decideOwnerPrice.mutate({ id: caseData.id, accepted, reason, idempotencyKey: key, correlationId: key });
                } }))} />
            </div>
          ) : null}
          {workflow.isExternalBuyback && caseData.ownerAccepted === true && ["APPROVED", "COLLECTION_PENDING"].includes(caseData.status) ? <p className={styles.notice} role="status">Bạn đã chấp nhận giá {formatBuybackMoney(caseData.approvedPrice, caseData.currency)}. Dolores đang điều phối việc thu máy.</p> : null}
          {workflow.isExternalBuyback && caseData.ownerAccepted === false && caseData.ownerDecisionReason ? <p className={styles.notice} role="status">Bạn đã từ chối giá: {caseData.ownerDecisionReason}</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" ? <p className={styles.notice} role="status">Dolores đang điều phối Technician thu máy. Bạn có thể theo dõi trạng thái tại hồ sơ này.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTED" ? <p className={styles.notice} role="status">Dolores đã xác nhận nhận máy và đang xử lý khoản thanh toán.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "PAYMENT_PENDING" ? (
            <p className={styles.notice} role="status">
              {hasSubmittedPaymentProof
                ? "Hãy xem chứng từ và kiểm tra khoản tiền thực nhận trước khi phản hồi."
                : hasUnreceivedPaymentProof
                  ? "Bạn đã báo chưa nhận được tiền. Moderator đã được thông báo và cần kiểm tra, cập nhật chứng từ thanh toán."
                  : "Đang chờ Moderator/Admin tải chứng từ thanh toán lên. Bạn sẽ được thông báo khi cần phản hồi về khoản tiền."}
            </p>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "PAID" ? <p className={styles.notice} role="status">Bạn đã xác nhận nhận khoản thanh toán. Hồ sơ đang tiếp tục sang bước tân trang.</p> : null}

          {!workflow.isExternalBuyback && caseData.status === "APPROVED" ? (
            <form id="buyback-payment-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              const key = workflow.operationKey("create-payment", caseData.id);
              workflow.createPayment.mutate({ id: caseData.id, paymentMethod: workflow.paymentMethod.trim(), ...(workflow.externalReference.trim() ? { externalReference: workflow.externalReference.trim() } : {}), idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Tạo nghĩa vụ thanh toán</h3>
              <label className={styles.formField}><span>Phương thức thanh toán</span><input required maxLength={64} value={workflow.paymentMethod} onChange={(event) => workflow.setPaymentMethod(event.target.value)} /></label>
              <label className={styles.formField}><span>Mã tham chiếu bên ngoài (tùy chọn)</span><input maxLength={256} value={workflow.externalReference} onChange={(event) => workflow.setExternalReference(event.target.value)} /></label>
              <PageActions actions={[{ id: "create-payment", label: "Tạo thông tin thanh toán", variant: "primary", priority: 100, type: "submit", form: "buyback-payment-form", disabled: !workflow.paymentMethod.trim(), disabledReason: "Nhập phương thức thanh toán.", pending: workflow.createPayment.isPending }]} />
            </form>
          ) : null}
          {!workflow.isExternalBuyback && caseData.status === "PAYMENT_PENDING" ? (
            <div className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Chứng từ thanh toán riêng tư</h3>
              {workflow.paymentId ? <p className={styles.notice} role="status">Mã khoản thanh toán: <span className={styles.codeValue}>{workflow.paymentId}</span></p> : <p className={styles.formHint}>Nếu vừa tạo khoản thanh toán trong phiên này, mã sẽ hiện ở đây.</p>}
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
          <nav className={adminStyles.recordTabs} aria-label="Chi tiết lệnh thu mua">
            <button type="button" aria-pressed={recordsTab === "payment"} onClick={() => setRecordsTab("payment")}>Thanh toán</button>
            <button type="button" aria-pressed={recordsTab === "documents"} onClick={() => setRecordsTab("documents")}>Tài liệu</button>
          </nav>
          <div hidden={recordsTab !== "payment"}>
          {workflow.paymentProofs.isPending ? <p className={styles.notice} role="status">Đang tải chứng từ thanh toán…</p> : null}
          {workflow.paymentProofs.isError ? <div className={styles.formPanel}><BuybackErrorNotice error={workflow.paymentProofs.error} /><ButtonBar type="button" onClick={() => void workflow.paymentProofs.refetch()}>Tải lại chứng từ</ButtonBar></div> : null}
          {workflow.paymentProofs.isSuccess && workflow.paymentProofs.data.items.length === 0 ? <p className={styles.formHint}>Chưa có chứng từ thanh toán trong hồ sơ này.</p> : null}
          {workflow.paymentProofs.data?.items.length ? (
            <section className={adminStyles.paymentPanel} aria-label="Chứng từ Dolores thanh toán hồ sơ thu mua">
              <h3 className={styles.sectionTitle}>Chứng từ thanh toán từ Dolores</h3>
              <DataTable rows={workflow.paymentProofs.data.items} rowKey={(proof) => proof.id} columns={[
                { key: "file", header: "Chứng từ", render: (proof) => <div className={adminStyles.identity}><span>{proof.originalFilename}</span><span className={adminStyles.meta}>{formatBuybackDateTime(proof.submittedAt)}</span></div> },
                { key: "amount", header: "Số tiền", align: "right", render: (proof) => <span className={adminStyles.money}>{formatBuybackMoney(proof.amount, proof.currency ?? caseData.currency)}</span> },
                { key: "status", header: "Trạng thái", render: (proof) => <div className={adminStyles.identity}><StatusBadge variant="dot" status={proof.status}>{buybackPaymentProofStatusLabel(proof.status)}</StatusBadge>{proof.reviewReason ? <span className={adminStyles.meta}>{proof.reviewReason}</span> : null}{proof.ownerRespondedAt ? <span className={adminStyles.meta}>Phản hồi lúc {formatBuybackDateTime(proof.ownerRespondedAt)}</span> : null}</div> },
                { key: "download", header: "Thao tác", render: (proof) => <ProgressDownloadButton filename={proof.originalFilename} download={async (signal) => {
                  setDownloadError("");
                  return (await buybacksApi.downloadPaymentProofContent(proof.id, signal)).blob;
                }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải xuống</ProgressDownloadButton> },
                ...(workflow.isExternalBuyback && caseData.status === "PAYMENT_PENDING" && hasSubmittedPaymentProof ? [{
                  key: "receipt",
                  header: "Phản hồi",
                  render: (proof: BuybackPaymentProof) => proof.status === "SUBMITTED" ? (
                    <ButtonBar type="button" onClick={() => {
                      workflow.respondToReceipt.reset();
                      setReceiptDecision({ proof, received: null });
                    }}>Phản hồi khoản chi</ButtonBar>
                  ) : null,
                }] : []),
              ]} />
              {downloadError ? <p role="alert" className={`${styles.notice} ${styles.error}`}>{downloadError}</p> : null}
              {workflow.paymentProofs.data.hasNext || workflow.proofPage > 0 ? (
                <div className={styles.technicalRequestActions}>
                  <ButtonBar type="button" disabled={workflow.proofPage === 0} onClick={() => workflow.setProofPage((value) => Math.max(0, value - 1))}>Chứng từ trước</ButtonBar>
                  <span>Trang {workflow.paymentProofs.data.page + 1}</span>
                  <ButtonBar type="button" disabled={!workflow.paymentProofs.data.hasNext} onClick={() => workflow.setProofPage((value) => value + 1)}>Chứng từ sau</ButtonBar>
                </div>
              ) : null}
            </section>
          ) : null}
          </div>
          <div className={adminStyles.relatedEvidence} hidden={recordsTab !== "documents"}>
            <EvidenceList resource="BUYBACK_CASE" parentId={caseData.id} title="Tài liệu thu mua" showSize={false} pageSize={10} />
          </div>
        </> : null}
      </BuybackDetailPanel>
      {receiptDecision && caseData?.id === receiptDecision.proof.buybackCaseId ? (
        <NotificationDialog
          variant="confirm"
          title="Xác nhận khoản tiền thu mua"
          description={`Số tiền trên chứng từ là ${formatBuybackMoney(receiptDecision.proof.amount, receiptDecision.proof.currency ?? caseData.currency)}.`}
          primaryAction={{
            label: "Gửi phản hồi",
            pending: workflow.respondToReceipt.isPending,
            disabled: receiptDecision.received === null || workflow.detail.isFetching || workflow.paymentProofs.isFetching
              || caseData.status !== "PAYMENT_PENDING" || !workflow.paymentProofs.data?.items.some((proof) => proof.id === receiptDecision.proof.id && proof.status === "SUBMITTED"),
            onClick: () => {
              if (receiptDecision.received === null) return;
              workflow.respondToReceipt.mutate({ proofId: receiptDecision.proof.id, received: receiptDecision.received }, {
                onSuccess: () => setReceiptDecision(null),
              });
            },
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.respondToReceipt.isPending, onClick: () => setReceiptDecision(null) }}
          onClose={() => { if (!workflow.respondToReceipt.isPending) setReceiptDecision(null); }}
          closeOnEscape={!workflow.respondToReceipt.isPending}
        >
          <label className={styles.formField}><span>Bạn đã nhận khoản tiền này chưa?</span>
            <select disabled={workflow.respondToReceipt.isPending} value={receiptDecision.received === null ? "" : String(receiptDecision.received)}
              onChange={(event) => setReceiptDecision({ ...receiptDecision, received: event.target.value === "" ? null : event.target.value === "true" })}>
              <option value="">Chọn phản hồi</option>
              <option value="true">Đã nhận tiền</option>
              <option value="false">Chưa nhận tiền</option>
            </select>
          </label>
          {workflow.respondToReceipt.isError ? <BuybackErrorNotice error={workflow.respondToReceipt.error} /> : null}
        </NotificationDialog>
      ) : null}
    </BuybackWorkflowLayout>
  );
}
