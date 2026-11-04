import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { PATH_MODERATOR } from "@/routes/path";
import { formatBuybackMoney } from "./buyback-formatters";
import {
  BuybackCaseList,
  BuybackDetailPanel,
  BuybackErrorNotice,
  BuybackWorkflowLayout,
} from "./buyback-workflow-shared";
import { useBuybackWorkflowController } from "./buyback-workflow-controller";
import type { BuybackWorkflowController } from "./buyback-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";

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
    if (!workflow.selectedAssigneeId || !workflow.assignmentReason.trim()) return;
    const assignment = {
      profileId: workflow.selectedAssigneeId,
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
      workflow.assignInspection.mutate({ ...common, technicianId: workflow.selectedAssigneeId });
    } else if (assigningCollectionTechnician) {
      workflow.assignCollection.mutate({ ...common, technicianId: workflow.selectedAssigneeId });
    } else if (assigningRefurbishmentTechnician) {
      workflow.assignRefurbishment.mutate({ ...common, technicianId: workflow.selectedAssigneeId });
    } else {
      workflow.assignModerator.mutate({ ...common, moderatorId: workflow.selectedAssigneeId });
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
    <form className={styles.formPanel} onSubmit={submit} aria-labelledby="buyback-assignment-title">
      <h3 id="buyback-assignment-title" className={styles.sectionTitle}>{actionLabel}</h3>
      <p className={styles.formHint}>
        {assigningInspectionTechnician
          ? "Chỉ Moderator phụ trách giao Technician đang hoạt động để kiểm tra máy."
          : assigningCollectionTechnician
            ? "Chỉ Moderator phụ trách giao Technician đang hoạt động để thu máy."
            : assigningRefurbishmentTechnician
              ? "Chỉ Moderator phụ trách giao Technician tân trang đang hoạt động."
              : "Chỉ Admin được xử lý hồ sơ REQUESTED chưa có Moderator phụ trách."}
      </p>
      <label className={styles.formField}>
        <span>Tìm theo tên hoặc email</span>
        <input
          type="search"
          value={workflow.assignmentSearch}
          onChange={(event) => workflow.setAssignmentSearch(event.target.value)}
          maxLength={128}
        />
      </label>
      {profiles.isPending || profiles.isFetching ? <p className={styles.notice} role="status">Đang tải hồ sơ đủ điều kiện…</p> : null}
      {profiles.isError ? (
        <div className={styles.assignmentForm}>
          <BuybackErrorNotice error={profiles.error} />
          <ButtonBar type="button" onClick={() => void profiles.refetch()}>Tải lại danh sách</ButtonBar>
        </div>
      ) : null}
      {!profiles.isPending && !profiles.isError && profiles.data && workflow.eligibleAssignees.length === 0 ? (
        <p className={styles.notice} role="note">
          Không có {assigningTechnician ? "Technician" : "Moderator"} đang hoạt động và đã xác minh email phù hợp.
        </p>
      ) : null}
      {profiles.data && workflow.eligibleAssignees.length > 0 ? (
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
            <div className={styles.technicalRequestActions}>
              <ButtonBar type="button" disabled={workflow.assignmentPage === 0 || profiles.isFetching} onClick={() => workflow.goToAssignmentPage(workflow.assignmentPage - 1)}>Trang trước</ButtonBar>
              <span>Trang {workflow.assignmentPage + 1} / {totalPages}</span>
              <ButtonBar type="button" disabled={workflow.assignmentPage + 1 >= totalPages || profiles.isFetching} onClick={() => workflow.goToAssignmentPage(workflow.assignmentPage + 1)}>Trang sau</ButtonBar>
            </div>
          ) : null}
          <ButtonBar
            type="submit"
            disabled={!workflow.selectedAssigneeId || !workflow.assignmentReason.trim() || profiles.isFetching || mutation.isPending}
          >
            {mutation.isPending ? "Đang phân công…" : actionLabel}
          </ButtonBar>
        </>
      ) : null}
    </form>
  );
}

export function BuybackOperatorScreen({ caseId, listHref, operatorRole }: { caseId?: string; listHref: string; operatorRole: "ADMIN" | "MODERATOR" }) {
  const workflow = useBuybackWorkflowController({ role: "operator", operatorRole, initialCaseId: caseId, listHref });
  const { caseData } = workflow;
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const selectedPaymentProof = workflow.paymentProofs.data?.items.find((proof) => proof.id === workflow.proofId);
  const closeCancelDialog = () => {
    if (workflow.cancelBuyback.isPending) return;
    setCancelDialogOpen(false);
  };
  const submitCancelBuyback = () => {
    const reason = cancelReason.trim();
    if (!caseData || !workflow.canCancelExternalBuyback || !reason || workflow.cancelBuyback.isPending) return;
    const key = workflow.operationKey("buyback-cancel", caseData.id, reason);
    workflow.cancelBuyback.mutate(
      { id: caseData.id, reason, idempotencyKey: key, correlationId: key },
      { onSuccess: () => { setCancelDialogOpen(false); setCancelReason(""); } },
    );
  };

  return (
    <BuybackWorkflowLayout
      title="Thu mua và tân trang máy"
      description="Theo dõi đề nghị, thẩm định, thanh toán, thu hồi và tiến độ theo trạng thái Dolores xác nhận."
      actionBarBackHref={workflow.isModeratorRoute && caseId ? listHref : undefined}
    >
      <BuybackCaseList workflow={workflow} />
      {caseId && caseData && workflow.canCancelExternalBuyback ? (
        <ActionBarConfig>
          <ButtonBar type="button" onClick={() => { setCancelReason(""); setCancelDialogOpen(true); }} disabled={workflow.cancelBuyback.isPending}>
            {workflow.cancelBuyback.isPending ? "Đang hủy yêu cầu…" : "Hủy yêu cầu"}
          </ButtonBar>
        </ActionBarConfig>
      ) : null}
      <BuybackDetailPanel workflow={workflow}>
        {caseData ? <>
          {workflow.isExternalBuyback && caseData.responsibleModeratorId ? <p className={styles.notice}>Moderator phụ trách: <span className={styles.codeValue}>{caseData.responsibleModeratorId}</span></p> : null}
          {workflow.isExternalBuyback && caseData.inspectionTechnicianId ? <p className={styles.notice}>Technician kiểm tra: <span className={styles.codeValue}>{caseData.inspectionTechnicianId}</span></p> : null}
          {workflow.isExternalBuyback && caseData.collectionTechnicianId ? <p className={styles.notice}>Technician thu máy: <span className={styles.codeValue}>{caseData.collectionTechnicianId}</span></p> : null}
          {workflow.isExternalBuyback && caseData.refurbishmentTechnicianId ? <p className={styles.notice}>Technician tân trang: <span className={styles.codeValue}>{caseData.refurbishmentTechnicianId}</span></p> : null}
          <BuybackAssignmentPanel workflow={workflow} />
          {workflow.isExternalBuyback && caseData.ownerAccepted === true ? <p className={styles.notice} role="status">Owner đã chấp nhận giá {formatBuybackMoney(caseData.acceptedPrice, caseData.currency)}. Có thể bắt đầu điều phối thu máy.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTED" ? <p className={styles.notice} role="status">Dolores đã xác nhận nhận máy. Có thể tạo khoản thanh toán mua lại.</p> : null}
          {workflow.isExternalBuyback && workflow.canManageExternalPayment && caseData.status === "COLLECTED" ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const paymentMethod = workflow.paymentMethod.trim();
              const externalReference = workflow.externalReference.trim();
              const key = workflow.operationKey("create-payment", caseData.id, JSON.stringify({ paymentMethod, externalReference }));
              workflow.createPayment.mutate({ id: caseData.id, paymentMethod, ...(externalReference ? { externalReference } : {}), idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Tạo khoản chi thu mua</h3>
              <p className={styles.formHint}>Dolores tự tính số tiền theo giá Owner đã chấp nhận. Không nhập số tiền ở màn hình này.</p>
              <label className={styles.formField}><span>Phương thức thanh toán</span><input required maxLength={64} value={workflow.paymentMethod} onChange={(event) => workflow.setPaymentMethod(event.target.value)} /></label>
              <label className={styles.formField}><span>Mã tham chiếu thanh toán (tùy chọn)</span><input maxLength={256} value={workflow.externalReference} onChange={(event) => workflow.setExternalReference(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.paymentMethod.trim() || workflow.createPayment.isPending}>Tạo khoản chi</ButtonBar>
            </form>
          ) : null}
          {workflow.isExternalBuyback && workflow.createPayment.data?.buybackCaseId === caseData.id ? <p className={styles.notice} role="status">Dolores đã tạo khoản chi {formatBuybackMoney(workflow.createPayment.data.amount, workflow.createPayment.data.currency)}. Mã khoản chi: <span className={styles.codeValue}>{workflow.createPayment.data.id}</span></p> : null}
          {workflow.isExternalBuyback && workflow.canManageExternalPayment && caseData.status === "PAYMENT_PENDING" ? (
            <section className={styles.formPanel} aria-label="Tải chứng từ khoản chi thu mua">
              <h3 className={styles.sectionTitle}>Tải chứng từ thanh toán</h3>
              <p className={styles.formHint}>Dùng mã khoản chi do Dolores trả về khi tạo payout. API hiện chưa có endpoint liệt kê payout, nên sau khi mở lại trang hãy nhập mã đã lưu từ response.</p>
              <label className={styles.formField}><span>Mã khoản chi</span><input required value={workflow.paymentId} onChange={(event) => workflow.setPaymentId(event.target.value.trim())} /></label>
              <form className={styles.assignmentForm} onSubmit={workflow.perform(() => {
                if (!workflow.paymentId || !workflow.proofFile) return;
                const key = workflow.paymentProofOperationKey(caseData.id, workflow.paymentId, workflow.proofFile);
                workflow.submitProof.mutate({ id: caseData.id, paymentId: workflow.paymentId, key, correlationId: key, file: workflow.proofFile });
              })}>
                <label className={styles.formField}><span>Tệp PDF, JPEG hoặc PNG (tối đa 20 MB)</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => workflow.setProofFile(event.target.files?.[0] ?? null)} /></label>
                <ButtonBar type="submit" disabled={!workflow.paymentId || !workflow.proofFile || workflow.submitProof.isPending}>Tải chứng từ riêng tư</ButtonBar>
              </form>
              {workflow.proofId ? <p className={styles.notice} role="status">Đã tải chứng từ. Mã chứng từ: <span className={styles.codeValue}>{workflow.proofId}</span></p> : null}
            </section>
          ) : null}
          {caseData.status === "VALUATION_PENDING" ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const approvedPrice = workflow.approvedPrice.trim();
              const approved = Boolean(approvedPrice);
              const reason = workflow.decisionReason.trim();
              const key = workflow.operationKey("valuation-decision", caseData.id, JSON.stringify({ approved, approvedPrice, reason }));
              workflow.decideValuation.mutate({ id: caseData.id, approved, ...(approvedPrice ? { approvedPrice: Number(approvedPrice) } : {}), reason, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Quyết định giá</h3>
              <label className={styles.formField}><span>Giá duyệt (để trống nếu từ chối)</span><input type="number" min="0.01" step="0.01" value={workflow.approvedPrice} onChange={(event) => workflow.setApprovedPrice(event.target.value)} /></label>
              <label className={styles.formField}><span>Lý do quyết định</span><textarea required maxLength={2000} value={workflow.decisionReason} onChange={(event) => workflow.setDecisionReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.decisionReason.trim() || (workflow.approvedPrice.trim() !== "" && (!Number.isFinite(Number(workflow.approvedPrice)) || Number(workflow.approvedPrice) <= 0)) || workflow.decideValuation.isPending}>{workflow.approvedPrice.trim() ? "Duyệt giá" : "Từ chối giá"}</ButtonBar>
            </form>
          ) : null}
          {caseData.status === "PAYMENT_PENDING" && !workflow.isExternalBuyback ? (
            <div className={styles.formPanel}>
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
                <ButtonBar type="button" disabled={!workflow.proofId || !workflow.proofReviewReason.trim() || workflow.reviewProof.isPending} onClick={() => {
                  const key = workflow.operationKey("proof-review-reject", workflow.proofId);
                  workflow.reviewProof.mutate({ caseId: caseData.id, proofId: workflow.proofId, approved: false, reason: workflow.proofReviewReason.trim(), idempotencyKey: key, correlationId: key });
                }}>Từ chối</ButtonBar>
              </div>
            </div>
          ) : null}
          {workflow.isExternalBuyback && workflow.canRequestCollection ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const reason = workflow.collectionReason.trim();
              const key = workflow.operationKey("collection-request", caseData.id, reason);
              workflow.requestCollection.mutate({ id: caseData.id, reason, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Điều phối thu máy</h3>
              <p className={styles.formHint}>Owner đã chấp nhận đúng giá Dolores duyệt. Yêu cầu này chuyển hồ sơ sang COLLECTION_PENDING.</p>
              <label className={styles.formField}><span>Lý do / hướng dẫn thu máy</span><textarea required maxLength={2000} value={workflow.collectionReason} onChange={(event) => workflow.setCollectionReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.collectionReason.trim() || workflow.requestCollection.isPending}>Yêu cầu thu máy</ButtonBar>
            </form>
          ) : null}
          {caseData.status === "PAID" && !workflow.isExternalBuyback ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const key = workflow.operationKey("collection-request", caseData.id);
              workflow.requestCollection.mutate({ id: caseData.id, reason: workflow.collectionReason.trim(), idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Yêu cầu thu máy</h3>
              <label className={styles.formField}><span>Lý do / hướng dẫn thu máy</span><textarea required maxLength={2000} value={workflow.collectionReason} onChange={(event) => workflow.setCollectionReason(event.target.value)} /></label>
              <ButtonBar type="submit" disabled={!workflow.collectionReason.trim() || workflow.requestCollection.isPending}>Yêu cầu thu máy</ButtonBar>
            </form>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" ? <>
            <p className={styles.notice} role="note">Dolores đang điều phối Technician đến thu máy. Chỉ Technician được gán mới ghi serial, địa điểm và evidence reference.</p>
            {caseData.collectionEvidenceRecorded ? (
              <form className={styles.formPanel} onSubmit={workflow.perform(() => {
                const evidenceReference = workflow.collectionConfirmationReference.trim();
                const key = workflow.operationKey("collection-confirm", caseData.id, evidenceReference);
                workflow.confirmCollection.mutate({ id: caseData.id, evidenceReference, idempotencyKey: key, correlationId: key });
              })}>
                <h3 className={styles.sectionTitle}>Xác nhận đã nhận máy</h3>
                <p className={styles.formHint}>Server đã ghi nhận evidence. Tra cứu reference trong hệ thống lưu trữ ngoài rồi nhập reference dùng để xác nhận đã nhận máy.</p>
                <label className={styles.formField}><span>Evidence reference</span><input required maxLength={2048} value={workflow.collectionConfirmationReference} onChange={(event) => workflow.setCollectionConfirmationReference(event.target.value)} /></label>
                <ButtonBar type="submit" disabled={!workflow.canConfirmCollection || !workflow.collectionConfirmationReference.trim() || workflow.confirmCollection.isPending}>Xác nhận đã thu máy</ButtonBar>
              </form>
            ) : <p className={styles.formHint}>Chưa có bằng chứng thu máy trong hồ sơ Dolores.</p>}
          </> : null}
          {workflow.isExternalBuyback && workflow.paymentProofs.isPending ? <p className={styles.notice} role="status">Đang tải metadata chứng từ thanh toán…</p> : null}
          {workflow.isExternalBuyback && workflow.paymentProofs.isError ? <div className={styles.formPanel}><BuybackErrorNotice error={workflow.paymentProofs.error} /><ButtonBar type="button" onClick={() => void workflow.paymentProofs.refetch()}>Tải lại danh sách chứng từ</ButtonBar></div> : null}
          {workflow.isExternalBuyback && workflow.paymentProofs.data?.items.length ? (
            <section className={styles.formPanel} aria-label="Metadata chứng từ thanh toán thu mua">
              <h3 className={styles.sectionTitle}>Chứng từ thanh toán</h3>
              <div className={styles.detailGrid}>
                {workflow.paymentProofs.data.items.map((proof) => (
                  <div className={styles.detailItem} key={proof.id}>
                    <strong>{proof.status}</strong>
                    <span>{formatBuybackMoney(proof.amount, proof.currency ?? caseData.currency)}</span>
                    <span>{proof.originalFilename} · gửi lúc {proof.submittedAt}</span>
                    <span>Mã chứng từ: <span className={styles.codeValue}>{proof.id}</span></span>
                    {proof.reviewReason ? <span>Lý do xét duyệt: {proof.reviewReason}</span> : null}
                    {workflow.canManageExternalPayment ? <ButtonBar type="button" disabled={workflow.downloadProof.isPending} onClick={() => workflow.downloadProof.mutate({ id: proof.id, filename: proof.originalFilename })}>Đọc chứng từ riêng tư</ButtonBar> : null}
                    {workflow.canManageExternalPayment && proof.status === "SUBMITTED" && proof.submittedBy !== workflow.ownerId ? <ButtonBar type="button" onClick={() => { workflow.setProofId(proof.id); workflow.setProofReviewReason(""); }}>Chọn để xét duyệt</ButtonBar> : null}
                    {workflow.canManageExternalPayment && proof.status === "SUBMITTED" && proof.submittedBy === workflow.ownerId ? <span>Người gửi không thể tự xét duyệt.</span> : null}
                  </div>
                ))}
              </div>
              {workflow.canManageExternalPayment && selectedPaymentProof?.status === "SUBMITTED" && selectedPaymentProof.submittedBy !== workflow.ownerId ? (
                <div className={styles.assignmentForm}>
                  <p className={styles.formHint}>BE kiểm tra thêm người tạo payout; người tạo payout và người tải chứng từ không được tự duyệt.</p>
                  <label className={styles.formField}><span>Lý do duyệt / từ chối</span><textarea required maxLength={2000} value={workflow.proofReviewReason} onChange={(event) => workflow.setProofReviewReason(event.target.value)} /></label>
                  <div className={styles.technicalRequestActions}>
                    <ButtonBar type="button" disabled={!workflow.proofReviewReason.trim() || workflow.reviewProof.isPending} onClick={() => {
                      const key = workflow.operationKey("proof-review-approve", selectedPaymentProof.id, workflow.proofReviewReason.trim());
                      workflow.reviewProof.mutate({ caseId: caseData.id, proofId: selectedPaymentProof.id, approved: true, reason: workflow.proofReviewReason.trim(), idempotencyKey: key, correlationId: key });
                    }}>Duyệt thanh toán</ButtonBar>
                    <ButtonBar type="button" disabled={!workflow.proofReviewReason.trim() || workflow.reviewProof.isPending} onClick={() => {
                      const key = workflow.operationKey("proof-review-reject", selectedPaymentProof.id, workflow.proofReviewReason.trim());
                      workflow.reviewProof.mutate({ caseId: caseData.id, proofId: selectedPaymentProof.id, approved: false, reason: workflow.proofReviewReason.trim(), idempotencyKey: key, correlationId: key });
                    }}>Từ chối chứng từ</ButtonBar>
                  </div>
                </div>
              ) : null}
              {workflow.paymentProofs.data.hasNext || workflow.proofPage > 0 ? <div className={styles.technicalRequestActions}><ButtonBar type="button" disabled={workflow.proofPage === 0} onClick={() => workflow.setProofPage((value) => Math.max(0, value - 1))}>Chứng từ trước</ButtonBar><span>Trang {workflow.paymentProofs.data.page + 1}</span><ButtonBar type="button" disabled={!workflow.paymentProofs.data.hasNext} onClick={() => workflow.setProofPage((value) => value + 1)}>Chứng từ sau</ButtonBar></div> : null}
            </section>
          ) : null}
          {workflow.canRegisterMachine ? (
            <form className={styles.formPanel} onSubmit={workflow.perform(() => {
              const modelId = workflow.registrationModelId;
              const reason = workflow.registrationReason.trim();
              const region = workflow.registrationRegion.trim();
              const request = { machineType: workflow.registrationMachineType, modelId, ...(region ? { region } : {}), reason };
              const key = workflow.operationKey("machine-register", caseData.id, JSON.stringify(request));
              workflow.registerMachine.mutate({ id: caseData.id, ...request, idempotencyKey: key, correlationId: key });
            })}>
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
            </form>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "REGISTERED" && caseData.registeredMachineId ? <p className={styles.notice} role="status">Dolores đã đăng ký máy <span className={styles.codeValue}>{caseData.registeredMachineId}</span>.</p> : null}
          {!workflow.isExternalBuyback && caseData.status === "QA_PENDING" ? (
            <div className={styles.formPanel}>
              <h3 className={styles.sectionTitle}>Kiểm định độc lập</h3>
              <label className={styles.formField}><span>Kết quả</span><select value={workflow.qaPassed ? "true" : "false"} onChange={(event) => workflow.setQaPassed(event.target.value === "true")}><option value="true">Đạt</option><option value="false">Chưa đạt</option></select></label>
              <label className={styles.formField}><span>Lý do</span><textarea required maxLength={2000} value={workflow.qaReason} onChange={(event) => workflow.setQaReason(event.target.value)} /></label>
              <ButtonBar type="button" disabled={!workflow.qaReason.trim() || workflow.decideQa.isPending} onClick={() => {
                const key = workflow.operationKey("qa-decision", caseData.id);
                workflow.decideQa.mutate({ id: caseData.id, passed: workflow.qaPassed, reason: workflow.qaReason.trim(), idempotencyKey: key, correlationId: key });
              }}>Ghi nhận kiểm định</ButtonBar>
            </div>
          ) : null}
        </> : null}
      </BuybackDetailPanel>
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
  return <BuybackOperatorScreen caseId={caseId} listHref={listHref} operatorRole="MODERATOR" />;
}
