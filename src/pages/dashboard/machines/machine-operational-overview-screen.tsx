import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ownerAnalyticsApi } from "@/apis/owner-analytics.api";
import { offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { machinesApi } from "@/apis/machines.api";
import { contractsApi } from "@/apis/contracts.api";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { MachineHealthPanel } from "@/components/machines/machine-health-panel";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { MachineCleaningCompliancePanel } from "@/components/machines/machine-cleaning-compliance-panel";
import { MachineMonitoringHeader, MachineProductionCharts, MachinePeriodFilter, MachineProductionSummary, MachineBrewHistoryTable, MachineCleaningHistoryTable } from "@/components/machines/operational-overview";
import { pollingInterval, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { createTelemetryRange, TelemetryHistoryPanel, TelemetryRangeFilter, type TelemetryRange } from "@/components/machines/telemetry-history-panel";
import { OwnerAnalyticsCalendarRangeSchema, OwnerBrewRecordsParamsSchema, OwnerCleaningRecordsParamsSchema, type OwnerAnalyticsContext } from "@/schema/owner-analytics.schema";
import { CleaningComplianceParamsSchema, MachineIdSchema } from "@/schema/machines.schema";
import { TelemetryPointsParamsSchema } from "@/schema/telemetry.schema";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import { getVietnamToday } from "./machine-cleaning-utils";
import styles from "@/components/machines/machines.module.css";
import shellStyles from "../customer-shell.module.css";

const tabs = [{ value: "brewing", label: "Sản lượng" }, { value: "history", label: "Lịch sử pha" }, { value: "connection", label: "Kết nối & thông số" }, { value: "health", label: "Sức khỏe máy" }, { value: "cleaning", label: "Vệ sinh" }, { value: "reviews", label: "Mất kết nối" }] as const;
type Tab = typeof tabs[number]["value"];
const shiftDay = (day: string, amount: number) => new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86_400_000).toISOString().slice(0, 10);

function readQuery(query: Record<string, string | string[] | undefined>, today: string, defaultTelemetryRange: TelemetryRange) {
  const scalar = (key: string, fallback = "") => {
    const value = query[key];
    if (value !== undefined && typeof value !== "string") throw new Error("Bộ lọc có giá trị không hợp lệ.");
    return value ?? fallback;
  };
  const page = (key: string) => {
    const value = scalar(key, "0");
    if (!/^\d+$/.test(value)) throw new Error("Số trang không hợp lệ.");
    return Number(value);
  };
  const tab = scalar("tab", "brewing");
  if (!tabs.some((item) => item.value === tab)) throw new Error("Mục dữ liệu không hợp lệ.");
  const daysInput = scalar("complianceDays", "30");
  const complianceDays = CleaningComplianceParamsSchema.parse({ days: /^\d+$/.test(daysInput) ? Number(daysInput) : NaN }).days;
  const fromDate = scalar("fromDate", shiftDay(today, -6)), toDate = scalar("toDate", today);
  const range = OwnerAnalyticsCalendarRangeSchema.parse({ fromDate, toDate });
  const recipeName = scalar("recipeName").trim(), cleaningType = scalar("cleaningType"), cleaningStatus = scalar("cleaningStatus");
  const brewing = OwnerBrewRecordsParamsSchema.parse({ ...range, size: 10, page: page("brewPage"), ...(recipeName ? { recipeName } : {}) });
  const cleaning = OwnerCleaningRecordsParamsSchema.parse({ ...range, size: 10, page: page("cleaningPage"), ...(cleaningType ? { cleaningType } : {}), ...(cleaningStatus ? { status: cleaningStatus } : {}) });
  const telemetryFrom = scalar("telemetryFrom"), telemetryTo = scalar("telemetryTo");
  if (Boolean(telemetryFrom) !== Boolean(telemetryTo)) throw new Error("Cần chọn đủ khoảng thời gian thông số.");
  const telemetry = TelemetryPointsParamsSchema.parse(telemetryFrom ? { from: telemetryFrom, to: telemetryTo } : defaultTelemetryRange);
  return { tab: tab as Tab, fromDate, toDate, range, brewing, cleaning, complianceDays, telemetry, field: scalar("field") };
}

export function CustomerMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter(), subject = authScopedQuerySubject("OWNER");
  const [today] = useState(getVietnamToday);
  const [defaultTelemetryRange] = useState(() => createTelemetryRange("24h"));
  const pageVisible = usePageVisibility();
  const validMachineId = MachineIdSchema.safeParse(machineId).success;
  const ready = router.isReady && Boolean(getAuthenticatedSubjectId()) && validMachineId;
  const parsed = useMemo(() => {
    try { return { data: readQuery(router.query, today, defaultTelemetryRange), error: "" }; }
    catch { return { data: undefined, error: "Khoảng ngày hoặc bộ lọc không hợp lệ. Hãy đặt lại bộ lọc để tiếp tục." }; }
  }, [router.query, today, defaultTelemetryRange]);
  const state = parsed.data;
  const [filterDraft, setFilterDraft] = useState({ recipeName: "", cleaningType: "", cleaningStatus: "" });
  const [filterError, setFilterError] = useState("");
  useEffect(() => {
    setFilterDraft({ recipeName: state?.brewing.recipeName ?? "", cleaningType: state?.cleaning.cleaningType ?? "", cleaningStatus: state?.cleaning.status ?? "" });
  }, [state?.brewing.recipeName, state?.cleaning.cleaningType, state?.cleaning.status]);
  let reviewState: ReturnType<typeof readOfflineReviewQuery> | undefined;
  let reviewFilterError: string | undefined;
  try { reviewState = readOfflineReviewQuery(router.query, { machineId }); } catch { reviewFilterError = "Bộ lọc rà soát không hợp lệ. Hãy đặt lại bộ lọc để tiếp tục."; }
  const machine = useQuery({ queryKey: ["owner-machine", subject, machineId], queryFn: ({ signal }) => machinesApi.getById(machineId, signal), enabled: ready, retry: false });
  const contracts = useQuery({ queryKey: ["owner-machine-active-contract", subject, machineId], queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId, signal, "ACTIVE"), enabled: ready && machine.isSuccess && state?.tab !== "health", retry: false });
  const activeContract = contracts.data?.find((record) => record.machineId === machineId && record.status === "ACTIVE" && (!machine.data?.ownerId || record.ownerId === machine.data.ownerId));
  const smartIot = machine.data?.machineType === "SMART_IOT";
  const complianceEnabled = ready && machine.isSuccess && smartIot && state?.tab === "cleaning";
  const compliance = useQuery({
    queryKey: ["machine-cleaning-compliance", subject, machineId, state?.complianceDays],
    queryFn: ({ signal }) => machinesApi.getCleaningCompliance(machineId, state!.complianceDays, signal),
    enabled: complianceEnabled, retry: false, refetchOnWindowFocus: false,
  });
  const reviewsEnabled = ready && machine.isSuccess && smartIot && state?.tab === "reviews" && Boolean(reviewState);
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, reviewState?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(reviewState!.params, signal), enabled: reviewsEnabled, retry: false });
  const reviewDetail = useQuery({ queryKey: ["offline-review", subject, reviewState?.reviewId, machineId], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(reviewState!.reviewId!, signal, { machineId }), enabled: reviewsEnabled && Boolean(reviewState?.reviewId), retry: false });
  const analyticsEnabled = ready && Boolean(state && smartIot && activeContract);
  const context: OwnerAnalyticsContext = { machineId, ...(machine.data?.ownerId || activeContract?.ownerId ? { ownerId: machine.data?.ownerId ?? activeContract!.ownerId } : {}), ...(machine.data?.serialNumber ? { machineSerialNumber: machine.data.serialNumber } : {}) };
  const cupCount = useQuery({ queryKey: ["owner-cup-count", subject, machineId, state?.range], queryFn: ({ signal }) => ownerAnalyticsApi.getCupCount({ ...state!.range, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "brewing", retry: false, refetchOnWindowFocus: false });
  const brew = useQuery({ queryKey: ["owner-brew-history", subject, machineId, state?.brewing], queryFn: ({ signal }) => ownerAnalyticsApi.listBrewRecords({ ...state!.brewing, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "history", retry: false, refetchOnWindowFocus: false });
  const cleaning = useQuery({ queryKey: ["owner-cleaning-history", subject, machineId, state?.cleaning], queryFn: ({ signal }) => ownerAnalyticsApi.listCleaningRecords({ ...state!.cleaning, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "cleaning", retry: false, refetchOnWindowFocus: false });
  const heartbeat = useQuery({ queryKey: ["owner-machine-heartbeat", subject, machineId], queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal), enabled: ready && Boolean(state?.tab === "connection" && smartIot && pageVisible), retry: false, refetchInterval: query => state?.tab === "connection" && pageVisible ? pollingInterval(query, 5_000) : false, refetchIntervalInBackground: false });
  const points = useInfiniteQuery({
    queryKey: ["owner-machine-telemetry-points", subject, machineId, state?.telemetry.from, state?.telemetry.to],
    queryFn: ({ pageParam, signal }) => telemetryApi.listMachinePoints(machineId, state!.telemetry, pageParam, signal), initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && pages.length * TELEMETRY_POINTS_PAGE_SIZE <= 100_000 ? pages.length * TELEMETRY_POINTS_PAGE_SIZE : undefined,
    enabled: ready && Boolean(state?.tab === "connection" && smartIot && pageVisible), retry: false,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flat() ?? [], [points.data]);
  const navigate = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === "") delete query[key]; else query[key] = value; }
    void router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };
  const changeTab = (tab: Tab) => navigate({ tab, ...(tab === "connection" && !router.query.telemetryFrom ? { telemetryFrom: state?.telemetry.from ?? defaultTelemetryRange.from, telemetryTo: state?.telemetry.to ?? defaultTelemetryRange.to } : {}) });


  return <div className={shellStyles.pageContent}>
    <div className={styles.operationalOverview}>
      <PageActionsRenderer actions={[{ id: "refresh", label: "Làm mới", onClick: () => { void queryClient.refetchQueries({ type: "active", predicate: (query) => query.queryKey.includes(subject) }); } }]} />
      <MachineMonitoringHeader machineLabel={machine.data?.serialNumber ?? undefined} backHref={PATH_CUSTOMER.MACHINE_DETAIL(machineId)} tabs={tabs} activeTab={state?.tab ?? "brewing"} onTabChange={(tab) => changeTab(tab as Tab)} idPrefix="owner-operations" trailing={state && machine.isSuccess && (state.tab === "brewing" || state.tab === "history" || state.tab === "cleaning") ? <MachinePeriodFilter fromDate={state.fromDate} toDate={state.toDate} error={filterError} onApply={(range) => {
              if (!OwnerAnalyticsCalendarRangeSchema.safeParse(range).success) { setFilterError("Kiểm tra lại ngày bắt đầu và ngày kết thúc."); return false; }
              setFilterError("");
              navigate({ ...range, ...(range.fromDate !== state.fromDate || range.toDate !== state.toDate ? { brewPage: undefined, cleaningPage: undefined } : {}), ...(state.tab === "history" ? { recipeName: filterDraft.recipeName.trim() || undefined, brewPage: undefined } : state.tab === "cleaning" ? { cleaningType: filterDraft.cleaningType || undefined, cleaningStatus: filterDraft.cleaningStatus || undefined, cleaningPage: undefined } : {}) });
              return true;
            }} extraFields={state.tab === "history" ? <label>Món pha<input value={filterDraft.recipeName} placeholder="Tất cả món" onChange={(event) => setFilterDraft({ ...filterDraft, recipeName: event.target.value })} /></label> : state.tab === "cleaning" ? <>
              <label>Loại vệ sinh<select aria-label="Loại vệ sinh" value={filterDraft.cleaningType} onChange={(event) => setFilterDraft({ ...filterDraft, cleaningType: event.target.value })}><option value="">Tất cả</option><option value="STARTUP">Đầu ngày</option><option value="CLOSING">Cuối ngày</option></select></label>
              <label>Kết quả<select aria-label="Kết quả" value={filterDraft.cleaningStatus} onChange={(event) => setFilterDraft({ ...filterDraft, cleaningStatus: event.target.value })}><option value="">Tất cả</option><option value="COMPLETED">Hoàn tất</option><option value="FAILED">Chưa hoàn tất</option><option value="ABORTED">Bị gián đoạn</option></select></label>
            </> : null} /> : state && machine.isSuccess && smartIot && state.tab === "connection" ? <TelemetryRangeFilter range={state.telemetry} onRangeChange={(range) => navigate({ telemetryFrom: range.from, telemetryTo: range.to })} /> : null} />
      {router.isReady && !validMachineId ? <div className={styles.operationalOverviewError} role="alert"><p>Mã máy không hợp lệ. Hãy chọn lại máy từ danh sách.</p><TextLinkButton back href={PATH_CUSTOMER.MACHINES}>Về danh sách máy</TextLinkButton></div> : null}
      {!router.isReady || machine.isPending && ready ? <p role="status">Đang tải hồ sơ máy…</p> : null}
      {machine.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar onClick={() => void machine.refetch()}>Thử lại</ButtonBar></div> : null}
      {parsed.error && router.isReady ? <div className={styles.operationalOverviewError} role="alert"><p>{parsed.error}</p><ButtonBar onClick={() => navigate({ tab: "brewing", fromDate: today, toDate: today, brewPage: undefined, cleaningPage: undefined, recipeName: undefined, cleaningType: undefined, cleaningStatus: undefined, complianceDays: undefined, telemetryFrom: undefined, telemetryTo: undefined, field: undefined })}>Đặt lại bộ lọc</ButtonBar></div> : null}
      {state && machine.isSuccess ? <div id="owner-operations-content" className={styles.monitoringContent} role="tabpanel" aria-labelledby={`owner-operations-tab-${state.tab}`}>
        {state.tab === "health" ? smartIot
          ? <MachineHealthPanel showRefresh={false} key={machineId} machineId={machineId} subject={subject} onOpenCleaning={() => navigate({ tab: "cleaning" })} />
          : <p className={styles.monitoringEmpty}>Đánh giá sức khỏe chỉ có cho máy Smart IoT.</p> : null}
        {state.tab === "health" ? null : state.tab === "reviews" ? (smartIot ? <>
          {reviewFilterError ? <div className={styles.operationalOverviewError} role="alert"><p>{reviewFilterError}</p><ButtonBar onClick={() => navigate({ reviewId: undefined, reviewStatus: undefined, reviewPage: undefined, machineId: undefined })}>Đặt lại bộ lọc rà soát</ButtonBar></div> : <OfflineReviewPanel key={machineId} showDateFilter selectedId={reviewState?.reviewId}
            page={reviews.data} detail={reviewDetail.data} status={reviewState?.params.status ?? ""} machineId={machineId} canDecide={false}
            loading={reviewsEnabled && reviews.isPending} detailLoading={Boolean(reviewState?.reviewId) && reviewDetail.isPending}
            error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={reviewDetail.isError ? getApiErrorMessage(reviewDetail.error) : undefined}
            onFilterChange={(status) => navigate({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigate({ reviewPage: String(page), reviewId: undefined })} onSelect={(id) => navigate({ reviewId: id })}
          />}
        </> : <p className={styles.monitoringEmpty}>Máy này chưa được xác nhận là Smart IoT để xem hồ sơ mất kết nối.</p>) : state.tab !== "connection" ? <>

          {!smartIot ? <p className={styles.operationalOverviewState}>Máy này chưa được xác nhận là Smart IoT để xem dữ liệu pha chế và vệ sinh.</p>
            : contracts.isPending ? <p role="status">Đang kiểm tra hợp đồng của máy…</p>
              : contracts.isError ? <div className={styles.operationalOverviewError} role="alert"><p>Chưa kiểm tra được phạm vi hợp đồng. {getApiErrorMessage(contracts.error)}</p><ButtonBar onClick={() => void contracts.refetch()}>Thử lại</ButtonBar></div>
                : !activeContract || cupCount.data?.activeMachineCount === 0 ? <p className={styles.operationalOverviewState}>Dữ liệu chỉ hỗ trợ máy có hợp đồng đang hiệu lực. Máy này hiện không nằm trong phạm vi dữ liệu vận hành.</p>
                  : state.tab === "brewing" ? <>
                    {cupCount.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(cupCount.error)}</p><ButtonBar onClick={() => void cupCount.refetch()}>Thử lại</ButtonBar></div>
                      : cupCount.isPending ? <p role="status">Đang tải số ly…</p>
                        : cupCount.data ? <>
                          <MachineProductionSummary total={cupCount.data.totalCups} rangeText={`Máy đang xem · ${state.fromDate.split("-").reverse().join("/")} – ${state.toDate.split("-").reverse().join("/")}`} />
                          <MachineProductionCharts daily={cupCount.data.dailyBreakdown.map((row) => [row.date, row.cups])} recipes={[...cupCount.data.recipeBreakdown].sort((a, b) => b.cups - a.cups).map((row) => [row.recipeName, row.cups])} />
                        </> : null}
                  </> : state.tab === "history" ? (brew.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(brew.error)}</p><ButtonBar onClick={() => void brew.refetch()}>Thử lại</ButtonBar></div> : brew.isPending ? <p role="status">Đang tải lịch sử pha chế…</p> : brew.data ? <MachineBrewHistoryTable rows={brew.data.content} total={brew.data.totalElements} page={brew.data.page} hasNext={!brew.data.last} isFetching={brew.isFetching} onPageChange={(page) => navigate({ brewPage: String(page) })} /> : null)
                  : cleaning.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(cleaning.error)}</p><ButtonBar onClick={() => void cleaning.refetch()}>Thử lại</ButtonBar></div> : cleaning.isPending ? <p role="status">Đang tải lịch sử vệ sinh…</p> : cleaning.data ? <MachineCleaningHistoryTable rows={cleaning.data.content} total={cleaning.data.totalElements} page={cleaning.data.page} hasNext={!cleaning.data.last} isFetching={cleaning.isFetching} onPageChange={(page) => navigate({ cleaningPage: String(page) })} /> : null}
        {state.tab === "cleaning" && smartIot ? <MachineCleaningCompliancePanel showRefresh={false} data={compliance.data} days={state.complianceDays} loading={compliance.isPending} refreshing={compliance.isFetching} error={compliance.isError ? getApiErrorMessage(compliance.error) : undefined} onDaysChange={(days) => navigate({ complianceDays: String(days) })} onRefresh={() => void compliance.refetch()} /> : null}
        </> : smartIot ? <>
          <MachineHeartbeatPanel title="Kết nối & thông số thiết bị" heartbeat={heartbeat.data} loading={heartbeat.isPending} error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined} onRetry={() => void heartbeat.refetch()} />
          <SmartIotPanel title="Lịch sử thông số"><TelemetryHistoryPanel showRangeFilter={false} range={state.telemetry} onRangeChange={(range) => navigate({ telemetryFrom: range.from, telemetryTo: range.to })} selectedField={state.field} onFieldChange={(field) => navigate({ field })} points={telemetryPoints} loading={points.isPending} error={points.isError ? getApiErrorMessage(points.error) : undefined} onRetry={() => void points.refetch()} hasMore={points.hasNextPage} loadingMore={points.isFetchingNextPage} onLoadMore={() => void points.fetchNextPage()} /></SmartIotPanel>

        </> : <p className={styles.operationalOverviewState}>{machine.data.machineType === "CONVENTIONAL" ? "Máy thường không có dữ liệu kết nối và thông số IoT." : "Chưa xác nhận loại máy để xem dữ liệu kết nối và thông số IoT."}</p>}
      </div> : null}
    </div>

  </div>;
}
