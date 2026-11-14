import { MachineListFilters, type MachineListFilterValue } from "@/components/machines/machine-list-filters";
import { useState } from "react";
import { telemetryApi } from "@/apis/telemetry.api";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { usePageVisibility, staggerHeartbeatRequest } from "@/components/machines/machine-heartbeat-visibility";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery, useQueries } from "@tanstack/react-query";
import { contractsApi } from "@/apis/contracts.api";
import { OfflineReviewWorkflowError, offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { locationsApi } from "@/apis/locations.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { PATH_ADMIN } from "@/routes/path";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { MACHINE_STATUS_LABELS } from "@/components/machines/machine-status-labels";
import machineStyles from "@/components/machines/machines.module.css";
import type { Contract } from "@/schema/contracts.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getIotBackDestination } from "../admin-back-destination";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";


function count(value: number | undefined): string {
  return value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function machineTypeFor(machineId: string, ownerContracts: Contract[]): string {
  const types = new Set(ownerContracts
    .filter((contract) => contract.machineId === machineId && contract.status === "ACTIVE")
    .map((contract) => contract.machineTypeSnapshot)
    .filter((value): value is string => Boolean(value)));
  if (types.size === 1) return [...types][0] === "SMART_IOT" ? T.MACHINES.SMART : T.MACHINES.CONVENTIONAL;
  if (types.size > 1) return "Nhiều loại theo hợp đồng";
  return T.MACHINES.UNCLASSIFIED;
}

function IoTContent() {
  const router = useRouter();
  const [filterDraft, setFilterDraft] = useState<MachineListFilterValue>({ search: "", status: "", connection: "" });
  const [machineFilters, setMachineFilters] = useState(filterDraft);
  const [machinePage, setMachinePage] = useState(0);
  const visible = usePageVisibility();
  const ownerId = typeof router.query.ownerId === "string" ? router.query.ownerId : "";
  const hasOwnerId = ownerId.length > 0;
  const validOwnerId = router.isReady && ProfileIdSchema.safeParse(ownerId).success;
  const subject = authScopedQuerySubject("ADMIN");
  const reviewView = router.query.view === "reviews" || typeof router.query.reviewId === "string" || typeof router.query.reviewStatus === "string";
  let reviewState: ReturnType<typeof readOfflineReviewQuery> | undefined;
  let reviewFilterError: string | undefined;
  try { reviewState = readOfflineReviewQuery(router.query, validOwnerId ? { ownerId } : {}); }
  catch { reviewFilterError = "Bộ lọc rà soát không hợp lệ. Hãy đặt lại bộ lọc để tiếp tục."; }
  const reviewsEnabled = router.isReady && Boolean(getAuthenticatedSubjectId()) && (!hasOwnerId || validOwnerId) && Boolean(reviewState) && (hasOwnerId || reviewView);
  const reviewContext = { ...(validOwnerId ? { ownerId } : {}), ...(reviewState?.params.machineId ? { machineId: reviewState.params.machineId } : {}) };
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, reviewState?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(reviewState!.params, signal), enabled: reviewsEnabled, retry: false });
  const reviewDetail = useQuery({ queryKey: ["offline-review", subject, reviewState?.reviewId, reviewContext], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(reviewState!.reviewId!, signal, reviewContext), enabled: reviewsEnabled && Boolean(reviewState?.reviewId), retry: false });
  const navigateReview = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query };
    for (const [key, value] of Object.entries(patch)) { if (!value) delete query[key]; else query[key] = value; }
    void router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };
  const offlinePanel = (machineLabels: Record<string, string>) => reviewFilterError ? <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{reviewFilterError}</p><ButtonBar onClick={() => navigateReview({ reviewId: undefined, reviewPage: undefined, reviewStatus: undefined, machineId: undefined })}>Đặt lại bộ lọc rà soát</ButtonBar></div> : <OfflineReviewPanel selectedId={reviewState?.reviewId}
    machineLabels={machineLabels} page={reviews.data} detail={reviewDetail.data} status={reviewState?.params.status ?? ""} machineId={reviewState?.params.machineId} canDecide
    loading={reviewsEnabled && reviews.isPending} detailLoading={Boolean(reviewState?.reviewId) && reviewDetail.isPending}
    error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={reviewDetail.isError ? getApiErrorMessage(reviewDetail.error) : undefined}
    onFilterChange={(status) => navigateReview({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigateReview({ reviewPage: String(page), reviewId: undefined })} onSelect={(id) => navigateReview({ reviewId: id })}
    onRefresh={() => { if (reviewsEnabled) { void reviews.refetch(); if (reviewState?.reviewId) void reviewDetail.refetch(); } }}
    onDecide={async (id, body, files) => { try { await offlineViolationReviewsApi.decideIfRequired(id, body, reviewContext, files); } catch (error) { throw new Error(error instanceof OfflineReviewWorkflowError ? error.message : getApiErrorMessage(error, "mutation")); } finally { await Promise.all([reviews.refetch(), reviewDetail.refetch()]); } }}
  />;

  const profile = useQuery({
    queryKey: ["dolores", "profiles", "owner", subject, ownerId, "iot"],
    queryFn: ({ signal }) => profilesApi.getById(ownerId, signal),
    enabled: validOwnerId,
  });
  const machines = useQuery({
    queryKey: ["dolores", "machines", "inventory", subject],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const candidates = (machines.data ?? []).filter((machine) => machine.machineType === "SMART_IOT").filter((machine) => (!machineFilters.status || machine.status === machineFilters.status) && (!machineFilters.search || [machine.serialNumber, machine.modelName, machine.modelCode].some((value) => typeof value === "string" && value.toLocaleLowerCase("vi-VN").includes(machineFilters.search.toLocaleLowerCase("vi-VN")))));
  const candidatePage = Math.min(machinePage, Math.max(0, Math.ceil(candidates.length / 10) - 1));
  const heartbeatMachines = machineFilters.connection ? candidates : candidates.slice(candidatePage * 10, candidatePage * 10 + 10);
  const heartbeats = useQueries({ queries: heartbeatMachines.map((machine, index) => ({
    queryKey: ["dolores", "admin", "telemetry", "heartbeat", subject, machine.id],
    queryFn: async ({ signal }) => { await staggerHeartbeatRequest(index, signal); return telemetryApi.getLatestHeartbeat(machine.id, signal); },
    enabled: visible && !hasOwnerId && !reviewView && Boolean(getAuthenticatedSubjectId()), retry: false, staleTime: 3000, refetchInterval: (query: { state: { error: unknown } }) => visible && !query.state.error ? (machineFilters.connection ? 30_000 : 5_000) : false, refetchIntervalInBackground: false,
  })) });
  const getHeartbeat = (id: string) => heartbeats[heartbeatMachines.findIndex((machine) => machine.id === id)];
  const connectionsLoading = Boolean(machineFilters.connection) && heartbeats.some((result) => result.isPending);
  const smartRows = candidates.filter((machine) => {
    if (!machineFilters.connection) return true;
    const result = getHeartbeat(machine.id);
    return machineFilters.connection === (result?.isError ? "error" : result?.data?.status);
  });
  const currentPage = Math.min(machinePage, Math.max(0, Math.ceil(smartRows.length / 10) - 1));
  const machineRows = smartRows.slice(currentPage * 10, currentPage * 10 + 10);
  const contracts = useQuery({
    queryKey: ["dolores", "contracts", "all", subject],
    queryFn: ({ signal }) => contractsApi.list(signal),
    enabled: validOwnerId,
  });
  const locations = useQuery({
    queryKey: ["dolores", "locations", "owner", subject, ownerId],
    queryFn: ({ signal }) => locationsApi.list({ ownerId }, signal),
    enabled: validOwnerId && Boolean(profile.data),
  });

  const allContracts = contracts.data ?? [];
  const allMachines = machines.data ?? [];

  if (hasOwnerId && !validOwnerId && router.isReady) {
    return <AdminShell><div className={styles.pageContent}>
      <BackButtonHeading
        title={T.IOT.OWNER_DETAIL}
        titleId="admin-iot-owner-title"
        description={T.IOT.DESCRIPTION}
        className={styles.pageHeading}
        back={getIotBackDestination(router.query)}
      />
      <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{T.COMMON.INVALID_OWNER_ID}</p></div>
    </div></AdminShell>;
  }

  if (hasOwnerId) {
    const ownerContracts = allContracts.filter((contract) => contract.ownerId === ownerId);
    const ownerMachines = allMachines.filter((machine) => machine.ownerId === ownerId);
    const activeSmartContracts = ownerContracts.filter((contract) => contract.status === "ACTIVE" && contract.machineTypeSnapshot === "SMART_IOT");
    const smartMachineIds = new Set(activeSmartContracts.map((contract) => contract.machineId).filter((id): id is string => Boolean(id)));
    const ownerLocations = (locations.data ?? []).filter((location) => (location.ownerId ?? location.tenantId) === ownerId);

    return <AdminShell>
      <div className={styles.pageContent}>
        <BackButtonHeading
          title={profile.data ? `${T.IOT.OWNER_DETAIL}: ${profile.data.fullName}` : T.IOT.OWNER_DETAIL}
          titleId="admin-iot-owner-title"
          description={T.IOT.DESCRIPTION}
          className={styles.pageHeading}
          back={getIotBackDestination(router.query)}
        />

        {profile.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
        {profile.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(profile.error)}</p><button type="button" onClick={() => void profile.refetch()}>{T.COMMON.RETRY}</button></div>}
        {profile.data && <>
          <div className={styles.metricsGrid}>
            <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.IOT.STORES}</span><strong>{locations.isError ? "—" : locations.isPending ? "…" : count(ownerLocations.length)}</strong></article>
            <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.IOT.MACHINES}</span><strong>{machines.isError ? "—" : machines.isPending ? "…" : count(ownerMachines.length)}</strong></article>
            <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.IOT.SMART_CONTRACTS}</span><strong>{contracts.isError ? "—" : contracts.isPending ? "…" : count(activeSmartContracts.length)}</strong></article>
            <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.IOT.OWNER}</span><strong><TruncatedId value={profile.data.idaasUserId} /></strong></article>
          </div>
          {locations.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(locations.error)}</p><button type="button" onClick={() => void locations.refetch()}>{T.COMMON.RETRY}</button></div>}
          {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contracts.error)}</p><button type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</button></div>}

          <section className={styles.panel}>
            <h2>{T.IOT.STORES}</h2>
            {locations.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
            {locations.data && ownerLocations.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
            {ownerLocations.length > 0 && <DataTable
              headerVariant="admin"
              rows={ownerLocations}
              rowKey={(location) => location.id}
              columns={[
                { key: "name", header: T.STORES.NAME, render: (location) => location.name },
                { key: "address", header: T.STORES.ADDRESS, render: (location) => location.address ?? "—" },
                { key: "city", header: T.STORES.CITY, render: (location) => location.city ?? "—" },
                { key: "status", header: T.MACHINES.STATUS, render: (location) => location.active === undefined ? "—" : <StatusBadge status={location.active ? "ACTIVE" : "INACTIVE"}>{location.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</StatusBadge> },
              ]}
            />}
          </section>

          <SmartIotPanel
            title={T.IOT.MACHINES}
            description={T.IOT.DESCRIPTION}
            state={machines.isPending ? "loading" : machines.isError ? "error" : ownerMachines.length === 0 ? "empty" : undefined}
            stateMessage={machines.isPending ? T.COMMON.LOADING : machines.isError ? getApiErrorMessage(machines.error) : ownerMachines.length === 0 ? T.COMMON.EMPTY : undefined}
            retryLabel={T.COMMON.RETRY}
            onRetry={() => void machines.refetch()}
          >
            {ownerMachines.length > 0 && <DataTable
              headerVariant="admin"
              rows={ownerMachines}
              rowKey={(machine) => machine.id}
              columns={[
                { key: "serial", header: T.MACHINES.SERIAL, align: "center", render: (machine) => machine.serialNumber ?? <TruncatedId value={machine.id} /> },
                { key: "type", header: T.IOT.MACHINE_TYPE_CONTRACT, render: (machine) => machineTypeFor(machine.id, ownerContracts) },
                { key: "status", header: T.MACHINES.STATUS, render: (machine) => machine.status ? <span className={styles.machinePlainStatus} data-status={machine.status}>{MACHINE_STATUS_LABELS[machine.status] ?? machine.status}</span> : "—" },
                { key: "region", header: T.MACHINES.REGION, render: (machine) => machine.region ?? "—" },
                { key: "deployed", header: T.MACHINES.DEPLOYED_AT, align: "center", render: (machine) => machine.deployedAt ? new Date(machine.deployedAt).toLocaleDateString("vi-VN") : "—" },
                { key: "actions", header: T.MACHINES.OPEN_DETAIL, render: (machine) => <ButtonBar rollingLabel href={PATH_ADMIN.MACHINE_DETAIL(machine.id)}>{T.MACHINES.OPEN_DETAIL}</ButtonBar> },
              ]}
            />}
            {smartMachineIds.size === 0 && ownerMachines.length > 0 && <p className={styles.panelSubtitle}>{T.IOT.NO_SMART_MACHINES}</p>}
          </SmartIotPanel>
          {offlinePanel(Object.fromEntries(allMachines.map((machine) => [machine.id, machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()])))}
        </>}
      </div>
    </AdminShell>;
  }

  return <AdminShell><div className={styles.pageContent}>
    <BackButtonHeading title="Giám sát máy" titleId="admin-iot-title" description="Chọn máy để xem kết nối, thông số và các lần mất kết nối đã ghi nhận." className={styles.pageHeading} back={null} />
    <div className={machineStyles.ownerOperationsTabs} role="group" aria-label="Phạm vi giám sát"><button type="button" aria-pressed={!reviewView} onClick={() => navigateReview({ view: "machines", reviewId: undefined, reviewStatus: undefined, reviewPage: undefined, machineId: undefined })}>Máy Smart IoT</button><button type="button" aria-pressed={reviewView} onClick={() => navigateReview({ view: "reviews" })}>Mất kết nối</button></div>
    {reviewView ? offlinePanel(Object.fromEntries(allMachines.map((machine) => [machine.id, machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()]))) : <section className={styles.panel}>
      <div className={styles.machineInventoryHeading}><h2>Máy Smart IoT</h2></div>
      <MachineListFilters connection value={filterDraft} onChange={setFilterDraft} onSubmit={() => { setMachineFilters({ ...filterDraft, search: filterDraft.search.trim() }); setMachinePage(0); }} />
      {machines.isPending || connectionsLoading ? <p role="status">Đang tải danh sách máy…</p> : machines.isError ? <div role="alert"><p>{getApiErrorMessage(machines.error)}</p><ButtonBar onClick={() => void machines.refetch()}>Thử lại</ButtonBar></div> : <DataTable variant="accounts" rows={machineRows} rowKey={(machine) => machine.id} emptyMessage="Không có máy Smart IoT phù hợp với bộ lọc." columns={[
        { key: "serial", header: "Máy", render: (machine) => <Link className={machineStyles.ownerMachineLink} href={PATH_ADMIN.MACHINE_OPERATIONAL_OVERVIEW(machine.id)}>{machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()}</Link> },
        { key: "status", header: "Trạng thái triển khai", render: (machine) => machine.status ? <span className={styles.machinePlainStatus} data-status={machine.status}>{MACHINE_STATUS_LABELS[machine.status] ?? machine.status}</span> : "—" },
        { key: "connection", header: "Kết nối", render: (machine) => { const result = getHeartbeat(machine.id); return <MachineConnectionBadge state={result?.isError ? "error" : result?.isPending ? "loading" : result?.data?.status ?? "not-requested"} onRetry={result ? () => void result.refetch() : undefined} />; } },
        { key: "actions", header: "Thao tác", render: (machine) => <div className={machineStyles.machineRowActions}><ButtonBar rollingLabel href={PATH_ADMIN.MACHINE_DETAIL(machine.id)}>Xem hồ sơ</ButtonBar><ButtonBar rollingLabel href={PATH_ADMIN.MACHINE_OPERATIONAL_OVERVIEW(machine.id)}>Xem vận hành</ButtonBar></div> },
      ]} />}
      <nav className={styles.machinePagination} aria-label="Phân trang giám sát"><span>{smartRows.length} máy · Trang {currentPage + 1}/{Math.max(1, Math.ceil(smartRows.length / 10))}</span><ButtonBar disabled={currentPage === 0} onClick={() => setMachinePage(currentPage - 1)}>Trước</ButtonBar><ButtonBar disabled={(currentPage + 1) * 10 >= smartRows.length} onClick={() => setMachinePage(currentPage + 1)}>Sau</ButtonBar></nav>
    </section>}
  </div><PageActions actions={[{ id: "iot-machines", label: "Kho máy", variant: "secondary", href: PATH_ADMIN.MACHINES }, { id: "iot-reports", label: "Báo cáo tổng hợp", variant: "secondary", href: PATH_ADMIN.REPORTS }]} /></AdminShell>;
}

export default function IoTPage() {
  return <IoTContent />;
}
