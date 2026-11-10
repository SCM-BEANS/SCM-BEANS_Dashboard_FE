import { PageActions } from "@/components/action-bar/page-actions";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { locationsApi } from "@/apis/locations.api";
import { ownerMachineStatusLabel } from "@/components/machines/machine-status-labels";
import { MachineContractHistory } from "@/components/machines/machine-contract-history";
import { MachineSectionTabs } from "@/components/machines/operational-overview";
import { TextLinkButton } from "@/components/button/text-link-button";
import { ButtonBar } from "@/components/button/button-bar";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { DataTable } from "@/components/table/data-table";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { MachineDetailView } from "@/components/machines/machine-detail-view";
import { MachineListView } from "@/components/machines/machine-list-view";
import { MachineConnectionBadge, type MachineConnectionState } from "@/components/machines/machine-connection-badge";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { staggerHeartbeatRequest, usePageVisibility, useVisibleMachineIds } from "@/components/machines/machine-heartbeat-visibility";
import machineStyles from "@/components/machines/machines.module.css";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { machinesApi } from "@/apis/machines.api";
import { contractsApi } from "@/apis/contracts.api";
import { MachineMaintenanceTicketActions } from "@/components/features/maintenance-workflow/maintenance-ticket-actions";
import { TransferMachineAction } from "@/components/features/locations/transfer-machine-action";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { telemetryApi } from "@/apis/telemetry.api";
import { ownerAnalyticsApi } from "@/apis/owner-analytics.api";
import { OwnerAnalyticsCalendarRangeSchema } from "@/schema/owner-analytics.schema";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getVietnamToday, summarizeMachineCleaning } from "./machine-cleaning-history-panel";
import { MachineIdSchema } from "@/schema/machines.schema";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, QueryFeedback, statusLabel, useOwnerSubject } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

const maintenanceRequestStatusLabels: Record<string, string> = {
  REQUESTED: "Đã gửi",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Đề nghị đổi lịch",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};
const closedMaintenanceRequestStatuses = new Set(["COMPLETED", "CLOSED", "CANCELLED"]);
const REQUEST_PREVIEW_LIMIT = 5;
const detailTabs = [
  { value: "overview", label: "Tổng quan" },
  { value: "maintenance", label: "Bảo trì & hỗ trợ" },
  { value: "contracts", label: "Hợp đồng" },
  { value: "model", label: "Xem máy" },
] as const;
type DetailTab = (typeof detailTabs)[number]["value"];
const detailPanelId = (tab: string) => `owner-machine-panel-${tab}`;
const MachineDigitalTwinView = dynamic(
  () =>
    import("@/components/features/digital-twin/machine-digital-twin-view").then(
      (module) => module.MachineDigitalTwinView,
    ),
  {
    ssr: false,
    loading: () => (
      <p className={styles.loadingNotice} role="status">
        Đang tải mô hình…
      </p>
    ),
  },
);

export function MachinesScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const router = useRouter();
  const subject = authScopedQuerySubject("OWNER");
  const { ownerId } = useOwnerSubject();
  const locations = useQuery({ queryKey: ["owner-locations", subject, ownerId], queryFn: ({ signal }) => locationsApi.list({ ownerId: ownerId!, activeOnly: false }, signal), enabled: Boolean(ownerId), retry: false });
  const locationName = (id: string | null | undefined) => id ? locations.data?.find((location) => location.id === id)?.name ?? "—" : "Kho";
  const ready = router.isReady && Boolean(getAuthenticatedSubjectId());
  const [machineTypeFilter, setMachineTypeFilter] = useState<"ALL" | "SMART_IOT" | "CONVENTIONAL">("ALL");
  const [summaryDate, setSummaryDate] = useState(getVietnamToday);
  const summaryRange = OwnerAnalyticsCalendarRangeSchema.parse({ fromDate: summaryDate, toDate: summaryDate });
  const candidate = sectionPath.startsWith("machines/") ? sectionPath.slice("machines/".length) : "";
  const machineId = MachineIdSchema.safeParse(candidate).success ? candidate : null;
  const isHistory = sectionPath === "machines/history";
  const isList = sectionPath === "machines" || isHistory;
  const isPageVisible = usePageVisibility();
  const heartbeatTableRef = useRef<HTMLDivElement>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [showAllRequests, setShowAllRequests] = useState(false);
  useEffect(() => { setDetailTab("overview"); setShowAllRequests(false); }, [machineId]);
  const list = useQuery({
    queryKey: ["owner-machines", subject],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: ready && isList, retry: false,
  });
  const detail = useQuery({
    queryKey: ["owner-machine", subject, machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId!, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const schedule = useQuery({
    queryKey: ["owner-machine-maintenance-schedule", subject, machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId!, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const contractHistory = useQuery({
    queryKey: ["owner-machine-contract-history", subject, machineId],
    queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId!, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const maintenanceRequests = useQuery({
    queryKey: ["owner-machine-maintenance-requests", subject, machineId],
    queryFn: ({ signal }) => maintenanceRequestsApi.listByMachine(machineId!, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const maintenanceTickets = useQuery({
    queryKey: ["owner-machine-maintenance-tickets", subject, machineId],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ machineId: machineId!, page: 0, size: 100 }, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const visibleMachines = (list.data ?? []).filter((machine) => machineTypeFilter === "ALL" || machine.machineType === machineTypeFilter);
  const smartIotMachines = isList ? visibleMachines.filter((machine) => machine.machineType === "SMART_IOT") : [];
  const visibleMachineIds = useVisibleMachineIds(heartbeatTableRef, smartIotMachines.map((machine) => machine.id));
  const visibleHeartbeatMachines = smartIotMachines.filter((machine) => visibleMachineIds.has(machine.id));
  const listHeartbeats = useQueries({
    queries: visibleHeartbeatMachines.map((machine, index) => ({
      queryKey: ["owner-machine-heartbeat", subject, machine.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        await staggerHeartbeatRequest(index, signal);
        return telemetryApi.getLatestHeartbeat(machine.id, signal);
      },
      enabled: ready && isPageVisible,
      retry: false,
      staleTime: 3_000,
      refetchInterval: isPageVisible ? 5_000 : false,
      refetchIntervalInBackground: false,
    })),
  });
  const heartbeatByMachineId = new Map<string, (typeof listHeartbeats)[number]>();
  visibleHeartbeatMachines.forEach((machine, index) => heartbeatByMachineId.set(machine.id, listHeartbeats[index]!));
  const isSmartIot = Boolean(machineId && detail.data?.machineType === "SMART_IOT");
  const scopeMachines = isList ? visibleHeartbeatMachines : detail.data && isSmartIot ? [detail.data] : [];
  const activeContracts = useQueries({ queries: scopeMachines.map((machine) => ({
    queryKey: ["owner-machine-active-contract", subject, machine.id],
    queryFn: ({ signal }: { signal: AbortSignal }) => contractsApi.getMachineHistory(machine.id, signal, "ACTIVE"),
    enabled: ready, retry: false, refetchOnWindowFocus: false,
  })) });
  const scopeByMachine = new Map(scopeMachines.map((machine, index) => [machine.id, activeContracts[index]!]));
  const activeMachineIds = new Set(scopeMachines.filter((machine, index) => activeContracts[index]?.data?.some((contract) => contract.status === "ACTIVE" && contract.machineId === machine.id && (!machine.ownerId || contract.ownerId === machine.ownerId))).map((machine) => machine.id));
  const activeScope = machineId ? scopeByMachine.get(machineId) : undefined;
  const activeContract = activeScope?.data?.find((contract) => contract.status === "ACTIVE" && contract.machineId === machineId && (!detail.data?.ownerId || contract.ownerId === detail.data.ownerId));
  const analyticsEnabled = ready && isSmartIot && Boolean(activeContract);
  const analyticsContext = {
    machineId: machineId ?? undefined,
    machineSerialNumber: detail.data?.serialNumber ?? undefined,
    ownerId: activeContract?.ownerId,
  };
  const cups = useQuery({
    queryKey: ["owner-machine-cups-today", subject, machineId, summaryDate],
    queryFn: ({ signal }) => ownerAnalyticsApi.getCupCount({ ...summaryRange, machineId: machineId! }, signal, analyticsContext),
    enabled: analyticsEnabled, retry: false, staleTime: 0,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const snapshotEnabled = ready && (isList ? activeMachineIds.size > 0 && smartIotMachines.length > 0 : analyticsEnabled);
  const cleaning = useQuery({
    queryKey: ["owner-cleaning-today", subject, isList ? "fleet" : machineId, summaryDate],
    queryFn: ({ signal }) => ownerAnalyticsApi.getCleaningSnapshot(
      { ...summaryRange, ...(isList ? {} : { machineId: machineId! }) }, signal, isList ? {} : analyticsContext,
    ),
    enabled: snapshotEnabled, retry: false, staleTime: 0,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const heartbeat = useQuery({
    queryKey: ["owner-machine-heartbeat", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId!, signal),
    enabled: Boolean(ready && isSmartIot && isPageVisible),
    retry: false,
    refetchInterval: isPageVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  const cleaningLabel = (id: string, type: "startup" | "closing") => {
    const scope = scopeByMachine.get(id);
    if (scope?.isError) return "Chưa kiểm tra được";
    if (!scope?.isSuccess) return "Đang kiểm tra…";
    if (!activeMachineIds.has(id)) return "Ngoài phạm vi dữ liệu";
    if (cleaning.isError) return "Không tải được";
    if (!cleaning.data) return "Đang kiểm tra…";
    return summarizeMachineCleaning(cleaning.data.items, id, cleaning.data.complete)[type];
  };
  const refreshSummary = () => {
    const today = getVietnamToday();
    if (summaryDate !== today) setSummaryDate(today);
    else {
      if (snapshotEnabled) void cleaning.refetch();
      if (analyticsEnabled) void cups.refetch();
    }
    activeContracts.forEach((query) => void query.refetch());
    if (isList) { void list.refetch(); }
    else { void detail.refetch(); void contractHistory.refetch(); }
  };
  const countLabel = !isSmartIot ? "Không áp dụng" : activeScope?.isError ? "Chưa kiểm tra được"
    : !activeScope?.isSuccess ? "Đang kiểm tra…" : !activeContract || cups.data?.activeMachineCount === 0 ? "Ngoài phạm vi dữ liệu"
      : cups.isError ? "Không tải được" : cups.data ? `${cups.data.totalCups.toLocaleString("vi-VN")} ly` : "Đang tải…";

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={machineId ? messages.MACHINE_DETAIL_TITLE : isHistory ? messages.MACHINE_HISTORY_TITLE : messages.MACHINES_TITLE}
        titleId="customer-screen-title"
        description={isHistory ? "Chọn máy để xem lịch sử hợp đồng, bảo trì và yêu cầu hỗ trợ." : messages.MACHINES_DESCRIPTION}
        className={styles.pageHeading}
      />
      <div className={machineStyles.ownerOperationsHeader}>
        {!machineId && <div className={machineStyles.machineListFilterGroup} role="group" aria-label="Lọc máy theo loại">
          {([['ALL', 'Tất cả máy'], ['SMART_IOT', 'Smart IoT'], ['CONVENTIONAL', 'Thông thường']] as const).map(([value, label]) => <button className={machineStyles.machineListFilterButton} type="button" key={value} aria-pressed={machineTypeFilter === value} onClick={() => setMachineTypeFilter(value)}>{label}</button>)}
        </div>}
        <div className={machineStyles.ownerToolbarRight}>
          <p>Dữ liệu vệ sinh ngày {summaryDate.split("-").reverse().join("/")}</p>
          <button className={machineStyles.machineListFilterButton} type="button" disabled={cleaning.isFetching || cups.isFetching} onClick={refreshSummary}>Làm mới</button>
        </div>
      </div>
      {machineId && isSmartIot && <PageActions actions={[{ id: "machine-operational-overview", label: "Xem dữ liệu vận hành", href: PATH_CUSTOMER.MACHINE_OPERATIONAL_OVERVIEW(machineId), variant: "secondary", priority: 0 }]} />}
      {machineId ? (
        <MachineDetailView summary={detail.data ? [
          { label: "Kết nối", value: isSmartIot ? <MachineConnectionBadge state={heartbeat.isError ? "error" : heartbeat.isPending ? "loading" : heartbeat.data?.status ?? "not-requested"} /> : "Không áp dụng" },
          { label: summaryDate === getVietnamToday() ? "Số ly hôm nay" : `Số ly ngày ${summaryDate.split("-").reverse().join("/")}`, value: countLabel },
          { label: "Vệ sinh đầu ngày", value: isSmartIot ? cleaningLabel(machineId, "startup") : "Không áp dụng" },
          { label: "Vệ sinh cuối ngày", value: isSmartIot ? cleaningLabel(machineId, "closing") : "Không áp dụng" },
        ] : []}>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_MACHINES} />
          {detail.data ? (
            <>
              <MachineSectionTabs label="Nội dung chi tiết máy" tabs={detailTabs} activeTab={detailTab} onTabChange={(tab) => setDetailTab(tab as DetailTab)} idPrefix="owner-machine" panelId={detailPanelId} />
              <div className={`${machineStyles.machineDetailSections} ${machineStyles.ownerDetailTabPanel}`} id={detailPanelId("overview")} role="tabpanel" aria-labelledby="owner-machine-tab-overview" hidden={detailTab !== "overview"}>
              <section className={styles.dataPanel} aria-labelledby="owner-machine-profile">
                <h2 id="owner-machine-profile">Thông tin & theo dõi</h2>
                <dl className={styles.detailGrid}>
                  <DetailItem label={messages.FIELD_MACHINE_ID} value={<span className={machineStyles.copyIdRow}><TruncatedId value={detail.data.id} /><button type="button" className={machineStyles.copyIdButton} aria-label="Sao chép mã máy" onClick={() => void navigator.clipboard.writeText(detail.data!.id)}>Sao chép</button></span>} />
                  <DetailItem label={messages.FIELD_SERIAL} value={detail.data.serialNumber} />
                  <DetailItem label="Menu đang gán" value={detail.data.activeMenuId === undefined ? "Chưa có thông tin menu" : detail.data.activeMenuId === null ? "Menu mặc định" : detail.data.activeMenuName || "Menu riêng"} />
                  <DetailItem label={messages.FIELD_STATUS} value={<StatusBadge status={detail.data.status}>{ownerMachineStatusLabel(detail.data.status)}</StatusBadge>} />
                  <DetailItem label={messages.FIELD_MACHINE_TYPE} value={detail.data.machineType === "SMART_IOT" ? "Smart IoT" : detail.data.machineType === "CONVENTIONAL" ? "Thông thường" : "Chưa xác định"} />
                  <DetailItem label={messages.FIELD_REGION} value={detail.data.region} />
                  <DetailItem label={messages.FIELD_DEPLOYED_AT} value={formatDate(detail.data.deployedAt)} />
                  <DetailItem label={messages.FIELD_CONTRACT_END} value={formatDate(detail.data.contractEndDate)} />
                  <DetailItem label="Điểm bán" value={locationName(detail.data.locationId)} />
                </dl>
                {detail.data.ownerId && <TransferMachineAction machine={detail.data} role="owner" pageLevel />}
                {isSmartIot && activeScope?.isSuccess && (!activeContract || cups.data?.activeMachineCount === 0) ? <p className={styles.emptyNotice}>Dữ liệu vận hành chỉ gồm máy có hợp đồng đang hiệu lực.</p> : null}
              </section>
              {isSmartIot ? <>
                <MachineHeartbeatPanel
                  title="Kết nối gần nhất"
                  heartbeat={heartbeat.data}
                  loading={heartbeat.isPending}
                  error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined}
                  onRetry={() => void heartbeat.refetch()}
                />
              </> : null}
              </div>
              <section className={`${styles.dataPanel} ${machineStyles.ownerDetailTabPanel}`} id={detailPanelId("maintenance")} role="tabpanel" aria-labelledby="owner-machine-tab-maintenance" hidden={detailTab !== "maintenance"}>
                <div className={machineStyles.ownerOperationsHeader}>
                  <h2 id="owner-machine-history-maintenance">Bảo trì và hỗ trợ</h2>
                  <TextLinkButton href={PATH_CUSTOMER.MAINTENANCE}>Xem tất cả</TextLinkButton>
                </div>
                {schedule.isError || maintenanceTickets.isError || maintenanceRequests.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được một phần lịch sử bảo trì hoặc hỗ trợ.</p>
                ) : schedule.isPending || maintenanceTickets.isPending || maintenanceRequests.isPending ? (
                  <p className={styles.loadingNotice} role="status">Đang tải lịch sử bảo trì…</p>
                ) : null}
                <div className={machineStyles.machineDetailSummary} aria-label="Tóm tắt bảo trì">
                  {([
                    ["Bảo trì kế tiếp", formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? detail.data.nextPreventiveMaintenanceAt)],
                    ["Số ly từ lần vệ sinh", typeof schedule.data?.cupsServedSinceLastDescale === "number" ? `${schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN")} ly` : "—"],
                    ["Phiếu đang mở", maintenanceTickets.data ? maintenanceTickets.data.filter((ticket) => ticket.status !== "RESOLVED").length : "—"],
                    ["Yêu cầu đang xử lý", maintenanceRequests.data ? maintenanceRequests.data.filter((request) => !closedMaintenanceRequestStatuses.has(request.status)).length : "—"],
                  ] as const).map(([label, value]) => <article className={machineStyles.machineDetailMetric} key={label}><span>{label}</span><strong>{value}</strong></article>)}
                </div>
                {machineId && <MachineMaintenanceTicketActions
                  machineId={machineId}
                  tickets={maintenanceTickets.data ?? []}
                  role="OWNER"
                  presentation="table"
                  previewLimit={REQUEST_PREVIEW_LIMIT}
                  onRefresh={() => maintenanceTickets.refetch()}
                />}
                <h3>Yêu cầu hỗ trợ ({maintenanceRequests.data?.length ?? 0})</h3>
                <DataTable
                  rows={showAllRequests ? maintenanceRequests.data ?? [] : (maintenanceRequests.data ?? []).slice(0, REQUEST_PREVIEW_LIMIT)}
                  rowKey={(request) => request.id}
                  emptyMessage="Chưa có yêu cầu hỗ trợ."
                  columns={[
                    { key: "type", header: "Loại", render: (request) => request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì" },
                    { key: "status", header: "Trạng thái", render: (request) => <StatusBadge status={request.status}>{maintenanceRequestStatusLabels[request.status] ?? statusLabel(request.status)}</StatusBadge> },
                    { key: "description", header: "Mô tả", render: (request) => <span className={machineStyles.truncateLine} title={request.issueDescription ?? undefined}>{request.issueDescription?.trim() || "Không có mô tả"}</span> },
                    { key: "action", header: <span className={machineStyles.visuallyHidden}>Thao tác</span>, align: "right", render: (request) => <TextLinkButton href={request.requestType === "REPAIR" ? PATH_CUSTOMER.SUPPORT_DETAIL(request.id) : PATH_CUSTOMER.MAINTENANCE_DETAIL(request.id)}>Xem yêu cầu</TextLinkButton> },
                  ]}
                />
                {(maintenanceRequests.data?.length ?? 0) > REQUEST_PREVIEW_LIMIT && (
                  <ButtonBar type="button" className={machineStyles.showMoreButton} onClick={() => setShowAllRequests((current) => !current)}>
                    {showAllRequests ? "Thu gọn" : `Xem thêm ${(maintenanceRequests.data?.length ?? 0) - REQUEST_PREVIEW_LIMIT} yêu cầu`}
                  </ButtonBar>
                )}
              </section>
              <div className={machineStyles.ownerDetailTabPanel} id={detailPanelId("contracts")} role="tabpanel" aria-labelledby="owner-machine-tab-contracts" hidden={detailTab !== "contracts"}>
                <MachineContractHistory machineId={machineId!} role="OWNER" />
              </div>
              <div className={machineStyles.ownerDetailTabPanel} id={detailPanelId("model")} role="tabpanel" aria-labelledby="owner-machine-tab-model" hidden={detailTab !== "model"}>
                {detailTab === "model" ? (
                  <>
                    <p className={machineStyles.muted}>
                      Mô hình 3D minh họa, chuyển động mô phỏng — không phải dữ liệu thời gian thực của máy.
                    </p>
                    <MachineDigitalTwinView />
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </MachineDetailView>
      ) : (
        <MachineListView
          labelledBy="customer-screen-title"
          summary={list.data ? <div className={machineStyles.machineDetailSummary} aria-label="Tóm tắt máy">
            {[
              ["Tổng số máy", list.data.length],
              ["Smart IoT", list.data.filter((machine) => machine.machineType === "SMART_IOT").length],
              ["Thông thường", list.data.filter((machine) => machine.machineType === "CONVENTIONAL").length],
              ["Đang bảo trì", list.data.filter((machine) => machine.status === "UNDER_MAINTENANCE").length],
            ].map(([label, count]) => <article className={machineStyles.machineDetailMetric} key={label}><span>{label}</span><strong>{count}</strong></article>)}
          </div> : null}
        >
          <QueryFeedback
            loading={list.isPending}
            failed={list.isError}
            empty={Boolean(list.data && visibleMachines.length === 0)}
            emptyText={machineTypeFilter === "ALL" ? messages.NO_MACHINES : "Không có máy phù hợp với bộ lọc."}
          />
              {visibleMachines.length > 0 && <div ref={heartbeatTableRef}>
                <DataTable
                  variant="moderator"
                  headerVariant="admin"
                  rows={visibleMachines}
                  rowKey={(machine) => machine.id}
                  rowProps={(machine) => ({
                    ...(machine.machineType === "SMART_IOT" ? { "data-machine-heartbeat-id": machine.id } : {}),
                    tabIndex: 0,
                    onClick: (event) => { if (!(event.target as HTMLElement).closest("a,button")) void router.push(PATH_CUSTOMER.MACHINE_DETAIL(machine.id)); },
                    onKeyDown: (event) => { if (event.key === "Enter" && event.target === event.currentTarget) void router.push(PATH_CUSTOMER.MACHINE_DETAIL(machine.id)); },
                  })}
                  columns={[
                    { key: "serial", header: "Máy", render: (machine) => <Link className={machineStyles.ownerMachineLink} href={PATH_CUSTOMER.MACHINE_DETAIL(machine.id)}>{machine.serialNumber ?? messages.MACHINE_NO_SERIAL}</Link> },
                    { key: "type", header: messages.FIELD_MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Thông thường" : "—" },
                    { key: "status", header: messages.FIELD_STATUS, render: (machine) => <StatusBadge status={machine.status}>{ownerMachineStatusLabel(machine.status)}</StatusBadge> },
                    { key: "location", header: "Điểm bán", render: (machine) => locationName(machine.locationId) },
                    { key: "connection", header: "Kết nối", render: (machine) => {
                      if (machine.machineType !== "SMART_IOT") return <span className={machineStyles.muted}>Không áp dụng</span>;
                      const query = heartbeatByMachineId.get(machine.id);
                      const state: MachineConnectionState = query?.isError ? "error" : query?.isPending ? "loading" : query?.data?.status ?? "not-requested";
                      return <MachineConnectionBadge state={state} onRetry={query ? () => void query.refetch() : undefined} />;
                    } },
                    { key: "cleaning", header: "Vệ sinh trong ngày", render: (machine) => machine.machineType !== "SMART_IOT" ? <span className={machineStyles.muted}>Không áp dụng</span> : <div className={machineStyles.ownerCleaningSummary}><span>Đầu ngày: {cleaningLabel(machine.id, "startup")}</span><span>Cuối ngày: {cleaningLabel(machine.id, "closing")}</span></div> },
                  ]}
                />
              </div>}
        </MachineListView>
      )}
    </section>
  );
}
