import { Pagination } from "@/components/pagination/pagination";
import { SectionTabList } from "@/components/tabs/section-tab-list";
import { Panel } from "@/components/panel/panel";
import { useState } from "react";
import { useRouter } from "next/router";
import { BuybackRequestDetailScreen } from "./buyback-request-detail-screen";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { buybacksApi } from "@/apis/buybacks.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { evidenceApi } from "@/apis/evidence.api";
import { BuybackSerialPanel } from "./buyback-serial-panel";
import { PageActions } from "@/components/action-bar/page-actions";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { PATH_MODERATOR } from "@/routes/path";
import type { BuybackPaymentProof } from "@/schema/buybacks.schema";
import { BuybackPaymentProofImagePreview, isPreviewablePaymentProofImage } from "./buyback-payment-proof-image-preview";
import { buybackPaymentProofStatusLabel, formatBuybackDateTime, formatBuybackMoney } from "./buyback-formatters";
import {
  BuybackCaseList,
  BuybackDetailPanel,
  BuybackErrorNotice,
  BuybackWorkflowLayout,
} from "./buyback-workflow-shared";
import { useBuybackWorkflowController } from "./buyback-workflow-controller";
import type { BuybackWorkflowController } from "./buyback-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";
import adminStyles from "./buyback-admin.module.css";

function BuybackAssignmentPanel({ workflow }: { workflow: BuybackWorkflowController }) {
  const { caseData, assignmentRole } = workflow;
  if (!caseData || !assignmentRole) return null;

  const assigningInspectionTechnician = assignmentRole === "INSPECTION_TECHNICIAN";
  const assigningCollectionTechnician = assignmentRole === "COLLECTION_TECHNICIAN";
  const assigningRefurbishmentTechnician = assignmentRole === "REFURBISHMENT_TECHNICIAN";
  const assigningTechnician = assigningInspectionTechnician || assigningCollectionTechnician || assigningRefurbishmentTechnician;
  const mutation = assigningInspectionTechnician
    ? workflow.assignInspection
    : assigningCollectionTechnician
      ? workflow.assignCollection
      : assigningRefurbishmentTechnician
        ? workflow.assignRefurbishment
        : workflow.assignModerator;
  const submit = workflow.perform(() => {
    const selectedTechnicianId = workflow.selectedAssigneeId;
    if (!selectedTechnicianId || !workflow.assignmentReason.trim()) return;
    const assignment = {
      profileId: selectedTechnicianId,
      reason: workflow.assignmentReason.trim(),
    };
    const key = workflow.operationKey(
      assigningInspectionTechnician ? "inspection-assign" : assigningCollectionTechnician ? "collection-assign" : assigningRefurbishmentTechnician ? "refurbishment-assign" : "moderator-assign",
      caseData.id,
      JSON.stringify(assignment),
    );
    const common = {
      id: caseData.id,
      reason: workflow.assignmentReason.trim(),
      idempotencyKey: key,
      correlationId: key,
    };
    if (assigningInspectionTechnician) {
      workflow.assignInspection.mutate({ ...common, technicianId: selectedTechnicianId });
    } else if (assigningCollectionTechnician) {
      workflow.assignCollection.mutate({ ...common, technicianId: selectedTechnicianId });
    } else if (assigningRefurbishmentTechnician) {
      workflow.assignRefurbishment.mutate({ ...common, technicianId: selectedTechnicianId });
    } else {
      workflow.assignModerator.mutate({ ...common, moderatorId: selectedTechnicianId });
    }
  });
  const profiles = workflow.assignmentProfiles;
  const totalPages = profiles.data?.totalPages ?? 0;
  const actionLabel = assigningInspectionTechnician
    ? "Giao Technician kiểm tra"
    : assigningCollectionTechnician
      ? "Giao Technician thu máy"
      : assigningRefurbishmentTechnician
        ? "Giao Technician tân trang"
        : "Gán Moderator phụ trách";

  return (
    <form  onSubmit={submit} aria-labelledby="buyback-assignment-title"><Panel className={styles.formPanel}>
      <h3 id="buyback-assignment-title" className={styles.sectionTitle}>{actionLabel}</h3>
      <p className={styles.formHint}>
        {assigningInspectionTechnician
          ? "Chỉ Moderator phụ trách giao Technician đang hoạt động để kiểm tra máy."
          : assigningCollectionTechnician
            ? "Chọn kỹ thuật viên phụ trách thu máy."
            : assigningRefurbishmentTechnician
              ? "Chỉ Moderator phụ trách giao Technician tân trang đang hoạt động."
              : "Chỉ Admin được xử lý hồ sơ REQUESTED chưa có Moderator phụ trách."}
      </p>
      {assigningCollectionTechnician && caseData.collectionEvidenceRecorded ? <p className={styles.notice}>Phân công lại sẽ yêu cầu ghi nhận chứng cứ thu máy mới.</p> : null}
      <label className={styles.formField}>
        <span>Tìm theo tên hoặc email</span>
        <input
          type="search"
          value={workflow.assignmentSearch}
          onChange={(event) => workflow.setAssignmentSearch(event.target.value)}
          maxLength={128}
        />
      </label>
      {profiles.isFetching ? <p className={styles.notice} role="status">Đang tải hồ sơ đủ điều kiện…</p> : null}
      {profiles.isError ? (
        <div className={styles.assignmentForm}>
          <BuybackErrorNotice error={profiles.error} />
          <ButtonBar type="button" onClick={() => void profiles.refetch()}>Tải lại danh sách</ButtonBar>
        </div>
      ) : null}
      {profiles.isSuccess && workflow.eligibleAssignees.length === 0 ? (
        <p className={styles.notice} role="note">
          Không có {assigningTechnician ? "Technician" : "Moderator"} đang hoạt động và đã xác minh email phù hợp.
        </p>
      ) : null}
      {profiles.isSuccess ? (
        <>
          <label className={styles.formField}>
            <span>{assigningTechnician ? "Technician" : "Moderator"} phụ trách</span>
            <select
              required
              value={workflow.selectedAssigneeId}
              onChange={(event) => workflow.setSelectedAssigneeId(event.target.value)}
              disabled={profiles.isError || profiles.isFetching}
            >
              <option value="">Chọn hồ sơ đủ điều kiện</option>
              {workflow.eligibleAssignees.map((profile) => (
                <option key={profile.idaasUserId} value={profile.idaasUserId}>
                  {profile.fullName.trim() || profile.email} — {profile.email}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            <span>Lý do phân công</span>
            <textarea
              required
              maxLength={2000}
              value={workflow.assignmentReason}
              onChange={(event) => workflow.setAssignmentReason(event.target.value)}
            />
          </label>
          {totalPages > 1 ? (
            <Pagination page={workflow.assignmentPage} hasNext={workflow.assignmentPage + 1 < totalPages} isFetching={profiles.isFetching} ariaLabel="Phân trang kỹ thuật viên" onPageChange={workflow.goToAssignmentPage} totalPages={totalPages} />
          ) : null}
          <ButtonBar
            type="submit"
            disabled={!workflow.selectedAssigneeId || !workflow.assignmentReason.trim() || profiles.isFetching || mutation.isPending}
          >
            {mutation.isPending ? "Đang phân công…" : actionLabel}
          </ButtonBar>
        </>
      ) : null}
    </Panel></form>
  );
}

export function BuybackOperatorScreen({ caseId, listHref, operatorRole }: { caseId?: string; listHref: string; operatorRole: "ADMIN" | "MODERATOR" }) {
  const workflow = useBuybackWorkflowController({ role: "operator", operatorRole, initialCaseId: caseId, listHref });
  const { caseData } = workflow;
  const collectionFile = workflow.collectionEvidence.data?.items[0];
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [valuationDecision, setValuationDecision] = useState<boolean | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [recordsTab, setRecordsTab] = useState<"payment" | "documents">("payment");
  const hasSubmittedPaymentProof = workflow.paymentProofs.data?.items.some((proof) => proof.status === "SUBMITTED") ?? false;
  const hasOwnerReportedPaymentNotReceived = workflow.paymentProofs.data?.items.some((proof) => proof.status === "OWNER_NOT_RECEIVED") ?? false;
  const canUploadPaymentProof = workflow.proofPage === 0 && workflow.paymentProofs.isSuccess && !hasSubmittedPaymentProof;
  const payoutRetry = workflow.createPayment.isError && workflow.createPayment.variables?.id === caseData?.id
    ? workflow.createPayment.variables : undefined;
  const closeCancelDialog = () => {
    if (workflow.cancelBuyback.isPending) return;
    setCancelDialogOpen(false);
  };
  const adminProofColumns: readonly DataTableColumn<BuybackPaymentProof>[] = [
    { key: "file", header: "Chứng từ", render: (proof) => <div className={adminStyles.identity}>
      <span>{proof.originalFilename}</span>
      <span className={adminStyles.meta}>{formatBuybackDateTime(proof.submittedAt)}</span>
      {isPreviewablePaymentProofImage(proof.contentType) ? <details className={adminStyles.imageDisclosure}><summary>Xem ảnh</summary><BuybackPaymentProofImagePreview proof={proof} /></details> : null}
    </div> },
    { key: "amount", header: "Số tiền", align: "right", render: (proof) => <span className={adminStyles.money}>{formatBuybackMoney(proof.amount, proof.currency ?? caseData?.currency ?? "VND")}</span> },
    { key: "status", header: "Trạng thái", render: (proof) => <div className={adminStyles.identity}>
      <StatusBadge variant="dot" status={proof.status} tone={proof.status === "OWNER_NOT_RECEIVED" ? "danger" : undefined}>{buybackPaymentProofStatusLabel(proof.status)}</StatusBadge>
      {proof.reviewReason ? <span className={adminStyles.meta}>{proof.reviewReason}</span> : null}
    </div> },
    { key: "actions", header: "Thao tác", render: (proof) => workflow.canManageExternalPayment ? <ProgressDownloadButton filename={proof.originalFilename} download={async (signal) => {
      setDownloadError("");
      return (await buybacksApi.downloadPaymentProofContent(proof.id, signal)).blob;
    }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải xuống</ProgressDownloadButton> : null },
  ];
  const submitCancelBuyback = () => {
    const reason = cancelReason.trim();
    if (!caseData || !workflow.canCancelExternalBuyback || !reason || workflow.cancelBuyback.isPending) return;
    const key = workflow.operationKey("buyback-cancel", caseData.id, reason);
    workflow.cancelBuyback.mutate(
      { id: caseData.id, reason, idempotencyKey: key, correlationId: key },
      { onSuccess: () => { setCancelDialogOpen(false); setCancelReason(""); } },
    );
  };
  const closeValuationDecision = () => {
    if (!workflow.decideValuation.isPending) setValuationDecision(null);
  };
  const submitValuationDecision = () => {
    const reason = workflow.decisionReason.trim();
    if (!caseData || !workflow.canDecideValuation || valuationDecision === null || !reason || workflow.decideValuation.isPending) return;
    const approvedPrice = Number(workflow.approvedPrice);
    if (valuationDecision && (!Number.isFinite(approvedPrice) || approvedPrice < 0.01)) return;
    const key = workflow.operationKey(
      "valuation-decision",
      caseData.id,
      JSON.stringify({ approved: valuationDecision, approvedPrice: valuationDecision ? approvedPrice : undefined, reason }),
    );
    workflow.decideValuation.mutate({
      id: caseData.id,
      approved: valuationDecision,
      ...(valuationDecision ? { approvedPrice } : {}),
      reason,
      idempotencyKey: key,
      correlationId: key,
    }, {
      onSuccess: () => {
        setValuationDecision(null);
        workflow.setDecisionReason("");
      },
    });
  };

  return (
    <BuybackWorkflowLayout
      className={adminStyles.screen}
      title={caseData ? `Lệnh thu mua · ${caseData.id.slice(0, 8).toUpperCase()}` : "Thu mua và tân trang máy"}
      back={workflow.detailId ? { label: "Về yêu cầu kỹ thuật", fallbackHref: operatorRole === "MODERATOR" ? PATH_MODERATOR.BUYBACK_DETAIL(workflow.detailId) : `${listHref}?caseId=${encodeURIComponent(workflow.detailId)}` } : undefined}
      actionBarBackHref={workflow.isModeratorRoute && caseId ? listHref : undefined}
    >
      <BuybackCaseList workflow={workflow} />
      {workflow.detailId && caseData && workflow.canCancelExternalBuyback ? (
        <PageActions actions={[{ id: "buyback-cancel", label: "Hủy yêu cầu thu mua", variant: "danger", priority: 0, pending: workflow.cancelBuyback.isPending, pendingLabel: "Đang hủy…", onClick: () => { setCancelReason(""); setCancelDialogOpen(true); } }]} />
      ) : null}
      <BuybackDetailPanel workflow={workflow}>
        {caseData ? <>
          <BuybackAssignmentPanel workflow={workflow} />
          {workflow.isExternalBuyback && workflow.isResponsibleModerator ? <BuybackSerialPanel key={caseData.id} caseData={caseData} invalidate={workflow.invalidate} /> : null}
          {workflow.isExternalBuyback && caseData.ownerAccepted === true && ["APPROVED", "COLLECTION_PENDING"].includes(caseData.status) ? <p className={styles.notice} role="status">Khách hàng đã chấp nhận giá {formatBuybackMoney(caseData.acceptedPrice, caseData.currency)}. Hồ sơ đang ở bước điều phối thu máy.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTED" ? <p className={styles.notice} role="status">Dolores đã xác nhận nhận máy. Có thể tạo khoản thanh toán mua lại.</p> : null}
          {workflow.isExternalBuyback && workflow.canManageExternalPayment && caseData.status === "COLLECTED" ? (
            <form  onSubmit={workflow.perform(() => {
              const paymentMethod = workflow.paymentMethod.trim();
              const externalReference = workflow.externalReference.trim();
              const key = workflow.operationKey("create-payment", caseData.id, JSON.stringify({ paymentMethod, externalReference }));
              workflow.createPayment.mutate({ id: caseData.id, paymentMethod, ...(externalReference ? { externalReference } : {}), idempotencyKey: key, correlationId: key });
            })}><Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Tạo khoản chi thu mua</h3>
              <p className={styles.formHint}>Dolores tự tính số tiền theo giá Owner đã chấp nhận. Không nhập số tiền ở màn hình này.</p>
              <label className={styles.formField}><span>Phương thức thanh toán</span><input required maxLength={64} value={workflow.paymentMethod} onChange={(event) => workflow.setPaymentMethod(event.target.value)} /></label>
              <label className={styles.formField}><span>Mã tham chiếu thanh toán (tùy chọn)</span><input maxLength={256} value={workflow.externalReference} onChange={(event) => workflow.setExternalReference(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.paymentMethod.trim() || workflow.createPayment.isPending}>Tạo khoản chi</ButtonBar>
            </Panel></form>
          ) : null}
          {workflow.isExternalBuyback && workflow.createPayment.data?.buybackCaseId === caseData.id ? <p className={styles.notice} role="status">Dolores đã tạo khoản chi {formatBuybackMoney(workflow.createPayment.data.amount, workflow.createPayment.data.currency)}. Mã khoản chi: <span className={styles.codeValue}><TruncatedId value={workflow.createPayment.data.id} /></span></p> : null}
          {workflow.isExternalBuyback && workflow.canManageExternalPayment && canUploadPaymentProof && caseData.status === "PAYMENT_PENDING" ? (
            <Panel className={styles.formPanel} aria-label="Tải chứng từ khoản chi thu mua">
              <h3 className={styles.sectionTitle}>{hasOwnerReportedPaymentNotReceived ? "Cập nhật chứng từ thanh toán" : "Tải chứng từ thanh toán"}</h3>
              <p className={styles.formHint}>
                {hasOwnerReportedPaymentNotReceived
                  ? "Khách hàng báo chưa nhận được tiền. Kiểm tra giao dịch rồi tải chứng từ cập nhật để khách hàng phản hồi lại."
                  : "Dùng mã khoản chi được cấp khi tạo khoản thanh toán. Nếu đã rời trang, hãy nhập lại mã đã lưu."}
              </p>
              {!workflow.paymentId && payoutRetry ? <ButtonBar type="button" onClick={() => workflow.createPayment.mutate(payoutRetry)}>Thử lấy lại mã khoản chi</ButtonBar> : null}
              <label className={styles.formField}><span>Mã khoản chi</span><input required value={workflow.paymentId} onChange={(event) => workflow.setPaymentId(event.target.value.trim())} /></label>
              <form className={styles.assignmentForm} onSubmit={workflow.perform(() => {
                if (!workflow.paymentId || !workflow.proofFile || workflow.submitProof.isPending || workflow.paymentProofs.isFetching) return;
                const key = workflow.paymentProofOperationKey(caseData.id, workflow.paymentId, workflow.proofFile);
                workflow.submitProof.mutate({ id: caseData.id, paymentId: workflow.paymentId, key, correlationId: key, file: workflow.proofFile });
              })}>
                <label className={styles.formField}><span>Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => workflow.setProofFile(event.target.files?.[0] ?? null)} /></label>
                <ButtonBar type="submit" disabled={!workflow.paymentId || !workflow.proofFile || workflow.submitProof.isPending || workflow.paymentProofs.isFetching}>Tải chứng từ riêng tư</ButtonBar>
              </form>
              {workflow.proofId ? <p className={styles.notice} role="status">Đã tải chứng từ. Mã chứng từ: <span className={styles.codeValue}><TruncatedId value={workflow.proofId} /></span></p> : null}
            </Panel>
          ) : null}
          {workflow.canDecideValuation ? (
            <Panel className={styles.formPanel} aria-label="Quyết định giá thu mua">
              <h3 className={styles.sectionTitle}>Duyệt đánh giá Technician</h3>
              <p className={styles.formHint}>Giá kỹ thuật viên đề xuất: {formatBuybackMoney(caseData.proposedPrice, caseData.currency)}.</p>
              <label className={styles.formField}><span>Giá duyệt ({caseData.currency})</span>
                <input type="number" min="0.01" step="0.01" value={workflow.approvedPrice} placeholder={String(caseData.proposedPrice ?? "")}
                  disabled={workflow.decideValuation.isPending} onChange={(event) => workflow.setApprovedPrice(event.target.value)} />
              </label>
              <label className={styles.formField}><span>Lý do quyết định</span><textarea required maxLength={2000} value={workflow.decisionReason} onChange={(event) => workflow.setDecisionReason(event.target.value)} /></label>
              <div className={styles.technicalRequestActions}>
                <ButtonBar
                  type="button"
                  className={styles.technicalRequestAccept}
                  disabled={!workflow.decisionReason.trim() || !(Number(workflow.approvedPrice || caseData.proposedPrice) >= 0.01) || workflow.decideValuation.isPending}
                  onClick={() => { workflow.setApprovedPrice(workflow.approvedPrice || String(caseData.proposedPrice ?? "")); workflow.decideValuation.reset(); setValuationDecision(true); }}
                >Duyệt giá</ButtonBar>
                <ButtonBar
                  type="button"
                  className={styles.technicalRequestReject}
                  disabled={!workflow.decisionReason.trim() || workflow.decideValuation.isPending}
                  onClick={() => { workflow.decideValuation.reset(); setValuationDecision(false); }}
                >Không duyệt</ButtonBar>
              </div>
            </Panel>
          ) : null}
          {caseData.status === "PAYMENT_PENDING" && !workflow.isExternalBuyback ? (
            <Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Kiểm tra chứng từ thanh toán</h3>
              <p className={styles.formHint}>Nhập mã chứng từ của hồ sơ; nội dung tệp chỉ được đọc qua endpoint riêng tư.</p>
              <label className={styles.formField}><span>Mã chứng từ</span><input value={workflow.proofId} onChange={(event) => workflow.setProofId(event.target.value)} /></label>
              <ButtonBar type="button" disabled={!workflow.proofId || workflow.downloadProof.isPending} onClick={() => workflow.downloadProof.mutate(workflow.proofId)}>Tải chứng từ qua endpoint riêng tư</ButtonBar>
              <label className={styles.formField}><span>Lý do duyệt / từ chối</span><textarea required maxLength={2000} value={workflow.proofReviewReason} onChange={(event) => workflow.setProofReviewReason(event.target.value)} /></label>
              <div className={styles.technicalRequestActions}>
                <ButtonBar type="button" disabled={!workflow.proofId || !workflow.proofReviewReason.trim() || workflow.reviewProof.isPending} onClick={() => {
                  const key = workflow.operationKey("proof-review-approve", workflow.proofId);
                  workflow.reviewProof.mutate({ caseId: caseData.id, proofId: workflow.proofId, approved: true, reason: workflow.proofReviewReason.trim(), idempotencyKey: key, correlationId: key });
                }}>Duyệt thanh toán</ButtonBar>
                <ButtonBar variant="danger" type="button" holdToConfirm disabled={!workflow.proofId || !workflow.proofReviewReason.trim() || workflow.reviewProof.isPending} onClick={() => {
                  const key = workflow.operationKey("proof-review-reject", workflow.proofId);
                  workflow.reviewProof.mutate({ caseId: caseData.id, proofId: workflow.proofId, approved: false, reason: workflow.proofReviewReason.trim(), idempotencyKey: key, correlationId: key });
                }}>Từ chối</ButtonBar>
              </div>
            </Panel>
          ) : null}
          {workflow.isExternalBuyback && workflow.canRequestCollection ? (
            <form  onSubmit={workflow.perform(() => {
              const reason = workflow.collectionReason.trim();
              const key = workflow.operationKey("collection-request", caseData.id, reason);
              workflow.requestCollection.mutate({ id: caseData.id, reason, idempotencyKey: key, correlationId: key });
            })}><Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Điều phối thu máy</h3>
              <p className={styles.formHint}>Owner đã chấp nhận đúng giá Dolores duyệt. Yêu cầu này chuyển hồ sơ sang COLLECTION_PENDING.</p>
              <label className={styles.formField}><span>Lý do / hướng dẫn thu máy</span><textarea required maxLength={2000} value={workflow.collectionReason} onChange={(event) => workflow.setCollectionReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.collectionReason.trim() || workflow.requestCollection.isPending}>Yêu cầu thu máy</ButtonBar>
            </Panel></form>
          ) : null}
          {caseData.status === "PAID" && !workflow.isExternalBuyback ? (
            <form  onSubmit={workflow.perform(() => {
              const key = workflow.operationKey("collection-request", caseData.id);
              workflow.requestCollection.mutate({ id: caseData.id, reason: workflow.collectionReason.trim(), idempotencyKey: key, correlationId: key });
            })}><Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Yêu cầu thu máy</h3>
              <label className={styles.formField}><span>Lý do / hướng dẫn thu máy</span><textarea required maxLength={2000} value={workflow.collectionReason} onChange={(event) => workflow.setCollectionReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.collectionReason.trim() || workflow.requestCollection.isPending}>Yêu cầu thu máy</ButtonBar>
            </Panel></form>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" ? <>
            <p className={styles.notice} role="note">Dolores đang điều phối Technician đến thu máy. Chỉ Technician được gán mới ghi serial, địa điểm và evidence reference.</p>
            {workflow.canConfirmCollection ? (
              <form  onSubmit={workflow.perform(() => {
                if (!collectionFile || workflow.collectionEvidence.isFetching || workflow.collectionEvidence.isError || workflow.detail.isFetching || workflow.confirmCollection.isPending) return;
                const evidenceReference = collectionFile.id;
                const key = workflow.operationKey("collection-confirm", caseData.id, evidenceReference);
                workflow.confirmCollection.mutate({ id: caseData.id, evidenceReference, idempotencyKey: key, correlationId: key });
              })}><Panel className={styles.formPanel}>
                <h3 className={styles.sectionTitle}>Xác nhận đã nhận máy</h3>
                {workflow.collectionEvidence.isFetching ? <p role="status">Đang tải chứng cứ thu máy…</p> : null}
                {workflow.collectionEvidence.isError ? <BuybackErrorNotice error={workflow.collectionEvidence.error} /> : null}
                {workflow.collectionEvidence.isSuccess && !collectionFile ? <p role="status">Chưa tìm thấy tệp chứng cứ thu máy.</p> : null}
                {collectionFile ? <ProgressDownloadButton filename={collectionFile.originalFilename}
                  download={(signal) => evidenceApi.download("BUYBACK_CASE", caseData.id, collectionFile.id, signal)}
                  onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải chứng cứ thu máy</ProgressDownloadButton> : null}
                <ButtonBar type="submit" disabled={!collectionFile || workflow.collectionEvidence.isFetching || workflow.collectionEvidence.isError || workflow.detail.isFetching || workflow.confirmCollection.isPending}>Xác nhận đã thu máy</ButtonBar>
              </Panel></form>
            ) : !caseData.collectionEvidenceRecorded ? <p className={styles.formHint}>Chưa có chứng cứ thu máy.</p>
              : <p className={styles.formHint}>Cần xác minh lại serial đã ghi trên chứng cứ trước khi xác nhận nhận máy.</p>}
          </> : null}
          {workflow.canRegisterMachine ? (
            <form  onSubmit={workflow.perform(() => {
              const modelId = workflow.registrationModelId;
              const reason = workflow.registrationReason.trim();
              const region = workflow.registrationRegion.trim();
              const request = { machineType: workflow.registrationMachineType, modelId, ...(region ? { region } : {}), reason };
              const key = workflow.operationKey("machine-register", caseData.id, JSON.stringify(request));
              workflow.registerMachine.mutate({ id: caseData.id, ...request, idempotencyKey: key, correlationId: key });
            })}><Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Đăng ký máy Dolores</h3>
              <p className={styles.formHint}>Chỉ Moderator phụ trách đăng ký được hồ sơ đã tân trang xong. Chọn model đang hoạt động từ danh mục Dolores.</p>
              {workflow.machineModels.isPending || workflow.machineModels.isFetching ? <p className={styles.notice} role="status">Đang tải danh mục model…</p> : null}
              {workflow.machineModels.isError ? <div className={styles.assignmentForm}><BuybackErrorNotice error={workflow.machineModels.error} /><ButtonBar type="button" onClick={() => void workflow.machineModels.refetch()}>Tải lại danh mục model</ButtonBar></div> : null}
              <label className={styles.formField}><span>Loại máy</span><select value={workflow.registrationMachineType} onChange={(event) => workflow.setRegistrationMachineType(event.target.value as "CONVENTIONAL" | "SMART_IOT")}><option value="CONVENTIONAL">CONVENTIONAL</option><option value="SMART_IOT">SMART_IOT</option></select></label>
              {workflow.machineModels.data && workflow.eligibleRegistrationModels.length === 0 ? <p className={styles.notice} role="note">Không có model đang hoạt động cho loại máy đã chọn.</p> : null}
              {workflow.eligibleRegistrationModels.length > 0 ? <label className={styles.formField}><span>Model</span><select required value={workflow.registrationModelId} onChange={(event) => workflow.setRegistrationModelId(event.target.value)}><option value="">Chọn model trong danh mục</option>{workflow.eligibleRegistrationModels.map((model) => <option key={model.id} value={model.id}>{model.manufacturer} · {model.displayName} ({model.modelCode})</option>)}</select></label> : null}
              <label className={styles.formField}><span>Khu vực (tùy chọn)</span><input maxLength={128} value={workflow.registrationRegion} onChange={(event) => workflow.setRegistrationRegion(event.target.value)} /></label>
              <label className={styles.formField}><span>Lý do đăng ký</span><textarea required maxLength={2000} value={workflow.registrationReason} onChange={(event) => workflow.setRegistrationReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.registrationModelId || !workflow.registrationReason.trim() || workflow.machineModels.isPending || workflow.machineModels.isError || workflow.registerMachine.isPending}>Đăng ký máy</ButtonBar>
            </Panel></form>
          ) : null}
          {workflow.isResponsibleModerator && workflow.isExternalBuyback && caseData.status === "READY_FOR_REGISTRATION" && !workflow.canRegisterMachine
            ? <p className={styles.notice}>Cần kỹ thuật viên thu máy xác minh lại serial và gửi chứng cứ trước khi đăng ký máy vào kho.</p> : null}
          {operatorRole !== "ADMIN" && workflow.isExternalBuyback && caseData.status === "REGISTERED" && caseData.registeredMachineId ? <p className={styles.notice} role="status">Dolores đã đăng ký máy <span className={styles.codeValue}><TruncatedId value={caseData.registeredMachineId} /></span>.</p> : null}
          {!workflow.isExternalBuyback && caseData.status === "QA_PENDING" ? (
            <Panel className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Kiểm định độc lập</h3>
              <label className={styles.formField}><span>Kết quả</span><select value={workflow.qaPassed ? "true" : "false"} onChange={(event) => workflow.setQaPassed(event.target.value === "true")}><option value="true">Đạt</option><option value="false">Chưa đạt</option></select></label>
              <label className={styles.formField}><span>Lý do</span><textarea required maxLength={2000} value={workflow.qaReason} onChange={(event) => workflow.setQaReason(event.target.value)} /></label>
              <ButtonBar type="button" disabled={!workflow.qaReason.trim() || workflow.decideQa.isPending} onClick={() => {
                const key = workflow.operationKey("qa-decision", caseData.id);
                workflow.decideQa.mutate({ id: caseData.id, passed: workflow.qaPassed, reason: workflow.qaReason.trim(), idempotencyKey: key, correlationId: key });
              }}>Ghi nhận kiểm định</ButtonBar>
            </Panel>
          ) : null}
            <SectionTabList role="navigation" aria-label="Chi tiết lệnh thu mua">
            <ButtonBar type="button" aria-pressed={recordsTab === "payment"} onClick={() => setRecordsTab("payment")}>Thanh toán</ButtonBar>
            <ButtonBar type="button" aria-pressed={recordsTab === "documents"} onClick={() => setRecordsTab("documents")}>Tài liệu</ButtonBar>
          </SectionTabList>
          <div hidden={recordsTab !== "payment"}>
              {workflow.isExternalBuyback && workflow.paymentProofs.isPending ? <p className={styles.notice} role="status">Đang tải thông tin chứng từ thanh toán…</p> : null}
          {workflow.isExternalBuyback && workflow.paymentProofs.isError ? <Panel className={styles.formPanel}><BuybackErrorNotice error={workflow.paymentProofs.error} /><ButtonBar type="button" onClick={() => void workflow.paymentProofs.refetch()}>Tải lại danh sách chứng từ</ButtonBar></Panel> : null}
          {workflow.isExternalBuyback && workflow.paymentProofs.data ? (
            <section className={adminStyles.paymentPanel} aria-label="Thông tin chứng từ thanh toán thu mua">
              <h3 className={styles.sectionTitle}>Thanh toán thu mua</h3>
              {operatorRole !== "ADMIN" ? <p className={styles.formHint}>Khách hàng xác nhận đã nhận tiền hoặc báo chưa nhận trong tài khoản của mình. Nhân viên không duyệt chứng từ ở bước này.</p> : null}
              <DataTable
                rows={workflow.paymentProofs.data.items}
                rowKey={(proof) => proof.id}
                columns={adminProofColumns}
                emptyMessage="Chưa có chứng từ thanh toán trong hồ sơ này."
              />
              {downloadError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{downloadError}</p> : null}
              {workflow.paymentProofs.data.hasNext || workflow.proofPage > 0 ? <Pagination page={workflow.proofPage} hasNext={workflow.paymentProofs.data.hasNext} ariaLabel="Phân trang chứng từ" onPageChange={workflow.setProofPage} /> : null}
            </section>
          ) : null}
          </div>
          <div className={adminStyles.relatedEvidence} hidden={recordsTab !== "documents"}>
            <EvidenceList resource="BUYBACK_CASE" parentId={caseData.id} title="Tài liệu thu mua" showSize={false} pageSize={10} />
          </div>
        </> : null}
      </BuybackDetailPanel>
      {valuationDecision !== null && caseData && workflow.canDecideValuation ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Hồ sơ thu mua"
          title={valuationDecision ? "Duyệt giá thu mua?" : "Từ chối định giá?"}
          description={valuationDecision
            ? `Xác nhận duyệt giá thu mua ${formatBuybackMoney(Number(workflow.approvedPrice), caseData.currency)}.`
            : `Xác nhận không duyệt giá ${formatBuybackMoney(caseData.proposedPrice, caseData.currency)} do Technician đề xuất.`}
          primaryAction={{
            label: valuationDecision ? "Duyệt giá" : "Không duyệt",
            pending: workflow.decideValuation.isPending,
            pendingLabel: "Đang cập nhật…",
            disabled: !workflow.decisionReason.trim(),
            onClick: submitValuationDecision,
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.decideValuation.isPending, onClick: closeValuationDecision }}
          onClose={closeValuationDecision}
          closeOnEscape={!workflow.decideValuation.isPending}
        >
          <p className={styles.formHint}>Lý do: {workflow.decisionReason.trim()}</p>
          {workflow.decideValuation.isError ? <BuybackErrorNotice error={workflow.decideValuation.error} /> : null}
        </NotificationDialog>
      ) : null}
      {cancelDialogOpen && workflow.canCancelExternalBuyback ? (
        <NotificationDialog
          variant="confirm"
          title="Hủy yêu cầu thu mua?"
          description="Hồ sơ sẽ được chuyển sang trạng thái đã hủy. Hãy nhập lý do trước khi xác nhận."
          primaryAction={{
            label: "Xác nhận hủy",
            pending: workflow.cancelBuyback.isPending,
            pendingLabel: "Đang hủy…",
            disabled: !cancelReason.trim(),
            onClick: submitCancelBuyback,
          }}
          secondaryAction={{ label: "Quay lại", disabled: workflow.cancelBuyback.isPending, onClick: closeCancelDialog }}
          onClose={closeCancelDialog}
          closeOnEscape={!workflow.cancelBuyback.isPending}
        >
          <label className={styles.formField}>
            <span>Lý do hủy</span>
            <textarea required maxLength={2000} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} />
          </label>
          {workflow.cancelBuyback.isError ? <BuybackErrorNotice error={workflow.cancelBuyback.error} /> : null}
        </NotificationDialog>
      ) : null}
    </BuybackWorkflowLayout>
  );
}

export function BuybackModeratorScreen({ caseId, listHref = PATH_MODERATOR.BUYBACK_LIST }: { caseId?: string; listHref?: string }) {
  const router = useRouter();
  if (caseId && router.query.view !== "work-order") return <BuybackRequestDetailScreen caseId={caseId} role="MODERATOR" listHref={listHref} />;
  return <BuybackOperatorScreen caseId={caseId} listHref={listHref} operatorRole="MODERATOR" />;
}
