import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { profilesApi } from "@/apis/profiles.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildRecallLegacyReviewActions } from "@/components/action-bar/entity-page-actions";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import type { RecallEvidence, RecallEvidenceType } from "@/schema/termination-workflow.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

type Role = "owner" | "technician" | "operator";
type Props = { role: Role; queryScopeRole?: "ADMIN" | "MODERATOR"; contractId?: string; workOrderId?: string; onOpen?: (id: string) => void; backHref?: string };

const recallLabels: Record<string, string> = { UNASSIGNED: "Chưa phân công", ASSIGNED: "Đã phân công", SCHEDULED: "Đã lên lịch", PICKUP_IN_PROGRESS: "Đang thu hồi", OWNER_ACK_PENDING: "Chờ chủ sở hữu xác nhận", CUSTODY_VERIFICATION_PENDING: "Chờ xác minh tại kho", RECEIPT_REVIEW_PENDING: "Chờ duyệt nhận kho", RECEIVED_AT_DEPOT: "Đã nhận tại kho", LEGACY_REVIEW_REQUIRED: "Cần rà soát hồ sơ cũ", CANCELLED: "Đã hủy" };
function correlationId() { return createIdempotencyKey(); }

function localDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function evidenceFilename(disposition?: string) {
  if (!disposition) return "recall-evidence";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const quoted = /filename="([^"]+)"/i.exec(disposition)?.[1];
  const raw = encoded ? decodeURIComponent(encoded) : quoted ?? "recall-evidence";
  return raw.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "recall-evidence";
}

export function RecallWorkOrdersScreen({ role, queryScopeRole, contractId, workOrderId, onOpen, backHref }: Props) {
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject(role === "operator" ? queryScopeRole ?? role : role.toUpperCase());
  const currentSubjectId = getAuthenticatedSubjectId();
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(0);
  const [technicianPage, setTechnicianPage] = useState(0);
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conditionNotes, setConditionNotes] = useState("");
  const [depotLocation, setDepotLocation] = useState("");
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [legacyDecision, setLegacyDecision] = useState<"PICKUP_REQUIRED" | "VERIFY_ALREADY_AT_DEPOT">("PICKUP_REQUIRED");
  const [legacyReason, setLegacyReason] = useState("");
  const [legacyCorrelation, setLegacyCorrelation] = useState("");
  const [decisionReason, setDecisionReason] = useState("");

  const id = workOrderId ?? selectedId;
  const list = useQuery({
    queryKey: ["dolores", "recall-work-orders", subject, contractId ?? "all", page],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ ...(contractId ? { contractId } : {}), page, size: 20 }, signal),
    enabled: !id,
    retry: false,
  });
  const workOrder = useQuery({
    queryKey: ["dolores", "recall-work-order", subject, id],
    queryFn: ({ signal }) => recallWorkOrdersApi.getById(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
  const terminationCaseId = workOrder.data?.terminationCaseId ?? "";
  const terminationCase = useQuery({
    queryKey: ["dolores", "termination-case", subject, terminationCaseId],
    queryFn: ({ signal }) => terminationCasesApi.getById(terminationCaseId, signal),
    enabled: Boolean(terminationCaseId),
    retry: false,
  });
  const events = useQuery({
    queryKey: ["dolores", "recall-work-order-events", subject, id],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvents(id, 0, 50, signal),
    enabled: Boolean(id),
    retry: false,
  });
  const evidence = useQuery({
    queryKey: ["dolores", "recall-work-order-evidence", subject, id],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvidence(id, signal),
    enabled: Boolean(id),
    retry: false,
  });
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "recall-technicians", subject, technicianSearch, technicianPage],
    queryFn: ({ signal }) => profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", q: technicianSearch || undefined, page: technicianPage, size: 20 }, signal),
    enabled: role === "operator" && Boolean(id),
    retry: false,
  });

  const refresh = async () => {
    await Promise.allSettled([
      list.refetch(),
      ...(id ? [workOrder.refetch(), events.refetch(), evidence.refetch()] : []),
      ...(terminationCaseId ? [terminationCase.refetch()] : []),
    ]);
  };
  const commonMutationOptions = {
    onSettled: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", subject] });
    },
  };
  const assign = useMutation({
    mutationFn: () => recallWorkOrdersApi.assign(id, { technicianId, scheduledPickupAt: scheduledPickupAt || undefined, correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const legacyReview = useMutation({
    mutationFn: () => recallWorkOrdersApi.legacyReview(id, { decision: legacyDecision, ...(legacyDecision === "VERIFY_ALREADY_AT_DEPOT" ? { technicianId } : {}), reason: legacyReason, correlationId: legacyCorrelation }),
    ...commonMutationOptions,
    onSuccess: () => setLegacyOpen(false),
  });
  const startPickup = useMutation({
    mutationFn: () => recallWorkOrdersApi.startPickup(id, correlationId()),
    ...commonMutationOptions,
  });
  const pickupAttempt = useMutation({
    mutationFn: (input: { successful: boolean; evidenceId?: string; notes?: string }) => recallWorkOrdersApi.recordPickup(id, { ...input, correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const acknowledgeOwner = useMutation({
    mutationFn: () => recallWorkOrdersApi.acknowledgeOwner(id, { conditionNotes, evidenceId: selectedEvidence.OWNER_HANDOVER ?? "", correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const submitDepotReceipt = useMutation({
    mutationFn: () => recallWorkOrdersApi.submitDepotReceipt(id, { depotLocation, evidenceId: selectedEvidence.DEPOT_RECEIPT ?? "", correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const reviewDepotReceipt = useMutation({
    mutationFn: (input: { approved: boolean; reason?: string }) => recallWorkOrdersApi.reviewDepotReceipt(id, { ...input, correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const createInspectionTicket = useMutation({
    mutationFn: () => terminationCasesApi.createInspectionTicket(terminationCaseId, { correlationId: correlationId() }),
    ...commonMutationOptions,
  });
  const uploadEvidence = useMutation({
    mutationFn: ({ type, file }: { type: RecallEvidenceType; file: File }) => recallWorkOrdersApi.uploadEvidence(id, type, correlationId(), file),
    onSettled: async () => {
      await Promise.allSettled([evidence.refetch(), workOrder.refetch()]);
    },
    onSuccess: (uploaded) => {
      setSelectedEvidence((current) => ({ ...current, [uploaded.evidenceType]: uploaded.id }));
      setSelectedFile(null);
    },
  });
  const downloadEvidence = useMutation({
    mutationFn: (evidenceId: string) => recallWorkOrdersApi.downloadEvidence(id, evidenceId),
    onSuccess: ({ blob, contentDisposition }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = evidenceFilename(contentDisposition);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

  const currentWorkOrder = workOrder.data;
  const isAssignedTechnician = role === "technician" && Boolean(currentSubjectId) && currentWorkOrder?.assignedTechnicianId?.toLowerCase() === currentSubjectId?.toLowerCase();
  const uploadType: RecallEvidenceType | null = role === "owner" && currentWorkOrder?.status === "OWNER_ACK_PENDING"
    ? "OWNER_HANDOVER"
    : isAssignedTechnician && currentWorkOrder?.status === "PICKUP_IN_PROGRESS"
      ? "PICKUP"
      : isAssignedTechnician && currentWorkOrder?.status === "CUSTODY_VERIFICATION_PENDING"
        ? "DEPOT_RECEIPT"
        : null;
  const refreshButton = <ButtonBar type="button" disabled={list.isFetching || workOrder.isFetching} onClick={() => void refresh()}>Rafraîchir</ButtonBar>;

  if (!id) {
    return (
      <div className={styles.pageContent}>
        <BackButtonHeading title="Thu hồi máy" titleId="recall-list-title" description="Theo dõi lịch nhận máy, xác nhận bàn giao và duyệt nhận tại kho." className={styles.pageHeading} back={null} />
        <section className={styles.panel} aria-labelledby="recall-list-title">
          {refreshButton}
          {list.isPending ? <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p> : null}
          {list.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(list.error)}</p><ButtonBar type="button" onClick={() => void list.refetch()}>Thử lại</ButtonBar></div> : null}
          {list.data?.content.length === 0 && !list.isError ? <p className={styles.notice} role="status">Không có lệnh thu hồi trong phạm vi tài khoản.</p> : null}
          {list.data?.content.map((item) => (
            <article className={styles.detailItem} key={item.id}>
              <h2>{recallLabels[item.status] ?? item.status}</h2>
              <dl className={styles.detailGrid}>
                <div className={styles.detailItem}><dt>Mã lệnh</dt><dd className={styles.codeValue}>{item.id}</dd></div>
                <div className={styles.detailItem}><dt>Hồ sơ kết thúc</dt><dd className={styles.codeValue}>{item.terminationCaseId}</dd></div>
                <div className={styles.detailItem}><dt>Máy</dt><dd className={styles.codeValue}>{item.machineId}</dd></div>
                <div className={styles.detailItem}><dt>Kỹ thuật viên</dt><dd>{item.assignedTechnicianId ?? "Chưa phân công"}</dd></div>
                <div className={styles.detailItem}><dt>Lịch nhận máy</dt><dd>{localDateTime(item.scheduledPickupAt)}</dd></div>
              </dl>
              <ButtonBar type="button" onClick={() => onOpen ? onOpen(item.id) : setSelectedId(item.id)}>Mở chi tiết</ButtonBar>
            </article>
          ))}
          {list.data && list.data.totalPages > 1 ? (
            <nav className={styles.pagination} aria-label="Phân trang lệnh thu hồi">
              <ButtonBar type="button" disabled={page <= 0 || list.isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}>Trước</ButtonBar>
              <span>Trang {list.data.page + 1} / {list.data.totalPages}</span>
              <ButtonBar type="button" disabled={page + 1 >= list.data.totalPages || list.isFetching} onClick={() => setPage((value) => value + 1)}>Sau</ButtonBar>
            </nav>
          ) : null}
        </section>
      </div>
    );
  }

  if (!currentWorkOrder && workOrder.isPending) return <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p>;
  if (workOrder.isError) return <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(workOrder.error)}</p><ButtonBar type="button" onClick={() => void workOrder.refetch()}>Thử lại</ButtonBar></div>;
  if (!currentWorkOrder) return null;

  const relevantEvidenceTypes: RecallEvidenceType[] = role === "owner" ? ["OWNER_HANDOVER"] : role === "technician" ? ["PICKUP", "DEPOT_RECEIPT"] : ["PICKUP", "OWNER_HANDOVER", "DEPOT_RECEIPT"];
  const eligibleEvidence = (type: RecallEvidenceType): RecallEvidence[] => evidence.data?.filter((item) => item.evidenceType === type) ?? [];
  const eventBusy = assign.isPending || startPickup.isPending || pickupAttempt.isPending || acknowledgeOwner.isPending || submitDepotReceipt.isPending || reviewDepotReceipt.isPending || createInspectionTicket.isPending || uploadEvidence.isPending;

  const handleUpload = (event: FormEvent<HTMLFormElement>, type: RecallEvidenceType) => {
    event.preventDefault();
    if (selectedFile && !uploadEvidence.isPending) uploadEvidence.mutate({ type, file: selectedFile });
  };

  return (
    <div className={styles.pageContent}>
      <BackButtonHeading
        title="Chi tiết thu hồi máy"
        titleId="recall-detail-title"
        description="Các chuyển trạng thái và file evidence được xác nhận bởi Dolores."
        className={styles.pageHeading}
        back={{
          label: "Danh sách thu hồi",
          fallbackHref: backHref ?? (role === "owner" ? "/dashboard/contracts/recall" : role === "operator" ? "/admin/contracts" : "/technician/tasks/retrieval"),
        }}
      />
      <PageActions actions={buildRecallLegacyReviewActions({
        role: role === "operator" ? "admin" : role,
        workOrder: currentWorkOrder,
        onReview: () => { setLegacyDecision("PICKUP_REQUIRED"); setLegacyReason(""); setTechnicianId(""); setLegacyCorrelation(globalThis.crypto.randomUUID()); setLegacyOpen(true); },
      }).map((action) => ({ ...action, pending: legacyReview.isPending, pendingLabel: "Đang rà soát" }))} />
      <section className={styles.panel} aria-labelledby="recall-detail-title">
        {refreshButton}
        <dl className={styles.detailGrid}>
          <div className={styles.detailItem}><dt>Trạng thái thu hồi</dt><dd>{recallLabels[currentWorkOrder.status] ?? currentWorkOrder.status}</dd></div>
          <div className={styles.detailItem}><dt>Mã lệnh thu hồi</dt><dd className={styles.codeValue}>{currentWorkOrder.id}</dd></div>
          <div className={styles.detailItem}><dt>Mã hồ sơ kết thúc</dt><dd className={styles.codeValue}>{currentWorkOrder.terminationCaseId}</dd></div>
          <div className={styles.detailItem}><dt>Hợp đồng</dt><dd className={styles.codeValue}>{currentWorkOrder.contractId}</dd></div>
          <div className={styles.detailItem}><dt>Máy</dt><dd className={styles.codeValue}>{currentWorkOrder.machineId}</dd></div>
          <div className={styles.detailItem}><dt>Kỹ thuật viên</dt><dd>{currentWorkOrder.assignedTechnicianId ?? "Chưa phân công"}</dd></div>
          <div className={styles.detailItem}><dt>Ngày nhận đã duyệt</dt><dd>{localDateTime(currentWorkOrder.depotReceivedAt)}</dd></div>
        </dl>

        {legacyOpen ? <NotificationDialog variant="confirm" title="Rà soát lệnh thu hồi" onClose={() => setLegacyOpen(false)} primaryAction={{ label: "Xác nhận", onClick: () => legacyReview.mutate(), disabled: !legacyReason.trim() || (legacyDecision === "VERIFY_ALREADY_AT_DEPOT" && !technicianId), pending: legacyReview.isPending }} secondaryAction={{ label: "Hủy", onClick: () => setLegacyOpen(false), disabled: legacyReview.isPending }}>
          <fieldset><legend>Quyết định</legend><label><input type="radio" name="legacyDecision" checked={legacyDecision === "PICKUP_REQUIRED"} onChange={() => setLegacyDecision("PICKUP_REQUIRED")} /> Cần thu hồi: đưa lệnh về trạng thái chưa phân công.</label><label><input type="radio" name="legacyDecision" checked={legacyDecision === "VERIFY_ALREADY_AT_DEPOT"} onChange={() => setLegacyDecision("VERIFY_ALREADY_AT_DEPOT")} /> Máy đã ở kho: xác minh và phân công kỹ thuật viên để chờ chủ sở hữu xác nhận.</label></fieldset>
          {legacyDecision === "VERIFY_ALREADY_AT_DEPOT" ? <><label>Tìm kỹ thuật viên<input value={technicianSearch} onChange={event => { setTechnicianPage(0); setTechnicianSearch(event.target.value); }} /></label><label>Kỹ thuật viên<select required value={technicianId} onChange={event => setTechnicianId(event.target.value)}><option value="">Chọn kỹ thuật viên</option>{technicians.data?.items.filter(profile => profile.status === "ACTIVE" && profile.emailVerified && profile.roles.some(value => value.toUpperCase() === "TECHNICIAN")).map(profile => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}</select></label>{technicians.isError ? <p role="alert">{getApiErrorMessage(technicians.error)}</p> : null}{technicians.data && technicians.data.totalPages > 1 ? <div><ButtonBar type="button" disabled={technicianPage <= 0} onClick={() => setTechnicianPage(technicianPage - 1)}>Trước</ButtonBar><span>Trang {technicianPage + 1} / {technicians.data.totalPages}</span><ButtonBar type="button" disabled={technicianPage + 1 >= technicians.data.totalPages} onClick={() => setTechnicianPage(technicianPage + 1)}>Sau</ButtonBar></div> : null}</> : null}
          <label>Lý do<textarea required maxLength={2000} value={legacyReason} onChange={event => setLegacyReason(event.target.value)} /></label>{legacyReview.isError ? <p role="alert">{getApiErrorMessage(legacyReview.error)}</p> : null}
        </NotificationDialog> : null}

        {role === "operator" && ["UNASSIGNED", "ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? (
          <form className={styles.assignmentForm} onSubmit={(event) => { event.preventDefault(); if (technicianId) assign.mutate(); }}>
            <h2 className={styles.sectionTitle}>Giao nhận máy</h2>
            <label className={styles.formField}>
              <span>Tìm kỹ thuật viên đã hoạt động</span>
              <input value={technicianSearch} onChange={(event) => { setTechnicianPage(0); setTechnicianSearch(event.target.value); }} placeholder="Tên hoặc email" />
            </label>
            {technicians.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(technicians.error)}</p> : null}
            <label className={styles.formField}>
              <span>Kỹ thuật viên</span>
              <select required value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                <option value="">Chọn kỹ thuật viên đã xác minh</option>
                {technicians.data?.items.filter((profile) => profile.status === "ACTIVE" && profile.emailVerified && profile.roles.some((value) => value.toUpperCase() === "TECHNICIAN")).map((profile) => (
                  <option value={profile.idaasUserId} key={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>
                ))}
              </select>
            </label>
            {technicians.data && technicians.data.totalPages > 1 ? (
              <div className={styles.technicalRequestActions}>
                <ButtonBar type="button" disabled={technicianPage <= 0 || technicians.isFetching} onClick={() => setTechnicianPage((value) => value - 1)}>Trước</ButtonBar>
                <span>Trang {technicians.data.page + 1} / {technicians.data.totalPages}</span>
                <ButtonBar type="button" disabled={technicianPage + 1 >= technicians.data.totalPages || technicians.isFetching} onClick={() => setTechnicianPage((value) => value + 1)}>Sau</ButtonBar>
              </div>
            ) : null}
            <label className={styles.formField}>
              <span>Lịch nhận máy (tùy chọn)</span>
              <input type="datetime-local" value={scheduledPickupAt} onChange={(event) => setScheduledPickupAt(event.target.value)} />
            </label>
            {assign.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(assign.error)}</p> : null}
            <ButtonBar type="submit" disabled={!technicianId || eventBusy}>{assign.isPending ? "Đang phân công…" : "Phân công"}</ButtonBar>
          </form>
        ) : null}

        {role === "technician" && isAssignedTechnician && ["ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? (
          <div className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Nhận máy</h2>
            {startPickup.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(startPickup.error)}</p> : null}
            <ButtonBar type="button" disabled={eventBusy} onClick={() => startPickup.mutate()}>{startPickup.isPending ? "Đang bắt đầu…" : "Bắt đầu nhận máy"}</ButtonBar>
          </div>
        ) : null}

        {uploadType ? (
          <form className={styles.formPanel} onSubmit={(event) => handleUpload(event, uploadType)}>
            <h2 className={styles.sectionTitle}>Tải evidence riêng tư — {uploadType}</h2>
            <p className={styles.formHint}>Tối đa 20 MB, chỉ PDF/JPEG/PNG. Dolores giữ file riêng tư; giao diện chỉ nhận mã evidence và metadata.</p>
            <label className={styles.formField}>
              <span>Tệp evidence</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </label>
            {uploadEvidence.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(uploadEvidence.error)}</p> : null}
            <ButtonBar type="submit" disabled={!selectedFile || eventBusy}>{uploadEvidence.isPending ? "Đang tải file riêng tư…" : "Tải evidence"}</ButtonBar>
          </form>
        ) : null}

        {role === "technician" && isAssignedTechnician && currentWorkOrder.status === "PICKUP_IN_PROGRESS" ? (
          <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); const evidenceId = selectedEvidence.PICKUP ?? eligibleEvidence("PICKUP").at(-1)?.id; if (evidenceId) pickupAttempt.mutate({ successful: true, evidenceId }); }}>
            <h2 className={styles.sectionTitle}>Kết quả lần nhận máy</h2>
            <label className={styles.formField}><span>Evidence đã tải lên</span><select value={selectedEvidence.PICKUP ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, PICKUP: event.target.value }))}><option value="">Chọn evidence PICKUP</option>{eligibleEvidence("PICKUP").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {pickupAttempt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(pickupAttempt.error)}</p> : null}
            <ButtonBar type="submit" disabled={eventBusy || !eligibleEvidence("PICKUP").length}>{pickupAttempt.isPending ? "Đang ghi nhận…" : "Ghi nhận đã nhận máy"}</ButtonBar>
            <ButtonBar type="button" disabled={eventBusy} onClick={() => pickupAttempt.mutate({ successful: false, notes: "Không thể nhận máy tại điểm hẹn." })}>Ghi nhận không nhận được</ButtonBar>
          </form>
        ) : null}

        {role === "owner" && currentWorkOrder.status === "OWNER_ACK_PENDING" ? (
          <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); if (conditionNotes.trim() && selectedEvidence.OWNER_HANDOVER) acknowledgeOwner.mutate(); }}>
            <h2 className={styles.sectionTitle}>Xác nhận bàn giao máy</h2>
            <label className={styles.formField}><span>Tình trạng máy lúc bàn giao</span><textarea required maxLength={2000} value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} /></label>
            <label className={styles.formField}><span>Evidence OWNER_HANDOVER</span><select required value={selectedEvidence.OWNER_HANDOVER ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, OWNER_HANDOVER: event.target.value }))}><option value="">Chọn evidence đã tải lên</option>{eligibleEvidence("OWNER_HANDOVER").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {acknowledgeOwner.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(acknowledgeOwner.error)}</p> : null}
            <ButtonBar type="submit" disabled={!conditionNotes.trim() || !selectedEvidence.OWNER_HANDOVER || eventBusy}>{acknowledgeOwner.isPending ? "Đang xác nhận…" : "Xác nhận đã bàn giao"}</ButtonBar>
          </form>
        ) : null}

        {role === "technician" && isAssignedTechnician && currentWorkOrder.status === "CUSTODY_VERIFICATION_PENDING" ? (
          <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); if (depotLocation.trim() && selectedEvidence.DEPOT_RECEIPT) submitDepotReceipt.mutate(); }}>
            <h2 className={styles.sectionTitle}>Gửi xác nhận nhận tại kho</h2>
            <label className={styles.formField}><span>Địa điểm kho</span><input required maxLength={500} value={depotLocation} onChange={(event) => setDepotLocation(event.target.value)} /></label>
            <label className={styles.formField}><span>Evidence DEPOT_RECEIPT</span><select required value={selectedEvidence.DEPOT_RECEIPT ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, DEPOT_RECEIPT: event.target.value }))}><option value="">Chọn evidence đã tải lên</option>{eligibleEvidence("DEPOT_RECEIPT").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {submitDepotReceipt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(submitDepotReceipt.error)}</p> : null}
            <ButtonBar type="submit" disabled={!depotLocation.trim() || !selectedEvidence.DEPOT_RECEIPT || eventBusy}>{submitDepotReceipt.isPending ? "Đang gửi…" : "Gửi để duyệt"}</ButtonBar>
          </form>
        ) : null}

        {role === "operator" && currentWorkOrder.status === "RECEIPT_REVIEW_PENDING" ? (
          <div className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Duyệt nhận máy tại kho</h2>
            {evidence.data?.filter((item) => item.evidenceType === "DEPOT_RECEIPT").map((item) => <div className={styles.detailItem} key={item.id}><strong>{item.originalFilename}</strong><p>{item.contentType} · {item.sizeBytes} bytes · {item.sha256}</p><ButtonBar type="button" disabled={downloadEvidence.isPending} onClick={() => downloadEvidence.mutate(item.id)}>Tải evidence riêng tư</ButtonBar></div>)}
            {downloadEvidence.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(downloadEvidence.error)}</p> : null}
            <label className={styles.formField}><span>Lý do (bắt buộc khi từ chối)</span><textarea maxLength={2000} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
            {reviewDepotReceipt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(reviewDepotReceipt.error)}</p> : null}
            <div className={styles.technicalRequestActions}>
              <ButtonBar type="button" disabled={eventBusy} onClick={() => reviewDepotReceipt.mutate({ approved: true, reason: decisionReason.trim() || undefined })}>{reviewDepotReceipt.isPending ? "Đang duyệt…" : "Duyệt nhận tại kho"}</ButtonBar>
              <ButtonBar type="button" disabled={eventBusy || !decisionReason.trim()} onClick={() => reviewDepotReceipt.mutate({ approved: false, reason: decisionReason.trim() })}>Từ chối</ButtonBar>
            </div>
          </div>
        ) : null}

        {role === "operator" && terminationCase.data?.status === "INSPECTION_PENDING" && !terminationCase.data.inspectionTicketId ? (
          <div className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Kiểm tra máy tại kho</h2>
            <p className={styles.formHint}>Biên nhận kho đã được duyệt. Tạo ticket kiểm tra bắt buộc cho hồ sơ chấm dứt.</p>
            {createInspectionTicket.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(createInspectionTicket.error)}</p> : null}
            <ButtonBar type="button" disabled={eventBusy} onClick={() => createInspectionTicket.mutate()}>{createInspectionTicket.isPending ? "Đang tạo ticket…" : "Tạo inspection ticket"}</ButtonBar>
          </div>
        ) : null}

        {terminationCase.data ? (
          <section className={styles.formPanel} aria-labelledby="termination-status-title">
            <h2 className={styles.sectionTitle} id="termination-status-title">Hồ sơ chấm dứt hợp đồng</h2>
            <dl className={styles.detailGrid}>
              <div className={styles.detailItem}><dt>Trạng thái</dt><dd>{terminationCase.data.status}</dd></div>
              <div className={styles.detailItem}><dt>Inspection ticket</dt><dd className={styles.codeValue}>{terminationCase.data.inspectionTicketId ?? "Chưa tạo"}</dd></div>
              <div className={styles.detailItem}><dt>Settlement</dt><dd className={styles.codeValue}>{terminationCase.data.settlementId ?? "Chưa có"}</dd></div>
              <div className={styles.detailItem}><dt>Hoàn tất</dt><dd>{localDateTime(terminationCase.data.completedAt)}</dd></div>
            </dl>
            {terminationCase.data.inspectionTicketId ? <p className={styles.notice} role="status">Ticket kiểm tra đã được tạo. Hoàn tất kiểm tra, settlement và kết thúc đang chờ Maintenance Ticket evidence upload/read được xác nhận; Contract chưa được hiển thị là đã chấm dứt.</p> : null}
            {terminationCase.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(terminationCase.error)}</p> : null}
          </section>
        ) : null}

        <section className={styles.formPanel} aria-labelledby="recall-evidence-title">
          <h2 className={styles.sectionTitle} id="recall-evidence-title">Evidence riêng tư</h2>
          {evidence.isPending ? <p className={styles.notice} role="status">Đang tải metadata evidence…</p> : null}
          {evidence.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(evidence.error)}</p> : null}
          {!evidence.isPending && evidence.data?.length === 0 ? <p className={styles.notice} role="status">Chưa có evidence.</p> : null}
          {evidence.data?.filter((item) => relevantEvidenceTypes.includes(item.evidenceType)).map((item) => (
            <article className={styles.detailItem} key={item.id}>
              <strong>{item.evidenceType} · {item.originalFilename}</strong>
              <p>{item.contentType ?? "—"} · {item.sizeBytes} bytes · {localDateTime(item.uploadedAt)}</p>
              <p className={styles.codeValue}>Evidence ID: {item.id}</p>
              {role !== "operator" ? <ButtonBar type="button" disabled={downloadEvidence.isPending} onClick={() => downloadEvidence.mutate(item.id)}>Tải evidence riêng tư</ButtonBar> : null}
            </article>
          ))}
        </section>

        <section className={styles.formPanel} aria-labelledby="recall-events-title">
          <h2 className={styles.sectionTitle} id="recall-events-title">Lịch sử</h2>
          {events.isPending ? <p className={styles.notice} role="status">Đang tải lịch sử…</p> : null}
          {events.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(events.error)}</p> : null}
          <ol className={styles.timeline}>
            {events.data?.content.map((event) => <li className={styles.timelineItem} key={event.id}><strong>{event.eventType}</strong><p>{event.reason ?? "—"}</p><span>{localDateTime(event.occurredAt)} · {event.actorRole ?? "—"} · {event.fromStatus ?? "—"} → {event.toStatus ?? "—"}</span></li>)}
          </ol>
        </section>
      </section>
    </div>
  );
}
