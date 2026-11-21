import headingStyles from "@/components/heading/dashboard-page.module.css";
import { Pagination } from "@/components/pagination/pagination";
import { Panel } from "@/components/panel/panel";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { profilesApi } from "@/apis/profiles.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { ButtonBar } from "@/components/button/button-bar";
import { TextActionButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import viewStyles from "./recall-work-orders-screen.module.css";
import { PageActions } from "@/components/action-bar/page-actions";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import { buildRecallLegacyReviewActions } from "@/components/action-bar/entity-page-actions";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import type { RecallEvidence, RecallEvidenceType } from "@/schema/termination-workflow.schema";
import styles from "../repair-workflow/repair-workflow.module.css";
import { recallEventLabel } from "./recall-event-label";

type Role = "owner" | "technician" | "operator";
type Props = { role: Role; queryScopeRole?: "ADMIN" | "MODERATOR"; contractId?: string; workOrderId?: string; onOpen?: (id: string) => void; backHref?: string; embedded?: boolean };

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

export function RecallWorkOrdersScreen({ role, queryScopeRole, contractId, workOrderId, onOpen, backHref, embedded }: Props) {
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject(role === "operator" ? queryScopeRole ?? role : role.toUpperCase());
  const currentSubjectId = getAuthenticatedSubjectId();
  const [selectedId, setSelectedId] = useState("");
  const [expandedHistoryId, setExpandedHistoryId] = useState("");
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
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ ...(contractId ? { contractId } : {}), page, size: 10 }, signal),
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
    enabled: role === "operator" && Boolean(terminationCaseId),
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
      ...(!id ? [list.refetch()] : []),
      ...(id ? [workOrder.refetch(), events.refetch(), evidence.refetch()] : []),
      ...(role === "operator" && terminationCaseId ? [terminationCase.refetch()] : []),
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
  const refreshButton = <ButtonBar type="button" disabled={list.isFetching || workOrder.isFetching} onClick={() => void refresh()}>Làm mới</ButtonBar>;

  if (!id) {
    const openWorkOrder = onOpen ?? setSelectedId;

    return (
      <div className={embedded ? undefined : styles.pageContent}>
        <div className={role === "technician" ? headingStyles.headingWithActionsEnd : undefined}>
        {!embedded && <BackButtonHeading title="Thu hồi máy" titleId="recall-page-title" className={styles.pageHeading} back={null} />}
        {role === "technician" && <PageActionsRenderer actions={[{ id: "refresh", label: "Làm mới", disabled: list.isFetching, onClick: () => void refresh() }]} />}
        </div>
        <section className={embedded ? undefined : styles.panel} aria-labelledby="recall-list-title">
          <div className={viewStyles.heading}><h2 id="recall-list-title">Danh sách lệnh thu hồi</h2>{role !== "technician" && refreshButton}</div>
          {list.isPending ? <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p> : null}
          {list.isError ? <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(list.error)}</p><ButtonBar type="button" onClick={() => void list.refetch()}>Thử lại</ButtonBar></div> : null}
          {list.data?.content.length === 0 && !list.isError ? <p className={styles.notice} role="status">Không có lệnh thu hồi trong phạm vi tài khoản.</p> : null}
          {list.data && list.data.content.length > 0 ? <DataTable rows={list.data.content} rowKey={item => item.id} columns={[
            {
              key: "machine",
              header: "Lệnh / máy",
              render: item => {
                const machineLabel = item.machineSerialNumber || <TruncatedId value={item.machineId} />;
                return (
                  <div className={viewStyles.identity}>
                    <strong>
                      <TextActionButton onClick={() => openWorkOrder(item.id)}>{machineLabel}</TextActionButton>
                    </strong>
                    <span>Lệnh <TruncatedId value={item.id} /></span>
                  </div>
                );
              },
            },
            { key: "customer", header: "Khách hàng", render: item => item.ownerName || <TruncatedId value={item.ownerId} /> },
            { key: "schedule", header: "Lịch nhận máy", render: item => localDateTime(item.scheduledPickupAt) },
            { key: "status", header: "Trạng thái", render: item => <StatusBadge variant="dot" status={item.status}>{recallLabels[item.status] ?? item.status}</StatusBadge> },
          ]} /> : null}
          {list.data && list.data.totalPages > 1 ? (
            <Pagination page={page} hasNext={!(page + 1 >= list.data.totalPages || list.isFetching)} isFetching={list.isFetching} ariaLabel="Phân trang lệnh thu hồi" onPageChange={setPage} previousLabel="Trước" nextLabel="Sau" showPage={false} hideWhenSinglePage={false}><span>Trang {list.data.page + 1} / {list.data.totalPages}</span></Pagination>
          ) : null}
        </section>
      </div>
    );
  }

  if (!currentWorkOrder && workOrder.isPending) return <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p>;
  if (workOrder.isError) return <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(workOrder.error)}</p><ButtonBar type="button" onClick={() => void workOrder.refetch()}>Thử lại</ButtonBar>{embedded && <ButtonBar type="button" onClick={() => setSelectedId("")}>Danh sách lệnh</ButtonBar>}</div>;
  if (!currentWorkOrder) return null;

  const relevantEvidenceTypes: RecallEvidenceType[] = role === "owner" ? ["OWNER_HANDOVER"] : role === "technician" ? ["PICKUP", "DEPOT_RECEIPT"] : ["PICKUP", "OWNER_HANDOVER", "DEPOT_RECEIPT"];
  const eligibleEvidence = (type: RecallEvidenceType): RecallEvidence[] => evidence.data?.filter((item) => item.evidenceType === type) ?? [];
  const eventBusy = assign.isPending || startPickup.isPending || pickupAttempt.isPending || acknowledgeOwner.isPending || submitDepotReceipt.isPending || reviewDepotReceipt.isPending || createInspectionTicket.isPending || uploadEvidence.isPending;
  const progressIndex = currentWorkOrder.status === "RECEIVED_AT_DEPOT" ? 4 : ["CUSTODY_VERIFICATION_PENDING", "RECEIPT_REVIEW_PENDING"].includes(currentWorkOrder.status) ? 3 : currentWorkOrder.status === "OWNER_ACK_PENDING" ? 2 : currentWorkOrder.status === "PICKUP_IN_PROGRESS" ? 1 : ["CANCELLED", "LEGACY_REVIEW_REQUIRED"].includes(currentWorkOrder.status) ? -1 : 0;
  const RecallActions = embedded ? PageActionsRenderer : PageActions;

  const handleUpload = (event: FormEvent<HTMLFormElement>, type: RecallEvidenceType) => {
    event.preventDefault();
    if (selectedFile && !uploadEvidence.isPending) uploadEvidence.mutate({ type, file: selectedFile });
  };

  return (
    <div className={embedded ? undefined : styles.pageContent}>
      <div className={role === "technician" ? headingStyles.headingWithActionsEnd : undefined}>
      {embedded ? <div className={viewStyles.heading}>
        <h2 id="recall-detail-title">Chi tiết thu hồi máy</h2>
        <ButtonBar type="button" onClick={() => setSelectedId("")}>Danh sách lệnh</ButtonBar>
      </div> : <BackButtonHeading
        title="Chi tiết thu hồi máy"
        titleId="recall-detail-title"
        className={styles.pageHeading}
        back={{
          label: "Danh sách thu hồi",
          fallbackHref: backHref ?? (role === "owner" ? "/dashboard/contracts" : role === "operator" ? "/admin/contracts" : "/technician/tasks/retrieval"),
        }}
      />}
      {role === "technician" && <PageActionsRenderer actions={[{ id: "refresh", label: "Làm mới", disabled: list.isFetching || workOrder.isFetching, onClick: () => void refresh() }]} />}
      </div>
      <RecallActions actions={[...buildRecallLegacyReviewActions({
        role: role === "operator" ? "admin" : role,
        workOrder: currentWorkOrder,
        onReview: () => { setLegacyDecision("PICKUP_REQUIRED"); setLegacyReason(""); setTechnicianId(""); setLegacyCorrelation(globalThis.crypto.randomUUID()); setLegacyOpen(true); },
      }).map((action) => ({ ...action, pending: legacyReview.isPending, pendingLabel: "Đang rà soát" })),
        ...(role === "operator" && ["UNASSIGNED", "ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? [{ id: "recall-assign", label: "Phân công", variant: "primary" as const, priority: 100, type: "submit" as const, form: "recall-assign-form", disabled: !technicianId || eventBusy, disabledReason: "Chọn kỹ thuật viên.", pending: assign.isPending, pendingLabel: "Đang phân công…" }] : []),
        ...(role === "owner" && currentWorkOrder.status === "OWNER_ACK_PENDING" ? [{ id: "recall-owner-ack", label: "Xác nhận bàn giao", variant: "primary" as const, priority: 100, type: "submit" as const, form: "recall-owner-form", disabled: !conditionNotes.trim() || !selectedEvidence.OWNER_HANDOVER || eventBusy, disabledReason: "Nhập tình trạng máy và chọn evidence.", pending: acknowledgeOwner.isPending }] : []),
        ...(role === "technician" && isAssignedTechnician && currentWorkOrder.status === "CUSTODY_VERIFICATION_PENDING" ? [{ id: "recall-depot-receipt", label: "Gửi để duyệt", variant: "primary" as const, priority: 100, type: "submit" as const, form: "recall-depot-form", disabled: !depotLocation.trim() || !selectedEvidence.DEPOT_RECEIPT || eventBusy, disabledReason: "Nhập địa điểm kho và chọn evidence.", pending: submitDepotReceipt.isPending }] : []),
        ...(role === "technician" && isAssignedTechnician && ["ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? [{ id: "recall-start-pickup", label: "Bắt đầu nhận máy", variant: "primary" as const, priority: 50, disabled: eventBusy, pending: startPickup.isPending, pendingLabel: "Đang bắt đầu…", onClick: () => startPickup.mutate() }] : []),
        ...(role === "technician" && isAssignedTechnician && currentWorkOrder.status === "PICKUP_IN_PROGRESS" ? [
          { id: "recall-pickup-failed", label: "Ghi nhận không nhận được", priority: 0, variant: "secondary" as const, disabled: eventBusy, onClick: () => pickupAttempt.mutate({ successful: false, notes: "Không thể nhận máy tại điểm hẹn." }) },
          { id: "recall-pickup-success", label: "Ghi nhận đã nhận máy", priority: 100, variant: "primary" as const, type: "submit" as const, form: "recall-pickup-form", disabled: eventBusy || !eligibleEvidence("PICKUP").length, pending: pickupAttempt.isPending },
        ] : []),
        ...(role === "operator" && currentWorkOrder.status === "RECEIPT_REVIEW_PENDING" ? [
          { id: "recall-depot-reject", label: "Từ chối", priority: 0, variant: "danger" as const, disabled: eventBusy || !decisionReason.trim(), confirm: { title: "Từ chối nhận tại kho?", description: "Xác nhận từ chối với lý do đã nhập.", confirmLabel: "Từ chối" }, onClick: () => reviewDepotReceipt.mutate({ approved: false, reason: decisionReason.trim() }) },
          { id: "recall-depot-approve", label: "Duyệt nhận tại kho", priority: 50, variant: "primary" as const, disabled: eventBusy, pending: reviewDepotReceipt.isPending, onClick: () => reviewDepotReceipt.mutate({ approved: true, reason: decisionReason.trim() || undefined }) },
        ] : []),
        ...(role === "operator" && terminationCase.data?.status === "INSPECTION_PENDING" && !terminationCase.data.inspectionTicketId ? [{ id: "recall-create-inspection", label: "Tạo inspection ticket", variant: "primary" as const, priority: 20, disabled: eventBusy, pending: createInspectionTicket.isPending, pendingLabel: "Đang tạo ticket…", onClick: () => createInspectionTicket.mutate() }] : []),
      ]} />
      <Panel className={`${styles.panel} ${styles.workOrderProgressPanel}`} aria-label="Tiến độ thu hồi">
        <div className={viewStyles.heading}><h2>Tiến độ thu hồi</h2><StatusBadge variant="dot" status={currentWorkOrder.status}>{recallLabels[currentWorkOrder.status]}</StatusBadge></div>
        <ol className={styles.workOrderProgress}>{["Phân công", "Nhận máy", "Xác nhận bàn giao", "Tiếp nhận tại kho"].map((label, index) => <li key={label} className={[styles.workOrderProgressStep, index < progressIndex ? styles.workOrderProgressComplete : index === progressIndex ? styles.workOrderProgressCurrent : ""].join(" ")} aria-current={index === progressIndex ? "step" : undefined}><span aria-hidden="true">{index < progressIndex ? "✓" : index + 1}</span><small>{label}</small></li>)}</ol>
      </Panel>
      <Panel className={styles.panel} aria-labelledby="recall-info-title">
        <div className={viewStyles.heading}><h2 id="recall-info-title">Thông tin thu hồi</h2>{role !== "technician" && refreshButton}</div>
        <dl className={viewStyles.facts}>
          <div><dt>Máy</dt><dd>{currentWorkOrder.machineSerialNumber || <TruncatedId value={currentWorkOrder.machineId} />}</dd></div>
          <div><dt>Khách hàng</dt><dd>{currentWorkOrder.ownerName || <TruncatedId value={currentWorkOrder.ownerId} />}</dd></div>
          <div><dt>Kỹ thuật viên</dt><dd>{currentWorkOrder.assignedTechnicianName || (currentWorkOrder.assignedTechnicianId ? <TruncatedId value={currentWorkOrder.assignedTechnicianId} /> : "—")}</dd></div>
          <div><dt>Lịch nhận máy</dt><dd>{localDateTime(currentWorkOrder.scheduledPickupAt)}</dd></div>
          <div><dt>Đã nhận tại kho</dt><dd>{localDateTime(currentWorkOrder.depotReceivedAt)}</dd></div>
        </dl>
        <details className={viewStyles.disclosure}><summary>Mã liên kết</summary><dl className={viewStyles.facts}>
          <div><dt>Mã lệnh</dt><dd><TruncatedId value={currentWorkOrder.id} /></dd></div>
          <div><dt>Hợp đồng</dt><dd><TruncatedId value={currentWorkOrder.contractId} /></dd></div>
          <div><dt>Hồ sơ kết thúc</dt><dd><TruncatedId value={currentWorkOrder.terminationCaseId} /></dd></div>
        </dl></details>

        {legacyOpen ? <NotificationDialog variant="confirm" title="Rà soát lệnh thu hồi" onClose={() => setLegacyOpen(false)} primaryAction={{ label: "Xác nhận", onClick: () => legacyReview.mutate(), disabled: !legacyReason.trim() || (legacyDecision === "VERIFY_ALREADY_AT_DEPOT" && !technicianId), pending: legacyReview.isPending }} secondaryAction={{ label: "Hủy", onClick: () => setLegacyOpen(false), disabled: legacyReview.isPending }}>
          <fieldset><legend>Quyết định</legend><label><input type="radio" name="legacyDecision" checked={legacyDecision === "PICKUP_REQUIRED"} onChange={() => setLegacyDecision("PICKUP_REQUIRED")} /> Cần thu hồi: đưa lệnh về trạng thái chưa phân công.</label><label><input type="radio" name="legacyDecision" checked={legacyDecision === "VERIFY_ALREADY_AT_DEPOT"} onChange={() => setLegacyDecision("VERIFY_ALREADY_AT_DEPOT")} /> Máy đã ở kho: xác minh và phân công kỹ thuật viên để chờ chủ sở hữu xác nhận.</label></fieldset>
          {legacyDecision === "VERIFY_ALREADY_AT_DEPOT" ? <><label>Tìm kỹ thuật viên<input value={technicianSearch} onChange={event => { setTechnicianPage(0); setTechnicianSearch(event.target.value); }} /></label><label>Kỹ thuật viên<select required value={technicianId} onChange={event => setTechnicianId(event.target.value)}><option value="">Chọn kỹ thuật viên</option>{technicians.data?.items.filter(profile => profile.status === "ACTIVE" && profile.emailVerified && profile.roles.some(value => value.toUpperCase() === "TECHNICIAN")).map(profile => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}</select></label>{technicians.isError ? <p role="alert">{getApiErrorMessage(technicians.error)}</p> : null}{technicians.data && technicians.data.totalPages > 1 ? <Pagination page={technicianPage} hasNext={technicianPage + 1 < technicians.data.totalPages} isFetching={technicians.isFetching} ariaLabel="Phân trang kỹ thuật viên" onPageChange={setTechnicianPage} totalPages={technicians.data.totalPages} /> : null}</> : null}
          <label>Lý do<textarea required maxLength={2000} value={legacyReason} onChange={event => setLegacyReason(event.target.value)} /></label>{legacyReview.isError ? <p role="alert">{getApiErrorMessage(legacyReview.error)}</p> : null}
        </NotificationDialog> : null}

        {role === "operator" && ["UNASSIGNED", "ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? (
          <form id="recall-assign-form" className={styles.assignmentForm} onSubmit={(event) => { event.preventDefault(); if (technicianId) assign.mutate(); }}>
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
              <Pagination page={technicianPage} hasNext={technicianPage + 1 < technicians.data.totalPages} isFetching={technicians.isFetching} ariaLabel="Phân trang kỹ thuật viên" onPageChange={setTechnicianPage} totalPages={technicians.data.totalPages} />
            ) : null}
            <label className={styles.formField}>
              <span>Lịch nhận máy (tùy chọn)</span>
              <input type="datetime-local" value={scheduledPickupAt} onChange={(event) => setScheduledPickupAt(event.target.value)} />
            </label>
            {assign.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(assign.error)}</p> : null}
          </form>
        ) : null}

        {role === "technician" && isAssignedTechnician && ["ASSIGNED", "SCHEDULED"].includes(currentWorkOrder.status) ? (
          <Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Nhận máy</h2>
            {startPickup.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(startPickup.error)}</p> : null}
          </Panel>
        ) : null}

        {uploadType ? (
          <form  onSubmit={(event) => handleUpload(event, uploadType)}><Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Tải evidence riêng tư — {uploadType}</h2>
            <p className={styles.formHint}>Tối đa 20 MB, chỉ PDF/JPEG/PNG. Dolores giữ file riêng tư; giao diện chỉ nhận mã evidence và metadata.</p>
            <label className={styles.formField}>
              <span>Tệp evidence</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
            </label>
            {uploadEvidence.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(uploadEvidence.error)}</p> : null}
            <ButtonBar type="submit" disabled={!selectedFile || eventBusy}>{uploadEvidence.isPending ? "Đang tải file riêng tư…" : "Tải evidence"}</ButtonBar>
          </Panel></form>
        ) : null}

        {role === "technician" && isAssignedTechnician && currentWorkOrder.status === "PICKUP_IN_PROGRESS" ? (
          <form id="recall-pickup-form"  onSubmit={(event) => { event.preventDefault(); const evidenceId = selectedEvidence.PICKUP ?? eligibleEvidence("PICKUP").at(-1)?.id; if (evidenceId) pickupAttempt.mutate({ successful: true, evidenceId }); }}><Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Kết quả lần nhận máy</h2>
            <label className={styles.formField}><span>Evidence đã tải lên</span><select value={selectedEvidence.PICKUP ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, PICKUP: event.target.value }))}><option value="">Chọn evidence PICKUP</option>{eligibleEvidence("PICKUP").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {pickupAttempt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(pickupAttempt.error)}</p> : null}
          </Panel></form>
        ) : null}

        {role === "owner" && currentWorkOrder.status === "OWNER_ACK_PENDING" ? (
          <form id="recall-owner-form"  onSubmit={(event) => { event.preventDefault(); if (conditionNotes.trim() && selectedEvidence.OWNER_HANDOVER) acknowledgeOwner.mutate(); }}><Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Xác nhận bàn giao máy</h2>
            <label className={styles.formField}><span>Tình trạng máy lúc bàn giao</span><textarea required maxLength={2000} value={conditionNotes} onChange={(event) => setConditionNotes(event.target.value)} /></label>
            <label className={styles.formField}><span>Evidence OWNER_HANDOVER</span><select required value={selectedEvidence.OWNER_HANDOVER ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, OWNER_HANDOVER: event.target.value }))}><option value="">Chọn evidence đã tải lên</option>{eligibleEvidence("OWNER_HANDOVER").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {acknowledgeOwner.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(acknowledgeOwner.error)}</p> : null}
          </Panel></form>
        ) : null}

        {role === "technician" && isAssignedTechnician && currentWorkOrder.status === "CUSTODY_VERIFICATION_PENDING" ? (
          <form id="recall-depot-form"  onSubmit={(event) => { event.preventDefault(); if (depotLocation.trim() && selectedEvidence.DEPOT_RECEIPT) submitDepotReceipt.mutate(); }}><Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Gửi xác nhận nhận tại kho</h2>
            <label className={styles.formField}><span>Địa điểm kho</span><input required maxLength={500} value={depotLocation} onChange={(event) => setDepotLocation(event.target.value)} /></label>
            <label className={styles.formField}><span>Evidence DEPOT_RECEIPT</span><select required value={selectedEvidence.DEPOT_RECEIPT ?? ""} onChange={(event) => setSelectedEvidence((current) => ({ ...current, DEPOT_RECEIPT: event.target.value }))}><option value="">Chọn evidence đã tải lên</option>{eligibleEvidence("DEPOT_RECEIPT").map((item) => <option key={item.id} value={item.id}>{item.originalFilename} · {item.id}</option>)}</select></label>
            {submitDepotReceipt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(submitDepotReceipt.error)}</p> : null}
          </Panel></form>
        ) : null}

        {role === "operator" && currentWorkOrder.status === "RECEIPT_REVIEW_PENDING" ? (
          <Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Duyệt nhận máy tại kho</h2>
            {evidence.data?.filter((item) => item.evidenceType === "DEPOT_RECEIPT").map((item) => <div className={styles.detailItem} key={item.id}><strong>{item.originalFilename}</strong><p>{item.contentType} · {item.sizeBytes} bytes · {item.sha256}</p><ButtonBar type="button" disabled={downloadEvidence.isPending} onClick={() => downloadEvidence.mutate(item.id)}>Tải evidence riêng tư</ButtonBar></div>)}
            {downloadEvidence.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(downloadEvidence.error)}</p> : null}
            <label className={styles.formField}><span>Lý do (bắt buộc khi từ chối)</span><textarea maxLength={2000} value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
            {reviewDepotReceipt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(reviewDepotReceipt.error)}</p> : null}
            <div className={styles.technicalRequestActions}>
            </div>
          </Panel>
        ) : null}

        {role === "operator" && terminationCase.data?.status === "INSPECTION_PENDING" && !terminationCase.data.inspectionTicketId ? (
          <Panel className={styles.formPanel}>
            <h2 className={styles.sectionTitle}>Kiểm tra máy tại kho</h2>
            <p className={styles.formHint}>Biên nhận kho đã được duyệt. Tạo ticket kiểm tra bắt buộc cho hồ sơ chấm dứt.</p>
            {createInspectionTicket.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(createInspectionTicket.error)}</p> : null}
          </Panel>
        ) : null}

        {terminationCase.data ? (
          <Panel className={styles.formPanel} aria-labelledby="termination-status-title">
            <h2 className={styles.sectionTitle} id="termination-status-title">Hồ sơ chấm dứt hợp đồng</h2>
            <dl className={styles.detailGrid}>
              <div className={styles.detailItem}><dt>Trạng thái</dt><dd>{terminationCase.data.status}</dd></div>
              <div className={styles.detailItem}><dt>Inspection ticket</dt><dd className={styles.codeValue}>{terminationCase.data.inspectionTicketId ?? "Chưa tạo"}</dd></div>
              <div className={styles.detailItem}><dt>Settlement</dt><dd className={styles.codeValue}>{terminationCase.data.settlementId ?? "Chưa có"}</dd></div>
              <div className={styles.detailItem}><dt>Hoàn tất</dt><dd>{localDateTime(terminationCase.data.completedAt)}</dd></div>
            </dl>
            {terminationCase.data.inspectionTicketId ? <p className={styles.notice} role="status">Ticket kiểm tra đã được tạo. Hoàn tất kiểm tra, settlement và kết thúc đang chờ Maintenance Ticket evidence upload/read được xác nhận; Contract chưa được hiển thị là đã chấm dứt.</p> : null}
            {terminationCase.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(terminationCase.error)}</p> : null}
          </Panel>
        ) : null}

        <Panel className={styles.formPanel} aria-labelledby="recall-evidence-title">
          <h2 className={styles.sectionTitle} id="recall-evidence-title">Chứng từ bàn giao</h2>
          {evidence.isPending ? <p role="status">Đang tải chứng từ…</p> : null}
          {evidence.isError ? <p role="alert">{getApiErrorMessage(evidence.error)}</p> : null}
          {evidence.data && <DataTable rows={evidence.data.filter(item => relevantEvidenceTypes.includes(item.evidenceType))} rowKey={item => item.id} emptyMessage="Chưa có chứng từ." columns={[
            { key: "file", header: "Tệp", render: item => <span>{item.originalFilename}</span> },
            { key: "type", header: "Nội dung", render: item => ({ PICKUP: "Nhận máy", OWNER_HANDOVER: "Khách hàng bàn giao", DEPOT_RECEIPT: "Tiếp nhận tại kho" }[item.evidenceType] || item.evidenceType) },
            { key: "date", header: "Ngày gửi", render: item => localDateTime(item.uploadedAt) },
            { key: "download", header: "Thao tác", align: "right", render: item => <ButtonBar type="button" disabled={downloadEvidence.isPending} onClick={() => downloadEvidence.mutate(item.id)}>{downloadEvidence.isPending && downloadEvidence.variables === item.id ? "Đang tải…" : "Tải xuống"}</ButtonBar> },
          ]} />}
          {downloadEvidence.isError ? <p role="alert">{getApiErrorMessage(downloadEvidence.error)}</p> : null}
        </Panel>

        <details className={viewStyles.disclosure}>
          <summary>Lịch sử xử lý</summary>
          {events.isPending ? <p className={styles.notice} role="status">Đang tải lịch sử…</p> : null}
          {events.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(events.error)}</p> : null}
          <ol className={viewStyles.events}>
            {events.data?.content.slice(0, expandedHistoryId === id ? undefined : 5).map((event) => <li key={event.id}><details className={viewStyles.disclosure}><summary className={viewStyles.event}><strong>{recallEventLabel(event.eventType)}</strong><span>{localDateTime(event.occurredAt)}</span></summary><p>{event.reason || "Không có ghi chú."}</p><p>{event.fromStatus ? `${recallLabels[event.fromStatus] || event.fromStatus} → ` : ""}{event.toStatus ? recallLabels[event.toStatus] || event.toStatus : "—"}</p></details></li>)}
          </ol>
          {(events.data?.content.length ?? 0) > 5 ? <ButtonBar onClick={() => setExpandedHistoryId(expandedHistoryId === id ? "" : id)}>{expandedHistoryId === id ? "Thu gọn" : `Xem thêm ${events.data!.content.length - 5} sự kiện`}</ButtonBar> : null}
        </details>
      </Panel>
    </div>
  );
}
