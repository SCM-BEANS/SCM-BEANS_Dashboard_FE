import { adminStyles } from "@/pages/admin/admin-shell";
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
import { staggerHeartbeatRequest, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
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
const detailTabs = [
  { value: "overview", label: "Tổng quan" },
  { value: "maintenance", label: "Bảo trì & hỗ trợ" },
  { value: "contracts", label: "Hợp đồng" },
  { value: "model", label: "Xem máy 3D" },
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
  const detailTab = (["overview", "maintenance", "contracts", "model"].includes(String(router.query.tab)) ? String(router.query.tab) : "overview") as DetailTab;
  const setDetailTab = (tab: DetailTab) => void router.push({ pathname: router.pathname, query: { ...router.query, tab } }, undefined, { shallow: true });
  const [machineSearch, setMachineSearch] = useState("");
  const [machinePage, setMachinePage] = useState(0);
  const [requestPage, setRequestPage] = useState(0);
  const [ticketPage, setTicketPage] = useState(0);
  useEffect(() => { setRequestPage(0); setTicketPage(0); }, [machineId]);
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
    queryKey: ["owner-machine-maintenance-tickets", subject, machineId, ticketPage],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTicketsPage({ machineId: machineId!, page: ticketPage, size: 10 }, signal),
    enabled: ready && Boolean(machineId), retry: false,
  });
  const visibleMachines = (list.data ?? []).filter((machine) => (machineTypeFilter === "ALL" || machine.machineType === machineTypeFilter) && (!machineSearch.trim() || [machine.serialNumber, machine.modelName, locationName(machine.locationId)].some((value) => typeof value === "string" && value.toLocaleLowerCase("vi-VN").includes(machineSearch.trim().toLocaleLowerCase("vi-VN")))));
  const currentPage = Math.min(machinePage, Math.max(0, Math.ceil(visibleMachines.length / 10) - 1));
  const pageMachines = visibleMachines.slice(currentPage * 10, currentPage * 10 + 10);
  const smartIotMachines = isList ? pageMachines.filter((machine) => machine.machineType === "SMART_IOT") : [];
  const visibleHeartbeatMachines = smartIotMachines;
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
      refetchInterval: (query: { state: { error: unknown } }) => isPageVisible && !query.state.error ? 5_000 : false,
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
    refetchInterval: (query: { state: { error: unknown } }) => isPageVisible && !query.state.error ? 5_000 : false,
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
    <section className={[styles.pageContent, styles.machineWorkspace].join(" ")} aria-labelledby="customer-screen-title">
      <div className={styles.machineHeading}><BackButtonHeading
        back={back ?? null}
        title={machineId ? "Hồ sơ máy" + (detail.data?.serialNumber ? " · " + detail.data.serialNumber : "") : isHistory ? messages.MACHINE_HISTORY_TITLE : messages.MACHINES_TITLE}
        titleId="customer-screen-title"
        description={machineId ? undefined : isHistory ? "Theo dõi hợp đồng và bảo trì của từng máy." : "Theo dõi máy, kết nối và lịch bảo trì."}
        className={styles.pageHeading}
      />
      </div>
      {machineId ? (
        <MachineDetailView className={styles.ownerProfileLayout} summary={detail.data ? [
          { label: "Kết nối", value: isSmartIot ? <MachineConnectionBadge state={heartbeat.isError ? "error" : heartbeat.isPending ? "loading" : heartbeat.data?.status ?? "not-requested"} /> : "Không áp dụng" },
          { label: summaryDate === getVietnamToday() ? "Số ly hôm nay" : `Số ly ngày ${summaryDate.split("-").reverse().join("/")}`, value: countLabel },
        ] : []}>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_MACHINES} />
          {detail.data ? (
            <>
              <div className={styles.ownerProfileNavigation}><MachineSectionTabs label="Nội dung chi tiết máy" tabs={detailTabs} activeTab={detailTab} onTabChange={(tab) => setDetailTab(tab as DetailTab)} idPrefix="owner-machine" panelId={detailPanelId} /><div className={styles.ownerContextActions}>{isSmartIot && <ButtonBar rollingLabel href={PATH_CUSTOMER.MACHINE_OPERATIONAL_OVERVIEW(machineId)}>Xem vận hành</ButtonBar>}<ButtonBar disabled={cleaning.isFetching || cups.isFetching} onClick={refreshSummary}>Làm mới</ButtonBar></div></div>
              <div className={`${machineStyles.machineDetailSections} ${machineStyles.ownerDetailTabPanel}`} id={detailPanelId("overview")} role="tabpanel" aria-labelledby="owner-machine-tab-overview" hidden={detailTab !== "overview"}>
              <div className={styles.ownerOverviewColumns}>
                <section className={styles.dataPanel} aria-labelledby="owner-machine-profile">
                  <div className={styles.ownerSectionHeading}><h2 id="owner-machine-profile">Thông tin máy</h2>{detail.data.ownerId && <TransferMachineAction machine={detail.data} role="owner" currentLocationName={locationName(detail.data.locationId)} />}</div>
                  <dl className={styles.ownerProfileRows}>
                    <DetailItem label="Serial" value={detail.data.serialNumber} />
                    <DetailItem label="Điểm bán" value={locationName(detail.data.locationId)} />
                    <DetailItem label="Loại máy" value={detail.data.machineType === "SMART_IOT" ? "Smart IoT" : detail.data.machineType === "CONVENTIONAL" ? "Máy thường" : "Chưa xác định"} />
                    <DetailItem label="Trạng thái" value={<span className={adminStyles.machinePlainStatus} data-status={detail.data.status ?? undefined}>{ownerMachineStatusLabel(detail.data.status)}</span>} />
                    <DetailItem label="Menu đang dùng" value={detail.data.activeMenuId === undefined ? "Chưa có thông tin menu" : detail.data.activeMenuId === null ? "Menu mặc định" : detail.data.activeMenuName || "Menu riêng"} />
                  </dl>
                </section>
                <aside className={styles.dataPanel}><h2>Lịch bảo trì</h2>
                  <dl className={styles.ownerProfileRows}>
                    <DetailItem label="Bảo trì tiếp theo" value={formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? detail.data.nextPreventiveMaintenanceAt)} />
                    <DetailItem label="Số ly từ lần xả cặn" value={(schedule.data?.cupsServedSinceLastDescale ?? detail.data.cupsServedSinceLastDescale)?.toLocaleString("vi-VN") ?? "Chưa có dữ liệu"} />
                    <DetailItem label="Hết hạn hợp đồng" value={formatDate(detail.data.contractEndDate)} />
                  </dl>
                  {schedule.isError && <p className={styles.errorNotice}>Chưa tải được lịch bảo trì mới nhất.</p>}
                  <ButtonBar onClick={() => setDetailTab("maintenance")}>Xem bảo trì & hỗ trợ</ButtonBar>
                </aside>
              </div>
              <details className={styles.ownerExtraDetails}><summary>Thông tin bổ sung</summary><dl className={styles.detailGrid}>
                <DetailItem label="Mã máy" value={<TruncatedId value={detail.data.id} />} />
                <DetailItem label="Khu vực" value={detail.data.region} />
                <DetailItem label="Ngày triển khai" value={formatDate(detail.data.deployedAt)} />
              </dl></details>
              {isSmartIot && activeScope?.isSuccess && (!activeContract || cups.data?.activeMachineCount === 0) ? <p className={styles.emptyNotice}>Dữ liệu vận hành chỉ gồm máy có hợp đồng đang hiệu lực.</p> : null}
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
                <div className={styles.ownerMaintenanceSummary} aria-label="Tóm tắt bảo trì">
                  {([
                    ["Bảo trì kế tiếp", formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? detail.data.nextPreventiveMaintenanceAt)],
                    ["Số ly từ lần vệ sinh", typeof schedule.data?.cupsServedSinceLastDescale === "number" ? `${schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN")} ly` : "—"],
                    ["Phiếu mở trong trang", maintenanceTickets.data ? maintenanceTickets.data.items.filter((ticket) => ticket.status !== "RESOLVED").length : "—"],
                    ["Yêu cầu đang xử lý", maintenanceRequests.data ? maintenanceRequests.data.filter((request) => !closedMaintenanceRequestStatuses.has(request.status)).length : "—"],
                  ] as const).map(([label, value]) => <article className={machineStyles.machineDetailMetric} key={label}><span>{label}</span><strong>{value}</strong></article>)}
                </div>
                {machineId && <MachineMaintenanceTicketActions
                  machineId={machineId}
                  tickets={maintenanceTickets.data?.items ?? []}
                  role="OWNER"
                  presentation="table"
                  previewLimit={10}
                  onRefresh={() => maintenanceTickets.refetch()}
                />}
                <nav className={machineStyles.ownerHistoryPagination} aria-label="Phân trang phiếu bảo trì"><ButtonBar disabled={ticketPage === 0 || maintenanceTickets.isFetching} onClick={() => setTicketPage(ticketPage - 1)}>Trước</ButtonBar><span>Trang {ticketPage + 1}</span><ButtonBar disabled={!maintenanceTickets.data?.hasNext || maintenanceTickets.isFetching} onClick={() => setTicketPage(ticketPage + 1)}>Sau</ButtonBar></nav>
                <h3>Yêu cầu hỗ trợ ({maintenanceRequests.data?.length ?? 0})</h3>
                <DataTable
                  variant="accounts"
                  rows={(maintenanceRequests.data ?? []).slice(requestPage * 10, requestPage * 10 + 10)}
                  rowKey={(request) => request.id}
                  emptyMessage="Chưa có yêu cầu hỗ trợ."
                  columns={[
                    { key: "type", header: "Loại", render: (request) => request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì" },
                    { key: "status", header: "Trạng thái", render: (request) => <span className={adminStyles.machinePlainStatus} data-status={request.status}>{maintenanceRequestStatusLabels[request.status] ?? statusLabel(request.status)}</span> },
                    { key: "description", header: "Mô tả", render: (request) => <span className={machineStyles.truncateLine} title={request.issueDescription ?? undefined}>{request.issueDescription?.trim() || "Không có mô tả"}</span> },
                    { key: "action", header: <span className={machineStyles.visuallyHidden}>Thao tác</span>, align: "right", render: (request) => <ButtonBar rollingLabel href={request.requestType === "REPAIR" ? PATH_CUSTOMER.SUPPORT_DETAIL(request.id) : PATH_CUSTOMER.MAINTENANCE_DETAIL(request.id)}>Xem yêu cầu</ButtonBar> },
                  ]}
                />
                <nav className={machineStyles.ownerHistoryPagination} aria-label="Phân trang yêu cầu hỗ trợ"><ButtonBar disabled={requestPage === 0} onClick={() => setRequestPage(requestPage - 1)}>Trước</ButtonBar><span>Trang {requestPage + 1}</span><ButtonBar disabled={(requestPage + 1) * 10 >= (maintenanceRequests.data?.length ?? 0)} onClick={() => setRequestPage(requestPage + 1)}>Sau</ButtonBar></nav>
              </section>
              <div className={machineStyles.ownerDetailTabPanel} id={detailPanelId("contracts")} role="tabpanel" aria-labelledby="owner-machine-tab-contracts" hidden={detailTab !== "contracts"}>
                <MachineContractHistory machineId={machineId!} role="OWNER" />
              </div>
              <div className={machineStyles.ownerDetailTabPanel} id={detailPanelId("model")} role="tabpanel" aria-labelledby="owner-machine-tab-model" hidden={detailTab !== "model"}>
                {detailTab === "model" ? (
                  <MachineDigitalTwinView machineId={machineId!} machineType={detail.data.machineType} activeMenuId={detail.data.activeMenuId ?? null} />
                ) : null}
              </div>
            </>
          ) : null}
        </MachineDetailView>
      ) : (
        <MachineListView
          className={styles.machineListPanel}
          labelledBy="customer-screen-title"
        >
          <div className={styles.ownerInventoryTitle}><h2>Danh sách máy</h2><span>{visibleMachines.length} máy</span><div className={styles.ownerListLinks}>
              <details className={styles.ownerRelatedMenu} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}><summary>Liên quan</summary><nav aria-label="Liên kết liên quan đến máy">
                <TextLinkButton href="/dashboard/locations">Địa điểm của tôi</TextLinkButton>
                <TextLinkButton href="/dashboard/machines/history">Lịch sử bảo trì</TextLinkButton>
                <TextLinkButton href="/dashboard/contracts">Hợp đồng của tôi</TextLinkButton>
              </nav></details>
              <ButtonBar disabled={cleaning.isFetching || cups.isFetching} onClick={refreshSummary}>Làm mới</ButtonBar>
              {isHistory ? <ButtonBar href="/dashboard/support/new">Gửi yêu cầu hỗ trợ</ButtonBar> : <ButtonBar variant="primary" href={PATH_CUSTOMER.MACHINE_NEW}>Đăng ký máy</ButtonBar>}
            </div></div>
          <div className={styles.ownerInventoryToolbar}>
            <label className={styles.ownerInventorySearch}><span className={machineStyles.visuallyHidden}>Tìm máy</span><input type="search" placeholder="Tìm serial, mẫu máy hoặc điểm bán" value={machineSearch} onChange={(event) => { setMachineSearch(event.target.value); setMachinePage(0); }} /></label>
            <label><span className={machineStyles.visuallyHidden}>Loại máy</span><select value={machineTypeFilter} onChange={(event) => { setMachineTypeFilter(event.target.value as typeof machineTypeFilter); setMachinePage(0); }}><option value="ALL">Tất cả loại máy</option><option value="SMART_IOT">Smart IoT</option><option value="CONVENTIONAL">Máy thường</option></select></label>
            <span className={styles.ownerInventoryDate}>Vệ sinh ngày {summaryDate.split("-").reverse().join("/")}</span>
          </div>
          <QueryFeedback
            loading={list.isPending}
            failed={list.isError}
            empty={Boolean(list.data && visibleMachines.length === 0)}
            emptyText={machineSearch || machineTypeFilter !== "ALL" ? "Không có máy phù hợp với bộ lọc." : messages.NO_MACHINES}
          />
              {visibleMachines.length > 0 && <div ref={heartbeatTableRef}>
                <DataTable
                  headerVariant="admin"
                  variant="accounts"
                  rows={pageMachines}
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
                    { key: "status", header: messages.FIELD_STATUS, render: (machine) => <span className={adminStyles.machinePlainStatus} data-status={machine.status ?? undefined}>{ownerMachineStatusLabel(machine.status)}</span> },
                    { key: "location", header: "Điểm bán", render: (machine) => locationName(machine.locationId) },
                    { key: "connection", header: "Kết nối", render: (machine) => {
                      if (machine.machineType !== "SMART_IOT") return <span className={machineStyles.muted}>Không áp dụng</span>;
                      const query = heartbeatByMachineId.get(machine.id);
                      const state: MachineConnectionState = query?.isError ? "error" : query?.isPending ? "loading" : query?.data?.status ?? "not-requested";
                      return <MachineConnectionBadge state={state} onRetry={query ? () => void query.refetch() : undefined} />;
                    } },
                    { key: "cleaning", header: "Vệ sinh trong ngày", render: (machine) => machine.machineType !== "SMART_IOT" ? <span className={machineStyles.muted}>Không áp dụng</span> : <div className={styles.ownerCleaningCell}>{([["startup", "Đầu ngày"], ["closing", "Cuối ngày"]] as const).map(([period, label]) => { const value = cleaningLabel(machine.id, period); return <div key={period}><span>{label}</span><span className={styles.ownerCleaningState} data-complete={value === "Hoàn tất"} title={value}><i aria-hidden="true" />{value}</span></div>; })}</div> },
                    { key: "open", header: "", render: (machine) => <ButtonBar rollingLabel href={PATH_CUSTOMER.MACHINE_DETAIL(machine.id)}>Mở hồ sơ</ButtonBar> },
                  ]}
                />
              </div>}
          <nav className={machineStyles.ownerHistoryPagination} aria-label="Phân trang máy"><span>{visibleMachines.length} máy · Trang {currentPage + 1}/{Math.max(1, Math.ceil(visibleMachines.length / 10))}</span><ButtonBar disabled={currentPage === 0} onClick={() => setMachinePage(currentPage - 1)}>Trước</ButtonBar><ButtonBar disabled={(currentPage + 1) * 10 >= visibleMachines.length} onClick={() => setMachinePage(currentPage + 1)}>Sau</ButtonBar></nav>
        </MachineListView>
      )}
    </section>
  );
}
