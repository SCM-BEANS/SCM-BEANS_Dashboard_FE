import { SectionTabList } from "@/components/tabs/section-tab-list";
import { Pagination } from "@/components/pagination/pagination";
import { Panel } from "@/components/panel/panel";
import { MachineSpecificationsView } from "./create-machine-model-form";
import axios from "axios";
import { MachineContractHistory } from "@/components/machines/machine-contract-history";
import { useRouter } from "next/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { machineModelsApi } from "@/apis/machine-models.api";
import { locationsApi } from "@/apis/locations.api";
import { machineCertificatesApi } from "@/apis/machine-certificates.api";
import { MachineCertificatesPanel } from "@/components/machines/machine-certificates-panel";
import type { MachineCertificateStatus } from "@/schema/machine-certificates.schema";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { MachineDetailView } from "@/components/machines/machine-detail-view";
import { MachineProfileGroups } from "@/components/machines/machine-profile-groups";
import { machineStatusLabel } from "@/components/machines/machine-status-labels";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { MachineMaintenanceTicketActions, MaintenanceTicketDetailsPage } from "@/components/features/maintenance-workflow/maintenance-ticket-actions";
import { TransferMachineAction } from "@/components/features/locations/transfer-machine-action";
import type { PageAction } from "@/components/action-bar/page-actions";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import { PATH_ADMIN } from "@/routes/path";
import { LocationIdSchema } from "@/schema/locations.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getMachineDetailBackDestination } from "../admin-back-destination";

function formatDate(value: string | null | undefined, time = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function AdminMachineConnectionSetup({ machineId, subject, serialNumber }: { machineId: string; subject: string; serialNumber?: string | null }) {
  const [status, setStatus] = useState<MachineCertificateStatus | "">("");
  const [pageNumber, setPageNumber] = useState(0);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueBlocked, setIssueBlocked] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [deviceId, setDeviceId] = useState(serialNumber ?? "");
  const [identityBlocked, setIdentityBlocked] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; deviceId: string } | null>(null);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    return () => current.abort();
  }, []);
  const identity = useQuery({
    queryKey: ["machine-device-identity", "ADMIN", subject, machineId],
    queryFn: ({ signal }) => machinesApi.getDeviceIdentity(machineId, signal),
    retry: false,
  });
  const identityAbsent = identity.isError && axios.isAxiosError(identity.error) && identity.error.response?.status === 404;
  const identityResolved = !identity.isFetching && (identity.isSuccess || identityAbsent);
  const identityMismatch = identity.isSuccess && identity.data.deviceId !== serialNumber;
  const canIssue = identityResolved && !identityBlocked && !identityMismatch && Boolean(serialNumber?.trim());
  const refreshIdentity = async () => {
    const result = await identity.refetch();
    const absent = result.isError && axios.isAxiosError(result.error) && result.error.response?.status === 404;
    if (!controller.current?.signal.aborted) setIdentityBlocked(!(result.isSuccess || absent));
    return result;
  };
  const list = useQuery({
    queryKey: ["machine-certificates", "ADMIN", subject, machineId, status, pageNumber],
    queryFn: ({ signal }) => machineCertificatesApi.list(machineId, { page: pageNumber, size: 10, ...(status ? { status } : {}) }, signal),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["machine-certificates", "ADMIN", subject, machineId, "detail", selected],
    queryFn: ({ signal }) => machineCertificatesApi.getById(machineId, selected, signal),
    enabled: Boolean(selected), retry: false,
  });
  const run = async (action: () => Promise<void>, issuance = false) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setActionError(""); setNotice("");
    try { await action(); }
    catch (error) {
      if (controller.current?.signal.aborted) return;
      setActionError(getApiErrorMessage(error, "mutation"));
      if (issuance) { setIssueBlocked(true); await list.refetch(); }
    } finally { pending.current = false; if (!controller.current?.signal.aborted) setBusy(false); }
  };
  return <>
    <SmartIotPanel title="Thiết lập kết nối">
      <div className={styles.machineConnectionLayout}>
        <section aria-labelledby="admin-machine-identity-title">
          <h3 id="admin-machine-identity-title">Định danh thiết bị</h3>
          {identity.isFetching ? <p role="status">Đang kiểm tra định danh thiết bị…</p> : identity.isSuccess ? <>
            <div className={styles.operationsGrid}>
              <div><span>Mã thiết bị đang hoạt động</span><strong>{identity.data.deviceId}</strong></div>
              <div><span>Máy</span><strong>{serialNumber ?? machineId}</strong></div>
            </div>
            <div className={styles.machineInventoryActions}><ButtonBar variant="danger" disabled={busy || identityBlocked} onClick={() => setConfirmRevoke({ id: identity.data.id, deviceId: identity.data.deviceId })}>Thu hồi định danh</ButtonBar></div>
          </> : identityAbsent ? <p>Chưa có định danh đang hoạt động.</p> : <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(identity.error)}</p>}
          {identityAbsent && !identity.isFetching && <form className={styles.machineEditForm} onSubmit={(event) => {
            event.preventDefault();
            if (identityBlocked || !identityResolved) return;
            void run(async () => {
              setIdentityBlocked(true);
              try {
                await machinesApi.provisionDeviceIdentity(machineId, { deviceId });
                if (!controller.current?.signal.aborted) setNotice("Đã đăng ký định danh thiết bị. Đang kiểm tra lại dữ liệu.");
              } finally { if (!controller.current?.signal.aborted) await refreshIdentity(); }
            });
          }}>
            <label>Mã thiết bị<input required maxLength={255} value={deviceId} disabled={busy} onChange={(event) => setDeviceId(event.target.value)} /></label>
            <ButtonBar type="submit" disabled={busy || identityBlocked || !deviceId.trim()}>Đăng ký định danh</ButtonBar>
            <p>Mã đã sử dụng không thể dùng lại sau khi thu hồi. Để cấp chứng chỉ hiện tại, mã thiết bị cần trùng serial máy.</p>
          </form>}
          {identityBlocked && <p className={styles.accountInlineWarning} role="alert">Chưa xác minh được định danh hiện tại. Tải lại trang để kiểm tra trước khi thao tác tiếp.</p>}
          {identityMismatch && <p className={styles.accountInlineWarning} role="alert">Mã thiết bị khác serial máy. Chưa thể phát hành chứng chỉ; cần bộ phận vận hành kiểm tra. Định danh hiện tại được giữ nguyên.</p>}
          {!serialNumber?.trim() && <p className={styles.accountInlineWarning}>Máy chưa có serial để phát hành chứng chỉ.</p>}
        </section>
        <section>
          <h3>Chứng chỉ kết nối</h3>
          <MachineCertificatesPanel
            page={list.data}
            detail={detail.data}
            status={status}
            pageNumber={pageNumber}
            selectedCertificateId={selected}
            loading={list.isFetching}
            detailLoading={Boolean(selected) && detail.isFetching}
            error={list.isError ? getApiErrorMessage(list.error) : undefined}
            detailError={detail.isError ? getApiErrorMessage(detail.error) : undefined}
            actionError={actionError}
            notice={notice}
            busy={busy}
            issueBlocked={issueBlocked || !list.isSuccess || !canIssue}
            embedded
            showRefresh={false}
            onSelect={(id) => { if (id === selected) void detail.refetch(); else setSelected(id); }}
            onStatusChange={(next) => { setStatus(next); setPageNumber(0); setSelected(""); }}
            onPageChange={(next) => { setPageNumber(next); setSelected(""); }}
            onRefresh={() => { void run(async () => { const result = await list.refetch(); await refreshIdentity(); if (result.isSuccess) setIssueBlocked(false); }); }}
            onIssue={() => { if (!issueBlocked && canIssue && list.isSuccess) void run(async () => {
              try {
                const issued = await machineCertificatesApi.issue(machineId);
                if (controller.current?.signal.aborted) return;
                setSelected(issued.id); setNotice("Đã phát hành chứng chỉ."); await list.refetch();
              } finally { if (!controller.current?.signal.aborted) await refreshIdentity(); }
            }, true); }}
            onDelete={(id) => { void run(async () => {
              try {
                await machineCertificatesApi.delete(machineId, id);
                if (!controller.current?.signal.aborted) setNotice("Đã xóa chứng chỉ.");
              } finally {
                if (!controller.current?.signal.aborted) { if (selected === id) setSelected(""); await list.refetch(); }
              }
            }); }}
            onDownload={async (id, format, signal) => (await machineCertificatesApi.download(machineId, id, format, signal)).blob}
          />
        </section>
      </div>
    </SmartIotPanel>
    {confirmRevoke && <NotificationDialog variant="confirm" title="Thu hồi định danh thiết bị?"
      description={<>Thu hồi mã <strong>{confirmRevoke.deviceId}</strong> của máy <strong>{serialNumber ?? machineId}</strong>. Mã này sẽ không thể được sử dụng lại.</>}
      primaryAction={{ label: "Thu hồi định danh", disabled: busy || !identityResolved || !identity.isSuccess || identity.data.id !== confirmRevoke.id, onClick: () => {
        if (!identity.isSuccess || identity.data.id !== confirmRevoke.id || identityBlocked) return;
        setConfirmRevoke(null);
        void run(async () => {
          setIdentityBlocked(true);
          try { await machinesApi.revokeDeviceIdentity(machineId); }
          finally { if (!controller.current?.signal.aborted) await refreshIdentity(); }
        });
      } }}
      secondaryAction={{ label: "Hủy", disabled: busy, onClick: () => setConfirmRevoke(null) }}
      onClose={() => { if (!busy) setConfirmRevoke(null); }} closeOnEscape={!busy} />}
  </>;
}

function MachineDetailContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const machineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validId = router.isReady && MachineIdSchema.safeParse(machineId).success;
  const maintenanceTicketId = router.query.maintenanceTicketId;
  const isMaintenanceTicketDetail = router.isReady && maintenanceTicketId !== undefined;
  const subject = authScopedQuerySubject("ADMIN");
  const authenticated = Boolean(getAuthenticatedSubjectId());
  const detailTab = typeof router.query.tab === "string" && ["profile", "machine-type", "connection", "history"].includes(router.query.tab) ? router.query.tab : "profile";
  const setDetailTab = (tab: string) => { void router.push({ pathname: router.pathname, query: { ...router.query, tab } }, undefined, { shallow: true }); };
  const [ticketPage, setTicketPage] = useState(0);
  useEffect(() => setTicketPage(0), [machineId]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serialDraft, setSerialDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [machineActionError, setMachineActionError] = useState("");

  const machine = useQuery({
    queryKey: ["dolores", "machines", "detail", machineId, subject],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId && authenticated && !isMaintenanceTicketDetail,
  });
  const machineModelId = machine.data?.modelId ?? "";
  const machineModel = useQuery({
    queryKey: ["dolores", "machine-models", "detail", machineModelId],
    queryFn: ({ signal }) => machineModelsApi.getById(machineModelId, signal),
    enabled: validId && detailTab === "machine-type" && Boolean(machineModelId),
    retry: false,
  });
  const locations = useQuery({
    queryKey: ["dolores", "locations", "owner", machine.data?.ownerId, "active"],
    queryFn: ({ signal }) => locationsApi.list({ ownerId: machine.data!.ownerId!, activeOnly: true }, signal),
    enabled: editing && Boolean(machine.data?.ownerId),
    retry: false,
  });
  const schedule = useQuery({
    queryKey: ["dolores", "machines", "maintenance-schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId, signal),
    enabled: validId && Boolean(machine.data),
  });
  const maintenanceTickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets", { machineId, page: ticketPage }],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTicketsPage({ machineId, page: ticketPage, size: 10 }, signal),
    enabled: validId && Boolean(machine.data),
  });
  useEffect(() => {
    if (!machine.data) return;
    setSerialDraft(machine.data.serialNumber ?? "");
    setRegionDraft(machine.data.region ?? "");
    setLocationDraft("");
  }, [machine.data]);
  const updateMachine = useMutation({
    mutationFn: (input: Parameters<typeof machinesApi.update>[1]) => machinesApi.update(machineId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dolores", "machines", "detail", machineId, subject], updated);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] });
      await queryClient.invalidateQueries({ queryKey: ["dolores", "locations"] });
      setEditing(false);
      setMachineActionError("");
    },
    onError: (error: unknown) => setMachineActionError(getApiErrorMessage(error, "mutation")),
  });
  const deleteMachine = useMutation({
    mutationFn: () => machinesApi.delete(machineId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] });
      setConfirmDelete(false);
      await router.push(PATH_ADMIN.MACHINES);
    },
    onError: (error: unknown) => setMachineActionError(getApiErrorMessage(error, "mutation")),
  });
  const beginEditing = () => {
    setDetailTab("profile");
    setLocationDraft(machine.data?.locationId ?? "");
    setEditing(true);
    setMachineActionError("");
  };
  const actionBar = () => {
    const device = machine.data;
    const changed = Boolean(device && (serialDraft !== (device.serialNumber ?? "") || regionDraft !== (device.region ?? "") || locationDraft !== (device.locationId ?? "")));
    const actions: PageAction[] = [];
    if (device && !editing) {
      actions.push({ id: "machine-delete", label: "Xóa máy", variant: "danger", priority: 0, pending: deleteMachine.isPending, pendingLabel: "Đang xóa máy", onClick: () => { setMachineActionError(""); setConfirmDelete(true); } });
      actions.push({ id: "machine-edit", label: T.MACHINES.EDIT, variant: "primary", priority: 10, onClick: beginEditing });
    }
    if (device && editing) {
      actions.push({
        id: "machine-cancel-edit",
        label: T.MACHINES.CANCEL_EDIT,
        variant: "secondary",
        priority: 100,
        onClick: () => { setSerialDraft(device.serialNumber ?? ""); setRegionDraft(device.region ?? ""); setLocationDraft(device.locationId ?? ""); setMachineActionError(""); setEditing(false); },
        confirm: changed ? { title: "Hủy chỉnh sửa?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy chỉnh sửa" } : undefined,
      });
      actions.push({
        id: "machine-save-edit",
        label: T.MACHINES.SAVE_CHANGES,
        variant: "primary",
        priority: 100,
        type: "submit",
        form: "machine-edit-form",
        disabled: updateMachine.isPending || !serialDraft.trim() || !device.status,
        disabledReason: !device.status ? "Máy chưa có trạng thái hiện tại để lưu an toàn." : !serialDraft.trim() ? "Nhập số sê-ri trước khi lưu." : undefined,
        pending: updateMachine.isPending,
        pendingLabel: "Đang lưu",
      });
    }
    return <div className={styles.machineInventoryActions}>
      {device?.ownerId && !editing && <TransferMachineAction machine={device} role="admin" />}
      <PageActionsRenderer actions={actions} />
    </div>;
  };
  const renderHeading = () => (
    <BackButtonHeading
      title={T.MACHINES.DETAIL}
      titleId="admin-machine-detail-title"
      className={styles.pageHeading}
      back={getMachineDetailBackDestination(router.query)}
    />
  );

  const submitMachineEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const current = machine.data;
    if (!current?.status) {
      setMachineActionError("Không thể cập nhật máy vì API không trả về trạng thái hiện tại.");
      return;
    }
    updateMachine.mutate({
      serialNumber: serialDraft.trim(),
      status: current.status,
      ...(current.ownerId ? { ownerId: current.ownerId } : {}),
      ...(current.deployedAt ? { deployedAt: current.deployedAt } : {}),
      ...(current.nextPreventiveMaintenanceAt ? { nextPreventiveMaintenanceAt: current.nextPreventiveMaintenanceAt } : {}),
      ...(current.cupsServedSinceLastDescale != null ? { cupsServedSinceLastDescale: current.cupsServedSinceLastDescale } : {}),
      region: regionDraft.trim(),
      ...(locationDraft && LocationIdSchema.safeParse(locationDraft).success ? { locationId: locationDraft } : {}),
    });
  };

  if (!router.isReady) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<Panel className={styles.panel} role="status">{T.COMMON.LOADING}</Panel></div></AdminShell>;
  if (!validId) return <AdminShell><div className={styles.pageContent}>
    {renderHeading()}
    <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{T.MACHINES.INVALID_ID}</p></div>
  </div></AdminShell>;
  if (isMaintenanceTicketDetail) return <AdminShell><div className={styles.pageContent}>
    <MaintenanceTicketDetailsPage
      ticketId={typeof maintenanceTicketId === "string" ? maintenanceTicketId : ""}
      role="ADMIN"
      backHref={`${PATH_ADMIN.MACHINE_DETAIL(machineId)}?tab=history`}
      backLabel="Về lịch sử máy"
      headingClassName={styles.pageHeading}
    />
  </div></AdminShell>;
  if (machine.isPending) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<Panel className={styles.panel} role="status">{T.COMMON.LOADING}</Panel></div></AdminShell>;
  if (machine.isError) return <AdminShell><div className={styles.pageContent}>
    {renderHeading()}
            <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar type="button" onClick={() => void machine.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>
  </div></AdminShell>;
  if (!machine.data) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<p className={styles.emptyText}>{T.MACHINES.NOT_FOUND}</p></div></AdminShell>;

  const device = machine.data;
  const machineTypeLabel = device.machineType === "SMART_IOT" ? T.MACHINES.SMART : device.machineType === "CONVENTIONAL" ? T.MACHINES.CONVENTIONAL : T.MACHINES.UNCLASSIFIED;
  return <AdminShell>
    <div className={styles.pageContent}>
      <div className={styles.machineDetailHeading}><BackButtonHeading
        title={`${T.MACHINES.DETAIL} · ${device.serialNumber ?? device.id.slice(0, 8).toUpperCase()}`}
        titleId="admin-machine-detail-title"
        className={styles.pageHeading}
        back={getMachineDetailBackDestination(router.query)}
      />
      </div>
      <MachineDetailView className={styles.machineWorkspace} summary={[]}>

      <div className={styles.machineInventoryGroup}>
        <SectionTabList role="tablist" aria-label="Chi tiết máy">
          <ButtonBar
            id="machine-profile-tab"
            className={`${styles.machineViewTab} ${detailTab === "profile" ? styles.machineViewTabActive : ""}`}
            type="button"
            role="tab"
            aria-selected={detailTab === "profile"}
            aria-controls="machine-profile-panel"
            onClick={() => setDetailTab("profile")}
          >
            {T.MACHINES.DETAIL}
          </ButtonBar>
          <ButtonBar
            id="machine-type-tab"
            className={`${styles.machineViewTab} ${detailTab === "machine-type" ? styles.machineViewTabActive : ""}`}
            type="button"
            role="tab"
            aria-selected={detailTab === "machine-type"}
            aria-controls="machine-type-panel"
            disabled={editing}
            onClick={() => setDetailTab("machine-type")}
          >
            {T.MACHINES.MACHINE_TYPE}
          </ButtonBar>
          <ButtonBar id="machine-connection-tab" type="button" role="tab" aria-selected={detailTab === "connection"}
            aria-controls="machine-connection-panel" disabled={editing}
            className={`${styles.machineViewTab} ${detailTab === "connection" ? styles.machineViewTabActive : ""}`}
            onClick={() => setDetailTab("connection")}>Thiết lập kết nối</ButtonBar>
        <ButtonBar type="button" className={`${styles.machineViewTab} ${detailTab === "history" ? styles.machineViewTabActive : ""}`} id="machine-history-tab" aria-controls="machine-history-panel" role="tab" aria-selected={detailTab === "history"} disabled={editing} onClick={() => setDetailTab("history")}>Hợp đồng & bảo trì</ButtonBar>
        </SectionTabList>

        {detailTab === "connection" ? <div id="machine-connection-panel" role="tabpanel" aria-labelledby="machine-connection-tab">
          <AdminMachineConnectionSetup key={`${subject}:${machineId}`} machineId={machineId} subject={subject} serialNumber={device.serialNumber} />
        </div> : detailTab === "profile" ? (
          <Panel id="machine-profile-panel" className={styles.panel} role="tabpanel" aria-labelledby="machine-profile-tab">
            <div className={styles.machineInventoryHeading}>
              <h2>{T.MACHINES.DETAIL}</h2>
              {actionBar()}
            </div>
            <MachineProfileGroups
              identity={[
                { label: T.MACHINES.SERIAL, value: device.serialNumber || "—" },
                { label: T.MACHINES.MODEL_NAME, value: typeof device.modelName === "string" && device.modelName ? device.modelName : T.MACHINES.MODEL_UNASSIGNED },
                { label: T.MACHINES.MACHINE_TYPE, value: machineTypeLabel },
                { label: T.MACHINES.REGION, value: device.region ?? "—" },
                { label: T.MACHINES.STATUS, value: machineStatusLabel(device.status) },
                { label: T.MACHINES.ACTIVE_MENU, value: device.activeMenuId === undefined ? "Chưa có thông tin menu" : device.activeMenuId === null ? "Menu mặc định" : device.activeMenuName || "Menu riêng" },
              ]}
              allocation={[
                { label: T.MACHINES.LOCATION_ID, value: device.locationId ? <TruncatedId value={device.locationId} /> : "—" },
                { label: T.MACHINES.DEPLOYED_AT, value: formatDate(device.deployedAt, true) },
                { label: T.MACHINES.CONTRACT_PERIOD, value: device.contractStartDate || device.contractEndDate ? `${formatDate(device.contractStartDate)} – ${formatDate(device.contractEndDate)}` : "—" },
                { label: T.MACHINES.MONTHLY_RENTAL_FEE, value: device.monthlyRentalFee == null ? "—" : `${formatNumber(device.monthlyRentalFee)} ₫/tháng` },
                { label: T.MACHINES.NEXT_MAINTENANCE, value: formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? device.nextPreventiveMaintenanceAt) },
                { label: T.MACHINES.CUPS, value: (schedule.data?.cupsServedSinceLastDescale ?? device.cupsServedSinceLastDescale)?.toLocaleString("vi-VN") ?? "—" },
              ]}
            />
            <details className={styles.machineSystemDetails}><summary>Thông tin hệ thống</summary><div className={styles.operationsGrid}>
              <div><span>Mã máy</span><strong><TruncatedId value={device.id} /></strong></div>
              <div><span>Mã chủ sở hữu</span><strong>{device.ownerId ? <TruncatedId value={device.ownerId} /> : "—"}</strong></div>
              <div><span>Mã khách thuê</span><strong>{device.tenantId ? <TruncatedId value={device.tenantId} /> : "—"}</strong></div>
              <div><span>Mã cửa hàng</span><strong>{device.locationId ? <TruncatedId value={device.locationId} /> : "—"}</strong></div>
              <div><span>Loại chủ sở hữu</span><strong>{device.ownerType === "COMPANY" ? T.MACHINES.OWNER_COMPANY : device.ownerType === "INDIVIDUAL" ? T.MACHINES.OWNER_INDIVIDUAL : T.MACHINES.OWNER_TYPE_UNKNOWN}</strong></div>
            </div></details>
            {editing && <form id="machine-edit-form" className={styles.machineEditForm} onSubmit={submitMachineEdit}>
              <h3>{T.MACHINES.ALLOCATION_TITLE}</h3>
              <label>{T.MACHINES.SERIAL} *<input required maxLength={160} value={serialDraft} onChange={(event) => setSerialDraft(event.target.value)} /></label>
              <label>{T.MACHINES.REGION}<input maxLength={160} value={regionDraft} onChange={(event) => setRegionDraft(event.target.value)} /></label>
              <label>{T.MACHINES.LOCATION_ID}
                <select value={locationDraft} disabled={!device.ownerId || locations.isPending || locations.isError} onChange={(event) => setLocationDraft(event.target.value)}>
                  <option value="">{T.MACHINES.SELECT_LOCATION}</option>
                  {device.locationId && !locations.data?.some((location) => location.id === device.locationId) && <option value={device.locationId}>{device.locationId}</option>}
                  {locations.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                </select>
              </label>
              {!device.ownerId && <p className={styles.panelSubtitle}>{T.MACHINES.OWNER_REQUIRED}</p>}
              {locations.isPending && device.ownerId && <p className={styles.panelSubtitle} role="status">{T.COMMON.LOADING}</p>}
              {locations.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(locations.error)}</p><ButtonBar type="button" onClick={() => void locations.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
            </form>}
            {machineActionError && <p className={styles.accountInlineWarning} role="alert">{machineActionError}</p>}
          </Panel>
        ) : detailTab === "machine-type" ? (
          <Panel id="machine-type-panel" className={styles.panel} role="tabpanel" aria-labelledby="machine-type-tab">
            <h2>{T.MACHINES.MACHINE_TYPE}</h2>
            <div className={styles.machineProfileGroups}>
              <section className={styles.machineProfileGroup}>
                <h3>Lịch sử phân loại và gán mẫu</h3>
                <div className={styles.machineProfileFields}>
                  <div><span>{T.MACHINES.TYPE_MAPPED_AT}</span><strong>{formatDate(device.machineTypeMappedAt, true)}</strong></div>
                  <div><span>{T.MACHINES.TYPE_MAPPED_BY}</span><strong>{device.machineTypeMappedBy ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.TYPE_MAPPING_REASON}</span><strong>{device.machineTypeMappingReason ?? "—"}</strong></div>
                  <div><span>{T.MACHINE_MODELS.ID}</span><strong>{device.modelId ?? T.MACHINES.MODEL_UNASSIGNED}</strong></div>
                  <div><span>{T.MACHINES.MODEL_MAPPED_AT}</span><strong>{formatDate(device.modelMappedAt, true)}</strong></div>
                  <div><span>{T.MACHINES.MODEL_MAPPED_BY}</span><strong>{device.modelMappedBy ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.MODEL_MAPPING_REASON}</span><strong>{device.modelMappingReason ?? "—"}</strong></div>
                </div>
              </section>
              <section className={styles.machineProfileGroup}>
                <h3>{T.MACHINE_MODELS.DETAIL}</h3>
            {device.modelId ? <>
              {machineModel.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {machineModel.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machineModel.error)}</p><ButtonBar type="button" onClick={() => void machineModel.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
              {machineModel.data && <>
                <div className={styles.machineProfileFields}>
                  <div><span>{T.MACHINE_MODELS.DISPLAY_NAME}</span><strong>{machineModel.data.displayName}</strong></div>
                  <div><span>{T.MACHINE_MODELS.ACTIVE}</span><strong>{machineModel.data.active ? T.MACHINE_MODELS.ACTIVE : T.MACHINE_MODELS.INACTIVE}</strong></div>
                  <div><span>{T.MACHINE_MODELS.CREATED_AT}</span><strong>{formatDate(machineModel.data.createdAt, true)}</strong></div>
                  <div><span>{T.MACHINE_MODELS.UPDATED_AT}</span><strong>{formatDate(machineModel.data.updatedAt, true)}</strong></div>
                </div>
                <div className={styles.machineModelSpecifications}>
                  <span>{T.MACHINE_MODELS.SPECIFICATIONS}</span>
                  {Object.keys(machineModel.data.specifications).length > 0
                    ? <MachineSpecificationsView value={machineModel.data.specifications} />
                    : <p>{T.MACHINE_MODELS.SPECIFICATIONS_EMPTY}</p>}
                </div>
              </>}
            </> : <p className={styles.emptyText}>{T.MACHINES.MODEL_UNLINKED}</p>}
              </section>
            </div>
          </Panel>
        ) : null}
      </div>

      {detailTab === "history" && <div id="machine-history-panel" role="tabpanel" aria-labelledby="machine-history-tab">
      {schedule.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(schedule.error)}</p><ButtonBar type="button" onClick={() => void schedule.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      <Panel className={styles.panel}>
        <div className={styles.machineInventoryHeading}>
          <h2>{T.MACHINES.TICKET_HISTORY}</h2>
        </div>
        {maintenanceTickets.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
        {maintenanceTickets.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(maintenanceTickets.error)}</p><ButtonBar type="button" onClick={() => void maintenanceTickets.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
        {maintenanceTickets.data && maintenanceTickets.data.items.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
        {machine.data && <MachineMaintenanceTicketActions
          machineId={machineId}
          tickets={maintenanceTickets.data?.items ?? []}
          role="ADMIN"
          ticketHref={(ticketId) => `${PATH_ADMIN.MACHINE_DETAIL(machineId)}?tab=history&maintenanceTicketId=${encodeURIComponent(ticketId)}`}
          presentation="table"
          previewLimit={10}
          onRefresh={() => maintenanceTickets.refetch()}
        />}
        {maintenanceTickets.data && <Pagination page={ticketPage} hasNext={!(!maintenanceTickets.data.hasNext || maintenanceTickets.isFetching)} isFetching={maintenanceTickets.isFetching} ariaLabel="Phân trang bảo trì" onPageChange={setTicketPage} previousLabel="Trước" nextLabel="Sau" showPage={false} hideWhenSinglePage={false}><span>Trang {ticketPage + 1} · tối đa 10 phiếu</span></Pagination>}
      </Panel>

      {machineId && <MachineContractHistory machineId={machineId} role="ADMIN" />}
      </div>}
        </MachineDetailView>
    </div>
    {confirmDelete && <NotificationDialog
      variant="confirm"
      title="Xóa máy khỏi hệ thống?"
      description="Chỉ máy chưa có lịch sử hợp đồng mới có thể xóa. Thao tác này xóa bản ghi máy khỏi hệ thống."
      primaryAction={{ label: "Xóa máy", holdToConfirm: true, pending: deleteMachine.isPending, pendingLabel: "Đang xóa…", onClick: () => deleteMachine.mutate() }}
      secondaryAction={{ label: "Hủy", disabled: deleteMachine.isPending, onClick: () => setConfirmDelete(false) }}
      onClose={() => { if (!deleteMachine.isPending) setConfirmDelete(false); }}
      closeOnEscape={!deleteMachine.isPending}
    >
      {machineActionError && <p className={styles.accountInlineWarning} role="alert">{machineActionError}</p>}
    </NotificationDialog>}
  </AdminShell>;
}

export function MachineDetailScreen() {
  return <MachineDetailContent />;
}
