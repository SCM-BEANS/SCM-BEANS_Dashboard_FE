import { useEffect, useState } from "react";
import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import { PageActions } from "@/components/action-bar/page-actions";
import { PATH_TECHNICIAN } from "@/routes/path";
import {
  BuybackCaseList,
  BuybackDetailPanel,
  BuybackWorkflowLayout,
} from "./buyback-workflow-shared";
import { useBuybackWorkflowController } from "./buyback-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";

export function BuybackTechnicianScreen({ caseId }: { caseId?: string } = {}) {
  const listHref = PATH_TECHNICIAN.TASK_BUYBACK_ASSESSMENT;
  const workflow = useBuybackWorkflowController({ role: "technician", initialCaseId: caseId, listHref });
  const { caseData } = workflow;
  const [inspectionFiles, setInspectionFiles] = useState<File[]>([]);
  const [collectionFiles, setCollectionFiles] = useState<File[]>([]);
  const [refurbishmentFiles, setRefurbishmentFiles] = useState<File[]>([]);
  useEffect(() => { setInspectionFiles([]); setCollectionFiles([]); setRefurbishmentFiles([]); }, [workflow.detailId]);
  const inspectionError = evidenceFileError(inspectionFiles, { min: 0, max: 5 });
  const collectionError = evidenceFileError(collectionFiles, { min: 1, max: 1 });
  const refurbishmentError = evidenceFileError(refurbishmentFiles, { min: 0, max: 5 });
  const isAssignedInspection = Boolean(
    caseData
      && (!workflow.isExternalBuyback || caseData.inspectionTechnicianId === workflow.ownerId),
  );
  const isAssignedCollection = Boolean(
    caseData
      && workflow.isExternalBuyback
      && caseData.collectionTechnicianId === workflow.ownerId,
  );

  return (
    <BuybackWorkflowLayout
      title="Đánh giá máy thu mua"
      description={caseId
        ? "Ghi nhận tình trạng và giá trị thẩm định cho hồ sơ được giao cho bạn."
        : "Danh sách chỉ gồm hồ sơ buyback được Dolores giao cho tài khoản Technician hiện tại."}
      back={caseId ? { label: "Danh sách đánh giá", fallbackHref: listHref } : null}
      actionBarBackHref={caseId ? listHref : PATH_TECHNICIAN.TASKS}
      actionBarBackLabel={caseId ? "Về danh sách đánh giá" : "Về công việc"}
    >
      <BuybackCaseList workflow={workflow} />
      <BuybackDetailPanel workflow={workflow}>
        {caseData ? <>
          {workflow.isExternalBuyback && caseData.status === "REQUESTED" && !isAssignedInspection ? (
            <p className={styles.notice} role="note">Hồ sơ này chưa được giao cho tài khoản Technician hiện tại.</p>
          ) : null}
          {caseData.status === "REQUESTED" && isAssignedInspection ? (
            <p className={styles.notice} role="note">Hồ sơ đang chờ bạn tiếp nhận. Quay lại danh sách đánh giá và nhấn Tiếp nhận để bắt đầu.</p>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" && !isAssignedCollection ? (
            <p className={styles.notice} role="note">Hồ sơ thu máy này chưa được giao cho tài khoản Technician hiện tại.</p>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" && isAssignedCollection && !caseData.collectionEvidenceRecorded ? (
            <form id="buyback-collection-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              const confirmedSerial = workflow.confirmedCollectionSerial.trim();
              const collectionLocation = workflow.collectionLocation.trim();
              if (collectionError) return;
              const key = workflow.operationKey("collection-evidence", caseData.id, JSON.stringify({ confirmedSerial, collectionLocation, files: collectionFiles.map(f => [f.name, f.size, f.lastModified]) }));
              workflow.recordCollectionEvidence.mutate({ id: caseData.id, confirmedSerial, collectionLocation, files: collectionFiles, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Ghi nhận đã thu máy</h3>
              <label className={styles.formField}><span>Serial đã xác nhận</span><input required maxLength={128} value={workflow.confirmedCollectionSerial} onChange={(event) => workflow.setConfirmedCollectionSerial(event.target.value)} /></label>
              <label className={styles.formField}><span>Địa điểm thu máy</span><input required maxLength={512} value={workflow.collectionLocation} onChange={(event) => workflow.setCollectionLocation(event.target.value)} /></label>
              <label className={styles.formField}><span>Chứng từ thu máy</span><input key={workflow.detailId} type="file" accept={EVIDENCE_ACCEPT} onChange={(event) => setCollectionFiles(Array.from(event.target.files ?? []))} /></label>
              {collectionFiles.map((file, index) => <p key={`${file.name}-${index}`}>{file.name}</p>)}
              <PageActions actions={[{ id: "collection-evidence", label: "Ghi nhận thu máy", variant: "primary", priority: 100, type: "submit", form: "buyback-collection-form", disabled: !workflow.confirmedCollectionSerial.trim() || !workflow.collectionLocation.trim() || Boolean(collectionError), disabledReason: collectionError ?? "Nhập đầy đủ thông tin thu máy.", pending: workflow.recordCollectionEvidence.isPending }]} />
            </form>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "COLLECTION_PENDING" && isAssignedCollection && caseData.collectionEvidenceRecorded ? <p className={styles.notice} role="status">Đã ghi nhận bằng chứng thu máy. Moderator phụ trách sẽ xác nhận tiếp nhận trong Dolores.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "PAID" && caseData.refurbishmentTechnicianId !== workflow.ownerId ? <p className={styles.notice} role="note">Hồ sơ chưa được giao tân trang cho tài khoản Technician hiện tại.</p> : null}
          {workflow.isExternalBuyback && caseData.status === "REFURBISHING" && !workflow.canCompleteRefurbishment ? <p className={styles.notice} role="note">Chỉ Technician được giao tân trang mới có thể ghi kết quả cho hồ sơ này.</p> : null}
          {caseData.status === "INSPECTION_PENDING" ? (
            <form id="buyback-inspection-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              if (inspectionError) return;
              const inspection = {
                condition: workflow.condition.trim(),
                valuationAmount: Number(workflow.valuationAmount),
                currency: workflow.currency.trim() || caseData.currency,
                ...(workflow.inspectionNotes.trim() ? { notes: workflow.inspectionNotes.trim() } : {}),
              };
              const key = workflow.operationKey("inspection-submit", caseData.id, JSON.stringify({ ...inspection, files: inspectionFiles.map(f => [f.name, f.size, f.lastModified]) }));
              workflow.submitInspection.mutate({
                id: caseData.id,
                ...inspection,
                files: inspectionFiles,
                idempotencyKey: key,
                correlationId: key,
              });
            })}>
              <h3 className={styles.sectionTitle}>Ghi nhận kiểm tra và định giá sơ bộ</h3>
              <label className={styles.formField}><span>Tình trạng máy</span><textarea required maxLength={2000} value={workflow.condition} onChange={(event) => workflow.setCondition(event.target.value)} /></label>
              <label className={styles.formField}><span>Giá trị thẩm định</span><input required type="number" min="0.01" step="0.01" value={workflow.valuationAmount} onChange={(event) => workflow.setValuationAmount(event.target.value)} /></label>
              <label className={styles.formField}><span>Tiền tệ</span><input required maxLength={16} value={workflow.currency || caseData.currency} onChange={(event) => workflow.setCurrency(event.target.value)} /></label>
              <label className={styles.formField}><span>Ghi chú</span><textarea maxLength={2000} value={workflow.inspectionNotes} onChange={(event) => workflow.setInspectionNotes(event.target.value)} /></label>
              <label className={styles.formField}><span>Chứng từ kiểm tra</span><input key={workflow.detailId} type="file" multiple accept={EVIDENCE_ACCEPT} onChange={(event) => setInspectionFiles(Array.from(event.target.files ?? []))} /></label>
              {inspectionFiles.map((file, index) => <p key={`${file.name}-${index}`}>{file.name}</p>)}
              <PageActions actions={[{ id: "submit-inspection", label: "Gửi kết quả kiểm tra", variant: "primary", priority: 100, type: "submit", form: "buyback-inspection-form", disabled: !workflow.condition.trim() || !workflow.valuationAmount || Boolean(inspectionError), disabledReason: inspectionError ?? "Nhập tình trạng và giá trị thẩm định.", pending: workflow.submitInspection.isPending, pendingLabel: "Đang gửi…" }]} />
            </form>
          ) : null}
          {!workflow.isExternalBuyback && caseData.status === "COLLECTED" ? (
            <form id="buyback-start-refurbishment-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              const key = workflow.operationKey("refurbishment-start", caseData.id);
              workflow.startRefurbishment.mutate({ id: caseData.id, workPlanned: workflow.workPlanned.trim(), estimatedPartsCost: Number(workflow.estimatedPartsCost || 0), currency: workflow.currency.trim() || caseData.currency, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Bắt đầu tân trang</h3>
              <label className={styles.formField}><span>Kế hoạch công việc</span><textarea required value={workflow.workPlanned} onChange={(event) => workflow.setWorkPlanned(event.target.value)} /></label>
              <label className={styles.formField}><span>Chi phí linh kiện ước tính</span><input type="number" min="0" step="0.01" value={workflow.estimatedPartsCost} onChange={(event) => workflow.setEstimatedPartsCost(event.target.value)} /></label>
              <PageActions actions={[{ id: "start-refurbishment", label: "Bắt đầu tân trang", variant: "primary", priority: 100, type: "submit", form: "buyback-start-refurbishment-form", disabled: !workflow.workPlanned.trim(), disabledReason: "Nhập công việc dự kiến.", pending: workflow.startRefurbishment.isPending }]} />
            </form>
          ) : null}
          {workflow.isExternalBuyback && caseData.status === "PAID" && workflow.canStartRefurbishment ? (
            <form id="buyback-external-refurbishment-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              const workPlanned = workflow.workPlanned.trim();
              const estimatedPartsCost = Number(workflow.estimatedPartsCost || 0);
              const key = workflow.operationKey("refurbishment-start", caseData.id, JSON.stringify({ workPlanned, estimatedPartsCost, currency: caseData.currency }));
              workflow.startRefurbishment.mutate({ id: caseData.id, workPlanned, estimatedPartsCost, currency: caseData.currency, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Bắt đầu tân trang</h3>
              <label className={styles.formField}><span>Kế hoạch công việc</span><textarea required maxLength={2000} value={workflow.workPlanned} onChange={(event) => workflow.setWorkPlanned(event.target.value)} /></label>
              <label className={styles.formField}><span>Chi phí linh kiện ước tính ({caseData.currency})</span><input type="number" min="0" step="0.01" value={workflow.estimatedPartsCost} onChange={(event) => workflow.setEstimatedPartsCost(event.target.value)} /></label>
              <PageActions actions={[{ id: "start-refurbishment", label: "Bắt đầu tân trang", variant: "primary", priority: 100, type: "submit", form: "buyback-external-refurbishment-form", disabled: !workflow.workPlanned.trim() || !Number.isFinite(Number(workflow.estimatedPartsCost || 0)) || Number(workflow.estimatedPartsCost || 0) < 0, disabledReason: "Nhập công việc và chi phí hợp lệ.", pending: workflow.startRefurbishment.isPending }]} />
            </form>
          ) : null}
          {caseData.status === "REFURBISHING" && (!workflow.isExternalBuyback || workflow.canCompleteRefurbishment) ? (
            <form id="buyback-complete-refurbishment-form" className={styles.formPanel} onSubmit={workflow.perform(() => {
              if (refurbishmentError) return;
              const key = workflow.operationKey("refurbishment-complete", caseData.id, JSON.stringify({ workPerformed: workflow.workPerformed.trim(), result: workflow.workResult.trim(), files: refurbishmentFiles.map(f => [f.name, f.size, f.lastModified]) }));
              workflow.completeRefurbishment.mutate({ id: caseData.id, workPerformed: workflow.workPerformed.trim(), result: workflow.workResult.trim(), files: refurbishmentFiles, idempotencyKey: key, correlationId: key });
            })}>
              <h3 className={styles.sectionTitle}>Hoàn tất tân trang</h3>
              <label className={styles.formField}><span>Công việc đã làm</span><textarea required maxLength={2000} value={workflow.workPerformed} onChange={(event) => workflow.setWorkPerformed(event.target.value)} /></label>
              <label className={styles.formField}><span>Kết quả</span><textarea required maxLength={2000} value={workflow.workResult} onChange={(event) => workflow.setWorkResult(event.target.value)} /></label>
              <label className={styles.formField}><span>Chứng từ tân trang</span><input key={workflow.detailId} type="file" multiple accept={EVIDENCE_ACCEPT} onChange={(event) => setRefurbishmentFiles(Array.from(event.target.files ?? []))} /></label>
              {refurbishmentFiles.map((file, index) => <p key={`${file.name}-${index}`}>{file.name}</p>)}
              <PageActions actions={[{ id: "complete-refurbishment", label: "Hoàn tất tân trang", variant: "primary", priority: 100, type: "submit", form: "buyback-complete-refurbishment-form", disabled: !workflow.workPerformed.trim() || !workflow.workResult.trim() || Boolean(refurbishmentError), disabledReason: refurbishmentError ?? "Nhập công việc và kết quả.", pending: workflow.completeRefurbishment.isPending }]} />
            </form>
          ) : null}
        </> : null}
      </BuybackDetailPanel>
    </BuybackWorkflowLayout>
  );
}
