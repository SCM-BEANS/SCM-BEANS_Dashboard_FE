import Link from "next/link";
import { useRouter } from "next/router";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { machineModelsApi } from "@/apis/machine-models.api";
import { locationsApi } from "@/apis/locations.api";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { TELEMETRY_POINTS_PAGE_SIZE, telemetryApi } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineDetailView } from "@/components/machines/machine-detail-view";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { createTelemetryRange, TelemetryHistoryPanel, type TelemetryRange } from "@/components/machines/telemetry-history-panel";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { DataTable } from "@/components/table/data-table";
import { PATH_ADMIN } from "@/routes/path";
import { LocationIdSchema } from "@/schema/locations.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getMachineDetailBackDestination } from "../admin-back-destination";

const STATUS_LABELS: Record<string, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

function formatDate(value: string | null | undefined, time = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function MachineDetailContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPageVisible = usePageVisibility();
  const machineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validId = router.isReady && MachineIdSchema.safeParse(machineId).success;
  const [range, setRange] = useState<TelemetryRange | null>(null);
  const [detailTab, setDetailTab] = useState<"profile" | "machine-type">("profile");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serialDraft, setSerialDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState("");
  const [locationDraft, setLocationDraft] = useState("");
  const [machineActionError, setMachineActionError] = useState("");

  const machine = useQuery({
    queryKey: ["dolores", "machines", "detail", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId,
  });
  const machineModelId = machine.data?.modelId ?? "";
  const machineModel = useQuery({
    queryKey: ["dolores", "machine-models", "detail", machineModelId],
    queryFn: ({ signal }) => machineModelsApi.getById(machineModelId, signal),
    enabled: validId && detailTab === "machine-type" && Boolean(machineModelId),
    retry: false,
  });
  const machineLocationId = machine.data?.locationId ?? "";
  const machineLocation = useQuery({
    queryKey: ["dolores", "locations", "detail", machineLocationId],
    queryFn: ({ signal }) => locationsApi.getById(machineLocationId, signal),
    enabled: Boolean(machineLocationId) && LocationIdSchema.safeParse(machineLocationId).success,
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
    queryKey: ["dolores", "maintenance-tickets", { machineId }],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ machineId, page: 0, size: 100 }, signal),
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
      queryClient.setQueryData(["dolores", "machines", "detail", machineId], updated);
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
  const isSmartIot = machine.data?.machineType === "SMART_IOT";
  useEffect(() => {
    if (isSmartIot && range === null) setRange(createTelemetryRange("24h"));
  }, [isSmartIot, range]);
  const beginEditing = () => {
    setDetailTab("profile");
    setLocationDraft(machine.data?.locationId ?? "");
    setEditing(true);
    setMachineActionError("");
  };
  const heartbeat = useQuery({
    queryKey: ["dolores", "admin", "telemetry", "heartbeat", machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled: validId && isSmartIot && isPageVisible,
    retry: false,
    refetchInterval: isPageVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const points = useInfiniteQuery({
    queryKey: ["dolores", "telemetry", "points", machineId, range?.from, range?.to],
    queryFn: ({ signal, pageParam }) => {
      if (!range) throw new Error("A telemetry time range is required.");
      return telemetryApi.listMachinePoints(machineId, range, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * TELEMETRY_POINTS_PAGE_SIZE;
      return lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && nextOffset <= 100_000 ? nextOffset : undefined;
    },
    enabled: validId && isSmartIot && range !== null,
    retry: false,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flatMap((page) => page) ?? [], [points.data]);
  const refresh = () => {
    void Promise.all([
      machine.refetch(),
      schedule.refetch(),
      maintenanceTickets.refetch(),
      machineModelId && detailTab === "machine-type" ? machineModel.refetch() : Promise.resolve(),
      isSmartIot ? heartbeat.refetch() : Promise.resolve(),
    ]);
  };
  const actionBar = (showRefresh: boolean) => (
    <ActionBar>
      {validId && <ButtonBar href={PATH_ADMIN.IOT}>{T.MACHINES.VIEW_IOT}</ButtonBar>}
      {showRefresh && machine.data && (!editing ? <>
        <ButtonBar type="button" onClick={beginEditing}>{T.MACHINES.EDIT}</ButtonBar>
        <ButtonBar type="button" onClick={() => { setMachineActionError(""); setConfirmDelete(true); }}>Xóa máy</ButtonBar>
      </> : null)}
      {showRefresh && <ButtonBar type="button" disabled={machine.isFetching || schedule.isFetching || heartbeat.isFetching || maintenanceTickets.isFetching || machineModel.isFetching} onClick={refresh}>{T.COMMON.RETRY}</ButtonBar>}
    </ActionBar>
  );
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

  if (!router.isReady) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<section className={styles.panel} role="status">{T.COMMON.LOADING}</section></div>{actionBar(false)}</AdminShell>;
  if (!validId) return <AdminShell><div className={styles.pageContent}>
    {renderHeading()}
    <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{T.MACHINES.INVALID_ID}</p></div>
  </div>{actionBar(false)}</AdminShell>;
  if (machine.isPending) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<section className={styles.panel} role="status">{T.COMMON.LOADING}</section></div>{actionBar(true)}</AdminShell>;
  if (machine.isError) return <AdminShell><div className={styles.pageContent}>
    {renderHeading()}
    <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machine.error)}</p></div>
  </div>{actionBar(true)}</AdminShell>;
  if (!machine.data) return <AdminShell><div className={styles.pageContent}>{renderHeading()}<p className={styles.emptyText}>{T.MACHINES.NOT_FOUND}</p></div>{actionBar(false)}</AdminShell>;

  const device = machine.data;
  const machineTypeLabel = device.machineType === "SMART_IOT" ? T.MACHINES.SMART : device.machineType === "CONVENTIONAL" ? T.MACHINES.CONVENTIONAL : T.MACHINES.UNCLASSIFIED;

  return <AdminShell>
    <div className={styles.pageContent}>
      <BackButtonHeading
        title={`${T.MACHINES.DETAIL} · ${device.serialNumber ?? device.id.slice(0, 8).toUpperCase()}`}
        titleId="admin-machine-detail-title"
        description={device.id}
        className={styles.pageHeading}
        back={getMachineDetailBackDestination(router.query)}
      />
      <MachineDetailView summary={[
        { label: T.MACHINES.STATUS, value: device.status ? STATUS_LABELS[device.status] ?? device.status : "—" },
        { label: T.MACHINES.MACHINE_TYPE, value: machineTypeLabel },
        { label: T.MACHINES.CUPS, value: formatNumber(schedule.data?.cupsServedSinceLastDescale ?? device.cupsServedSinceLastDescale) },
        { label: T.MACHINES.NEXT_MAINTENANCE, value: formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? device.nextPreventiveMaintenanceAt) },
      ]}>

      <div className={styles.machineInventoryGroup}>
        <div className={styles.machineViewTabs} role="tablist" aria-label="Chi tiết máy">
          <button
            id="machine-profile-tab"
            className={`${styles.machineViewTab} ${detailTab === "profile" ? styles.machineViewTabActive : ""}`}
            type="button"
            role="tab"
            aria-selected={detailTab === "profile"}
            aria-controls="machine-profile-panel"
            onClick={() => setDetailTab("profile")}
          >
            {T.MACHINES.DETAIL}
          </button>
          <button
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
          </button>
        </div>
        {detailTab === "profile" ? (
          <section id="machine-profile-panel" className={styles.panel} role="tabpanel" aria-labelledby="machine-profile-tab">
            <div className={styles.machineInventoryHeading}>
              <h2>{T.MACHINES.DETAIL}</h2>
              <Link className={styles.accountSecondaryButton} href={PATH_ADMIN.MACHINE_OPERATIONAL_OVERVIEW(machineId)}>
                Xem dữ liệu vận hành
              </Link>
              {!editing && <button className={styles.accountSecondaryButton} type="button" onClick={beginEditing}>{T.MACHINES.EDIT}</button>}
            </div>
            <div className={styles.machineProfileGroups}>
              <section className={styles.machineProfileGroup}>
                <h3>Nhận diện máy</h3>
                <div className={styles.machineProfileFields}>
                  <div><span>{T.MACHINES.MACHINE_ID}</span><strong>{device.id}</strong></div>
                  <div><span>{T.MACHINES.SERIAL}</span><strong>{device.serialNumber ?? "—"}</strong></div>
                </div>
              </section>
              <section className={styles.machineProfileGroup}>
                <h3>Phân bổ và hợp đồng</h3>
                <div className={styles.machineProfileFields}>
                  <div><span>{T.MACHINES.OWNER_ID}</span><strong>{device.ownerId ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.TENANT_ID}</span><strong>{device.tenantId ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.OWNER_TYPE}</span><strong>{device.ownerType ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.REGION}</span><strong>{device.region ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.LOCATION}</span><strong>{machineLocation.data?.ownerId && device.ownerId && machineLocation.data.ownerId !== device.ownerId ? device.locationId ?? "—" : machineLocation.data?.name ?? device.locationId ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.LOCATION_ID}</span><strong>{device.locationId ?? "—"}</strong></div>
                  <div><span>{T.MACHINES.DEPLOYED_AT}</span><strong>{formatDate(device.deployedAt, true)}</strong></div>
                  <div><span>{T.MACHINES.CONTRACT_PERIOD}</span><strong>{device.contractStartDate || device.contractEndDate ? formatDate(device.contractStartDate) + " – " + formatDate(device.contractEndDate) : "—"}</strong></div>
                  <div><span>{T.MACHINES.MONTHLY_RENTAL_FEE}</span><strong>{device.monthlyRentalFee == null ? "—" : formatNumber(device.monthlyRentalFee) + " ₫/tháng"}</strong></div>
                </div>
              </section>
            </div>
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
              {locations.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(locations.error)}</p><button type="button" onClick={() => void locations.refetch()}>{T.COMMON.RETRY}</button></div>}
              <div className={styles.operationsButtons}>
                <button className={styles.accountPrimaryButton} type="submit" disabled={updateMachine.isPending}>{updateMachine.isPending ? T.MACHINES.SAVING : T.MACHINES.SAVE_CHANGES}</button>
                <button className={styles.accountSecondaryButton} type="button" disabled={updateMachine.isPending} onClick={() => { setEditing(false); setMachineActionError(""); }}>{T.MACHINES.CANCEL_EDIT}</button>
              </div>
            </form>}
            {machineActionError && <p className={styles.accountInlineWarning} role="alert">{machineActionError}</p>}
          </section>
        ) : (
          <section id="machine-type-panel" className={styles.panel} role="tabpanel" aria-labelledby="machine-type-tab">
            <h2>{T.MACHINES.MACHINE_TYPE}</h2>
            <div className={styles.operationsGrid}>
              <div><span>{T.MACHINES.MACHINE_TYPE}</span><strong>{machineTypeLabel}</strong></div>
              <div><span>{T.MACHINES.TYPE_MAPPED_AT}</span><strong>{formatDate(device.machineTypeMappedAt, true)}</strong></div>
              <div><span>{T.MACHINES.TYPE_MAPPED_BY}</span><strong>{device.machineTypeMappedBy ?? "—"}</strong></div>
              <div><span>{T.MACHINES.TYPE_MAPPING_REASON}</span><strong>{device.machineTypeMappingReason ?? "—"}</strong></div>
              <div><span>{T.MACHINE_MODELS.ID}</span><strong>{device.modelId ?? T.MACHINES.MODEL_UNASSIGNED}</strong></div>
              <div><span>{T.MACHINES.MODEL_MAPPED_AT}</span><strong>{formatDate(device.modelMappedAt, true)}</strong></div>
              <div><span>{T.MACHINES.MODEL_MAPPED_BY}</span><strong>{device.modelMappedBy ?? "—"}</strong></div>
              <div><span>{T.MACHINES.MODEL_MAPPING_REASON}</span><strong>{device.modelMappingReason ?? "—"}</strong></div>
            </div>
            {device.modelId ? <>
              {machineModel.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {machineModel.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machineModel.error)}</p><button type="button" onClick={() => void machineModel.refetch()}>{T.COMMON.RETRY}</button></div>}
              {machineModel.data && <>
                <h3>{T.MACHINE_MODELS.DETAIL}</h3>
                <div className={styles.operationsGrid}>
                  <div><span>{T.MACHINE_MODELS.MODEL_CODE}</span><strong>{machineModel.data.modelCode}</strong></div>
                  <div><span>{T.MACHINE_MODELS.MANUFACTURER}</span><strong>{machineModel.data.manufacturer}</strong></div>
                  <div><span>{T.MACHINE_MODELS.DISPLAY_NAME}</span><strong>{machineModel.data.displayName}</strong></div>
                  <div><span>{T.MACHINES.MACHINE_TYPE}</span><strong>{machineModel.data.machineType === "SMART_IOT" ? T.MACHINES.SMART : T.MACHINES.CONVENTIONAL}</strong></div>
                  <div><span>{T.MACHINE_MODELS.ACTIVE}</span><strong>{machineModel.data.active ? T.MACHINE_MODELS.ACTIVE : T.MACHINE_MODELS.INACTIVE}</strong></div>
                  <div><span>{T.MACHINE_MODELS.CREATED_AT}</span><strong>{formatDate(machineModel.data.createdAt, true)}</strong></div>
                  <div><span>{T.MACHINE_MODELS.UPDATED_AT}</span><strong>{formatDate(machineModel.data.updatedAt, true)}</strong></div>
                </div>
                <div className={styles.machineModelSpecifications}>
                  <span>{T.MACHINE_MODELS.SPECIFICATIONS}</span>
                  {Object.keys(machineModel.data.specifications).length > 0
                    ? <pre>{JSON.stringify(machineModel.data.specifications, null, 2)}</pre>
                    : <p>{T.MACHINE_MODELS.SPECIFICATIONS_EMPTY}</p>}
                </div>
              </>}
            </> : <p className={styles.emptyText}>{T.MACHINES.MODEL_UNLINKED}</p>}
          </section>
        )}
      </div>

      <section className={styles.panel}>
        <h2>{T.MACHINES.PREVENTIVE}</h2>
        {schedule.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
        {schedule.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(schedule.error)}</p><button type="button" onClick={() => void schedule.refetch()}>{T.COMMON.RETRY}</button></div>}
        {schedule.data && <div className={styles.operationsGrid}>
          <div><span>{T.MACHINES.NEXT_MAINTENANCE}</span><strong>{formatDate(schedule.data.nextPreventiveMaintenanceAt, true)}</strong></div>
          <div><span>{T.MACHINES.CUPS}</span><strong>{formatNumber(schedule.data.cupsServedSinceLastDescale)}</strong></div>
        </div>}
      </section>

      <section className={styles.panel}>
        <div className={styles.machineInventoryHeading}>
          <h2>{T.MACHINES.TICKET_HISTORY}</h2>
          {maintenanceTickets.data && <span>{formatNumber(maintenanceTickets.data.length)} {T.MACHINES.TICKET_COUNT}</span>}
        </div>
        {maintenanceTickets.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
        {maintenanceTickets.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(maintenanceTickets.error)}</p><button type="button" onClick={() => void maintenanceTickets.refetch()}>{T.COMMON.RETRY}</button></div>}
        {maintenanceTickets.data && maintenanceTickets.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
        {maintenanceTickets.data && maintenanceTickets.data.length > 0 && <DataTable
          headerVariant="admin"
          rows={maintenanceTickets.data}
          rowKey={(ticket, index) => ticket.id ?? `${ticket.machineId}-${index}`}
          columns={[
            { key: "ticket-id", header: T.MACHINES.TICKET_ID, render: (ticket) => ticket.id ?? "—" },
            { key: "machine-id", header: T.MACHINES.MACHINE_ID, render: (ticket) => ticket.machineId ?? "—" },
            { key: "status", header: T.MACHINES.STATUS, render: (ticket) => ticket.status ?? "—" },
            { key: "scheduled", header: T.MACHINES.SCHEDULED, render: (ticket) => formatDate(ticket.scheduledDueAt ?? ticket.maintenanceWindowDeadline, true) },
            { key: "technician", header: T.MACHINES.TECHNICIAN, render: (ticket) => ticket.assignedTechnicianId ?? ticket.assignedTo ?? "—" },
            { key: "result", header: T.MACHINES.DIAGNOSIS, render: (ticket) => ticket.resolutionResult ?? ticket.diagnosis ?? ticket.notes ?? "—" },
            { key: "completed", header: T.MACHINES.COMPLETED, render: (ticket) => formatDate(ticket.completedAt, true) },
          ]}
        />}
      </section>

      {isSmartIot ? <>
        <MachineHeartbeatPanel
          title={T.MACHINES.HEARTBEAT}
          heartbeat={heartbeat.data}
          loading={heartbeat.isPending}
          error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined}
          onRetry={() => void heartbeat.refetch()}
          emptyMessage={T.COMMON.EMPTY}
          retryLabel={T.COMMON.RETRY}
        />
        <SmartIotPanel title={T.MACHINES.TELEMETRY}>
          <TelemetryHistoryPanel
            range={range}
            onRangeChange={setRange}
            points={telemetryPoints}
            loading={points.isPending && Boolean(range)}
            error={points.isError ? getApiErrorMessage(points.error) : undefined}
            onRetry={() => void points.refetch()}
            hasMore={points.hasNextPage}
            loadingMore={points.isFetchingNextPage}
            onLoadMore={() => void points.fetchNextPage()}
          />
        </SmartIotPanel>
      </> : <section className={styles.panel}>
        <h2>{T.MACHINES.HEARTBEAT}</h2>
        <p className={styles.emptyText}>{device.machineType === "CONVENTIONAL" ? "Máy thường không có heartbeat hoặc telemetry IoT." : "Chưa truy vấn heartbeat vì backend chưa xác nhận loại máy là Smart IoT."}</p>
      </section>}
      </MachineDetailView>
    </div>
    {confirmDelete && <NotificationDialog
      variant="confirm"
      title="Xóa máy khỏi hệ thống?"
      description="Chỉ máy chưa có lịch sử hợp đồng mới có thể xóa. Thao tác này xóa bản ghi máy khỏi hệ thống."
      primaryAction={{ label: "Xóa máy", pending: deleteMachine.isPending, pendingLabel: "Đang xóa…", onClick: () => deleteMachine.mutate() }}
      secondaryAction={{ label: "Hủy", disabled: deleteMachine.isPending, onClick: () => setConfirmDelete(false) }}
      onClose={() => { if (!deleteMachine.isPending) setConfirmDelete(false); }}
      closeOnEscape={!deleteMachine.isPending}
    >
      {machineActionError && <p className={styles.accountInlineWarning} role="alert">{machineActionError}</p>}
    </NotificationDialog>}
    {actionBar(true)}
  </AdminShell>;
}

export function MachineDetailScreen() {
  return <MachineDetailContent />;
}
