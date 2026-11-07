import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ownerAnalyticsApi } from "@/apis/owner-analytics.api";
import { offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { machinesApi } from "@/apis/machines.api";
import { contractsApi } from "@/apis/contracts.api";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { MachineCleaningCompliancePanel } from "@/components/machines/machine-cleaning-compliance-panel";
import { MachineMonitoringHeader } from "@/components/machines/operational-overview";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { createTelemetryRange, TelemetryHistoryPanel, type TelemetryRange } from "@/components/machines/telemetry-history-panel";
import { OwnerAnalyticsCalendarRangeSchema, OwnerBrewRecordsParamsSchema, OwnerCleaningRecordsParamsSchema, type OwnerAnalyticsContext } from "@/schema/owner-analytics.schema";
import { CleaningComplianceParamsSchema, MachineIdSchema } from "@/schema/machines.schema";
import { TelemetryPointsParamsSchema } from "@/schema/telemetry.schema";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import { MachineBrewHistoryPanel } from "./machine-brew-history-panel";
import { getVietnamToday, MachineCleaningHistoryPanel } from "./machine-cleaning-history-panel";
import styles from "@/components/machines/machines.module.css";
import shellStyles from "../customer-shell.module.css";

const tabs = [{ value: "brewing", label: "Pha chế" }, { value: "cleaning", label: "Vệ sinh" }, { value: "connection", label: "Kết nối & thông số" }] as const;
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
  const brewing = OwnerBrewRecordsParamsSchema.parse({ ...range, page: page("brewPage"), ...(recipeName ? { recipeName } : {}) });
  const cleaning = OwnerCleaningRecordsParamsSchema.parse({ ...range, page: page("cleaningPage"), ...(cleaningType ? { cleaningType } : {}), ...(cleaningStatus ? { status: cleaningStatus } : {}) });
  const telemetryFrom = scalar("telemetryFrom"), telemetryTo = scalar("telemetryTo");
  if (Boolean(telemetryFrom) !== Boolean(telemetryTo)) throw new Error("Cần chọn đủ khoảng thời gian thông số.");
  const telemetry = TelemetryPointsParamsSchema.parse(telemetryFrom ? { from: telemetryFrom, to: telemetryTo } : defaultTelemetryRange);
  return { tab: tab as Tab, fromDate, toDate, range, brewing, cleaning, complianceDays, telemetry, field: scalar("field") };
}

function AnalyticsFilters({ fromDate, toDate, tab, recipeName, cleaningType, cleaningStatus, onApply }: {
  fromDate: string; toDate: string; tab: Tab; recipeName: string; cleaningType: string; cleaningStatus: string;
  onApply: (filters: Record<string, string | undefined>) => void;
}) {
  const [draft, setDraft] = useState({ fromDate, toDate, recipeName, cleaningType, cleaningStatus });
  const [error, setError] = useState("");
  useEffect(() => { setDraft({ fromDate, toDate, recipeName, cleaningType, cleaningStatus }); setError(""); }, [fromDate, toDate, recipeName, cleaningType, cleaningStatus]);
  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!OwnerAnalyticsCalendarRangeSchema.safeParse({ fromDate: draft.fromDate, toDate: draft.toDate }).success) {
      setError("Kiểm tra lại ngày bắt đầu và ngày kết thúc."); return;
    }
    setError("");
    onApply({ fromDate: draft.fromDate, toDate: draft.toDate, ...(draft.fromDate !== fromDate || draft.toDate !== toDate ? { brewPage: undefined, cleaningPage: undefined } : {}), ...(tab === "brewing" ? { recipeName: draft.recipeName.trim() || undefined, brewPage: undefined } : { cleaningType: draft.cleaningType || undefined, cleaningStatus: draft.cleaningStatus || undefined, cleaningPage: undefined }) });
  };
  return <>
    <div className={styles.operationalQuickRanges} role="group" aria-label="Khoảng ngày xem nhanh">
      {([{ label: "Hôm nay", days: 1, offset: 0 }, { label: "Hôm qua", days: 1, offset: -1 }, { label: "7 ngày", days: 7, offset: 0 }, { label: "30 ngày", days: 30, offset: 0 }]).map((preset) => {
        const end = shiftDay(getVietnamToday(), preset.offset), start = shiftDay(end, 1 - preset.days);
        return <button key={preset.label} type="button" aria-pressed={fromDate === start && toDate === end} onClick={() => onApply({ fromDate: start, toDate: end, brewPage: undefined, cleaningPage: undefined })}>{preset.label}</button>;
      })}
    </div>
    <form className={styles.ownerOperationsFilters} onSubmit={apply}>
      <label>Từ ngày<input type="date" required value={draft.fromDate} onChange={(event) => setDraft({ ...draft, fromDate: event.target.value })} /></label>
      <label>Đến ngày<input type="date" required value={draft.toDate} onChange={(event) => setDraft({ ...draft, toDate: event.target.value })} /></label>
      {tab === "brewing" ? <label>Món pha<input value={draft.recipeName} placeholder="Tất cả món" onChange={(event) => setDraft({ ...draft, recipeName: event.target.value })} /></label> : <>
        <label>Loại vệ sinh<select aria-label="Loại vệ sinh" value={draft.cleaningType} onChange={(event) => setDraft({ ...draft, cleaningType: event.target.value })}><option value="">Tất cả</option><option value="STARTUP">Đầu ngày</option><option value="CLOSING">Cuối ngày</option></select></label>
        <label>Kết quả<select aria-label="Kết quả" value={draft.cleaningStatus} onChange={(event) => setDraft({ ...draft, cleaningStatus: event.target.value })}><option value="">Tất cả</option><option value="COMPLETED">Hoàn tất</option><option value="FAILED">Chưa hoàn tất</option><option value="ABORTED">Bị gián đoạn</option></select></label>
      </>}
      <ButtonBar type="submit">Áp dụng bộ lọc</ButtonBar>
    </form>
    {error && <p className={styles.operationalOverviewErrorText} role="alert">{error}</p>}
  </>;
}

export function CustomerMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
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
  let reviewState: ReturnType<typeof readOfflineReviewQuery> | undefined;
  let reviewFilterError: string | undefined;
  try { reviewState = readOfflineReviewQuery(router.query, { machineId }); } catch { reviewFilterError = "Bộ lọc rà soát không hợp lệ. Hãy đặt lại bộ lọc để tiếp tục."; }
  const machine = useQuery({ queryKey: ["owner-machine", subject, machineId], queryFn: ({ signal }) => machinesApi.getById(machineId, signal), enabled: ready, retry: false });
  const contracts = useQuery({ queryKey: ["owner-machine-active-contract", subject, machineId], queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId, signal, "ACTIVE"), enabled: ready && machine.isSuccess, retry: false });
  const activeContract = contracts.data?.find((record) => record.machineId === machineId && record.status === "ACTIVE" && (!machine.data?.ownerId || record.ownerId === machine.data.ownerId));
  const smartIot = machine.data?.machineType === "SMART_IOT";
  const complianceEnabled = ready && machine.isSuccess && smartIot && state?.tab === "cleaning";
  const compliance = useQuery({
    queryKey: ["machine-cleaning-compliance", subject, machineId, state?.complianceDays],
    queryFn: ({ signal }) => machinesApi.getCleaningCompliance(machineId, state!.complianceDays, signal),
    enabled: complianceEnabled, retry: false, refetchOnWindowFocus: false,
  });
  const reviewsEnabled = ready && machine.isSuccess && smartIot && state?.tab === "connection" && Boolean(reviewState);
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, reviewState?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(reviewState!.params, signal), enabled: reviewsEnabled, retry: false });
  const reviewDetail = useQuery({ queryKey: ["offline-review", subject, reviewState?.reviewId, machineId], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(reviewState!.reviewId!, signal, { machineId }), enabled: reviewsEnabled && Boolean(reviewState?.reviewId), retry: false });
  const analyticsEnabled = ready && Boolean(state && smartIot && activeContract);
  const context: OwnerAnalyticsContext = { machineId, ...(machine.data?.ownerId || activeContract?.ownerId ? { ownerId: machine.data?.ownerId ?? activeContract!.ownerId } : {}), ...(machine.data?.serialNumber ? { machineSerialNumber: machine.data.serialNumber } : {}) };
  const cupCount = useQuery({ queryKey: ["owner-cup-count", subject, machineId, state?.range], queryFn: ({ signal }) => ownerAnalyticsApi.getCupCount({ ...state!.range, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "brewing", retry: false, refetchOnWindowFocus: false });
  const brew = useQuery({ queryKey: ["owner-brew-history", subject, machineId, state?.brewing], queryFn: ({ signal }) => ownerAnalyticsApi.listBrewRecords({ ...state!.brewing, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "brewing", retry: false, refetchOnWindowFocus: false });
  const cleaning = useQuery({ queryKey: ["owner-cleaning-history", subject, machineId, state?.cleaning], queryFn: ({ signal }) => ownerAnalyticsApi.listCleaningRecords({ ...state!.cleaning, machineId }, signal, context), enabled: analyticsEnabled && state?.tab === "cleaning", retry: false, refetchOnWindowFocus: false });
  const heartbeat = useQuery({ queryKey: ["owner-machine-heartbeat", subject, machineId], queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal), enabled: ready && Boolean(state?.tab === "connection" && smartIot && pageVisible), retry: false, refetchInterval: state?.tab === "connection" && pageVisible ? 5_000 : false, refetchIntervalInBackground: false });
  const points = useInfiniteQuery({
    queryKey: ["owner-machine-telemetry-points", subject, machineId, state?.telemetry.from, state?.telemetry.to],
    queryFn: ({ pageParam, signal }) => telemetryApi.listMachinePoints(machineId, state!.telemetry, pageParam, signal), initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && pages.length * TELEMETRY_POINTS_PAGE_SIZE <= 100_000 ? pages.length * TELEMETRY_POINTS_PAGE_SIZE : undefined,
    enabled: ready && Boolean(state?.tab === "connection" && smartIot && pageVisible), retry: false,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flat() ?? [], [points.data]);
  const maxDailyCups = Math.max(1, ...(cupCount.data?.dailyBreakdown.map((row) => row.cups) ?? []));
  const maxRecipeCups = Math.max(1, ...(cupCount.data?.recipeBreakdown.map((row) => row.cups) ?? []));
  const navigate = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === "") delete query[key]; else query[key] = value; }
    void router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };
  const changeTab = (tab: Tab) => navigate({ tab, ...(tab === "connection" && !router.query.telemetryFrom ? { telemetryFrom: state?.telemetry.from ?? defaultTelemetryRange.from, telemetryTo: state?.telemetry.to ?? defaultTelemetryRange.to } : {}) });
  const refresh = () => {
    if (!ready || !state) return;
    if (complianceEnabled) void compliance.refetch();
    if (state.tab === "connection" && smartIot) { void heartbeat.refetch(); void points.refetch(); if (reviewsEnabled) { void reviews.refetch(); if (reviewState?.reviewId) void reviewDetail.refetch(); } }
    else if (analyticsEnabled) { if (state.tab === "brewing") { void cupCount.refetch(); void brew.refetch(); } else void cleaning.refetch(); }
  };
  const pending = cupCount.isFetching || brew.isFetching || cleaning.isFetching || compliance.isFetching || heartbeat.isFetching || points.isFetching;

  return <div className={shellStyles.pageContent}>
    <div className={styles.operationalOverview}>
      <ButtonBar disabled={!ready || !state || pending} onClick={refresh}>Làm mới</ButtonBar>
      <MachineMonitoringHeader machineId={machineId} machineLabel={machine.data?.serialNumber ?? undefined} backHref={PATH_CUSTOMER.MACHINE_DETAIL(machineId)} tabs={tabs} activeTab={state?.tab ?? "brewing"} onTabChange={(tab) => changeTab(tab as Tab)} idPrefix="owner-operations" />
      {router.isReady && !validMachineId ? <div className={styles.operationalOverviewError} role="alert"><p>Mã máy không hợp lệ. Hãy chọn lại máy từ danh sách.</p><Link href={PATH_CUSTOMER.MACHINES}>Về danh sách máy</Link></div> : null}
      {!router.isReady || machine.isPending && ready ? <p role="status">Đang tải hồ sơ máy…</p> : null}
      {machine.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar onClick={() => void machine.refetch()}>Thử lại</ButtonBar></div> : null}
      {parsed.error && router.isReady ? <div className={styles.operationalOverviewError} role="alert"><p>{parsed.error}</p><ButtonBar onClick={() => navigate({ tab: "brewing", fromDate: today, toDate: today, brewPage: undefined, cleaningPage: undefined, recipeName: undefined, cleaningType: undefined, cleaningStatus: undefined, complianceDays: undefined, telemetryFrom: undefined, telemetryTo: undefined, field: undefined })}>Đặt lại bộ lọc</ButtonBar></div> : null}
      {state && machine.isSuccess ? <div id="owner-operations-content" className={styles.monitoringContent} role="tabpanel" aria-labelledby={`owner-operations-tab-${state.tab}`}>
        {state.tab === "cleaning" && smartIot ? <MachineCleaningCompliancePanel data={compliance.data} days={state.complianceDays} loading={compliance.isPending} refreshing={compliance.isFetching} error={compliance.isError ? getApiErrorMessage(compliance.error) : undefined} onDaysChange={(days) => navigate({ complianceDays: String(days) })} onRefresh={() => void compliance.refetch()} /> : null}
        {state.tab !== "connection" ? <>
          <section className={styles.operationalOverviewPanel} aria-label="Bộ lọc dữ liệu vận hành">
            <AnalyticsFilters fromDate={state.fromDate} toDate={state.toDate} tab={state.tab} recipeName={state.brewing.recipeName ?? ""} cleaningType={state.cleaning.cleaningType ?? ""} cleaningStatus={state.cleaning.status ?? ""} onApply={navigate} />
          </section>
          {!smartIot ? <p className={styles.operationalOverviewState}>Máy này chưa được xác nhận là Smart IoT để xem dữ liệu pha chế và vệ sinh.</p>
            : contracts.isPending ? <p role="status">Đang kiểm tra hợp đồng của máy…</p>
              : contracts.isError ? <div className={styles.operationalOverviewError} role="alert"><p>Chưa kiểm tra được phạm vi hợp đồng. {getApiErrorMessage(contracts.error)}</p><ButtonBar onClick={() => void contracts.refetch()}>Thử lại</ButtonBar></div>
                : !activeContract || cupCount.data?.activeMachineCount === 0 ? <p className={styles.operationalOverviewState}>Dữ liệu chỉ hỗ trợ máy có hợp đồng đang hiệu lực. Máy này hiện không nằm trong phạm vi dữ liệu vận hành.</p>
                  : state.tab === "brewing" ? <>
                    {cupCount.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(cupCount.error)}</p><ButtonBar onClick={() => void cupCount.refetch()}>Thử lại</ButtonBar></div>
                      : cupCount.isPending ? <p role="status">Đang tải số ly…</p>
                        : cupCount.data ? <>
                          <section className={styles.operationalMetricGrid} aria-label="Số ly của máy"><article className={styles.operationalMetricCard}><span>Số ly trong khoảng đã chọn</span><strong>{cupCount.data.totalCups.toLocaleString("vi-VN")}</strong><small>{machine.data.serialNumber ?? "Máy đang xem"}</small></article></section>
                          <section className={styles.operationalOverviewPanel} aria-labelledby="owner-daily-cups-title"><h2 id="owner-daily-cups-title">Số ly theo ngày UTC</h2><p>Các cột dùng ngày UTC; tổng số ly vẫn theo khoảng ngày Việt Nam đã chọn.</p>
                            {cupCount.data.dailyBreakdown.length ? <div className={styles.operationalDailyChart}>{cupCount.data.dailyBreakdown.map((row) => <div key={row.date} className={styles.operationalDailyChartColumn}><strong>{row.cups.toLocaleString("vi-VN")}</strong><div className={styles.operationalDailyChartTrack}><span className={styles.operationalDailyChartBar} style={{ height: `${row.cups / maxDailyCups * 100}%` }} /></div><time dateTime={row.date}>{row.date.slice(5).split("-").reverse().join("/")}</time></div>)}</div> : <p>Chưa có dữ liệu pha chế trong khoảng đã chọn.</p>}
                          </section>
                          <section className={styles.operationalOverviewPanel}><h2>Số ly theo món</h2>
                            {cupCount.data.recipeBreakdown.length ? <ul className={styles.monitoringRecipeBars} aria-label="So sánh số ly theo món">{[...cupCount.data.recipeBreakdown].sort((a, b) => b.cups - a.cups).map((row) => <li key={row.recipeName}><span>{row.recipeName}</span><div><span style={{ width: `${row.cups / maxRecipeCups * 100}%` }} /></div><strong>{row.cups.toLocaleString("vi-VN")} ly</strong></li>)}</ul> : <p className={styles.monitoringEmpty}>Chưa có dữ liệu theo món.</p>}
                          </section>
                        </> : null}
                    <MachineBrewHistoryPanel data={brew.data} loading={brew.isPending} error={brew.isError ? getApiErrorMessage(brew.error) : undefined} onRetry={() => void brew.refetch()} onPageChange={(page) => navigate({ brewPage: String(page) })} />
                  </> : <MachineCleaningHistoryPanel data={cleaning.data} loading={cleaning.isPending} error={cleaning.isError ? getApiErrorMessage(cleaning.error) : undefined} onRetry={() => void cleaning.refetch()} onPageChange={(page) => navigate({ cleaningPage: String(page) })} />}
        </> : smartIot ? <>
          <MachineHeartbeatPanel title="Kết nối & sức khỏe máy" heartbeat={heartbeat.data} loading={heartbeat.isPending} error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined} onRetry={() => void heartbeat.refetch()} />
          <SmartIotPanel title="Lịch sử thông số"><TelemetryHistoryPanel range={state.telemetry} onRangeChange={(range) => navigate({ telemetryFrom: range.from, telemetryTo: range.to })} selectedField={state.field} onFieldChange={(field) => navigate({ field })} points={telemetryPoints} loading={points.isPending} error={points.isError ? getApiErrorMessage(points.error) : undefined} onRetry={() => void points.refetch()} hasMore={points.hasNextPage} loadingMore={points.isFetchingNextPage} onLoadMore={() => void points.fetchNextPage()} /></SmartIotPanel>
          {reviewFilterError ? <div className={styles.operationalOverviewError} role="alert"><p>{reviewFilterError}</p><ButtonBar onClick={() => navigate({ reviewId: undefined, reviewStatus: undefined, reviewPage: undefined, machineId: undefined })}>Đặt lại bộ lọc rà soát</ButtonBar></div> : <OfflineReviewPanel
            page={reviews.data} detail={reviewDetail.data} status={reviewState?.params.status ?? ""} machineId={machineId} canDecide={false}
            loading={reviewsEnabled && reviews.isPending} detailLoading={Boolean(reviewState?.reviewId) && reviewDetail.isPending}
            error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={reviewDetail.isError ? getApiErrorMessage(reviewDetail.error) : undefined}
            onFilterChange={(status) => navigate({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigate({ reviewPage: String(page), reviewId: undefined })} onSelect={(id) => navigate({ reviewId: id })}
            onRefresh={() => { if (reviewsEnabled) { void reviews.refetch(); if (reviewState?.reviewId) void reviewDetail.refetch(); } }}
          />}
        </> : <p className={styles.operationalOverviewState}>{machine.data.machineType === "CONVENTIONAL" ? "Máy thường không có dữ liệu kết nối và thông số IoT." : "Chưa xác nhận loại máy để xem dữ liệu kết nối và thông số IoT."}</p>}
      </div> : null}
    </div>

  </div>;
}
