import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { offlineViolationReviewsApi, readOfflineReviewQuery, OfflineReviewWorkflowError } from "@/apis/offline-violation-reviews.api";
import { MachineMonitoringHeader, MachineRecordsSection } from "@/components/machines/operational-overview";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { MachineCleaningCompliancePanel } from "@/components/machines/machine-cleaning-compliance-panel";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { createTelemetryRange, TelemetryHistoryPanel } from "@/components/machines/telemetry-history-panel";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { CleaningComplianceParamsSchema, MachineIdSchema } from "@/schema/machines.schema";
import { TelemetryPointsParamsSchema } from "@/schema/telemetry.schema";
import { PATH_ADMIN } from "@/routes/path";
import { AdminShell, adminStyles } from "../admin-shell";
import styles from "@/components/machines/machines.module.css";

const tabs = [{ value: "production", label: "Sản lượng" }, { value: "history", label: "Lịch sử pha" }, { value: "connection", label: "Kết nối & thông số" }, { value: "cleaning", label: "Vệ sinh" }, { value: "reviews", label: "Mất kết nối" }];

export function AdminMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const router = useRouter(), subject = authScopedQuerySubject("ADMIN"), visible = usePageVisibility();
  const [defaultRange] = useState(() => createTelemetryRange("24h"));
  const ready = router.isReady && Boolean(getAuthenticatedSubjectId()) && MachineIdSchema.safeParse(machineId).success;
  const tab = router.query.tab === undefined ? "connection" : router.query.tab;
  const validTab = typeof tab === "string" && tabs.some((item) => item.value === tab);
  const navigate = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === "") delete query[key]; else query[key] = value; }
    void router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };
  const range = useMemo(() => {
    const from = router.query.telemetryFrom, to = router.query.telemetryTo;
    if ((from !== undefined || to !== undefined) && (typeof from !== "string" || typeof to !== "string")) return null;
    const parsed = TelemetryPointsParamsSchema.safeParse(from && to ? { from, to } : from !== undefined || to !== undefined ? {} : defaultRange);
    return parsed.success ? parsed.data : null;
  }, [router.query.telemetryFrom, router.query.telemetryTo, defaultRange]);
  const machine = useQuery({ queryKey: ["monitoring-machine", subject, machineId], queryFn: ({ signal }) => machinesApi.getById(machineId, signal), enabled: ready, retry: false });
  const smart = machine.isSuccess && machine.data.machineType === "SMART_IOT";
  const daysInput = router.query.complianceDays;
  const complianceParams = CleaningComplianceParamsSchema.safeParse({ days: daysInput === undefined ? 30 : typeof daysInput === "string" && /^\d+$/.test(daysInput) ? Number(daysInput) : NaN });
  const complianceDays = complianceParams.success ? complianceParams.data.days : 30;
  const complianceEnabled = ready && tab === "cleaning" && smart && complianceParams.success;
  const compliance = useQuery({
    queryKey: ["machine-cleaning-compliance", subject, machineId, complianceDays],
    queryFn: ({ signal }) => machinesApi.getCleaningCompliance(machineId, complianceDays, signal),
    enabled: complianceEnabled, retry: false, refetchOnWindowFocus: false,
  });
  const connectionEnabled = ready && validTab && tab === "connection" && smart && visible;
  const heartbeat = useQuery({ queryKey: ["monitoring-heartbeat", subject, machineId], queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal), enabled: connectionEnabled, retry: false, refetchInterval: connectionEnabled ? 5_000 : false, refetchIntervalInBackground: false });
  const points = useInfiniteQuery({ queryKey: ["monitoring-points", subject, machineId, range?.from, range?.to], queryFn: ({ signal, pageParam }) => telemetryApi.listMachinePoints(machineId, range!, pageParam, signal), enabled: connectionEnabled && Boolean(range), initialPageParam: 0, getNextPageParam: (lastPage, pages) => lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && pages.length * TELEMETRY_POINTS_PAGE_SIZE <= 100_000 ? pages.length * TELEMETRY_POINTS_PAGE_SIZE : undefined, retry: false });
  const telemetryPoints = useMemo(() => points.data?.pages.flat() ?? [], [points.data]);
  let reviewState: ReturnType<typeof readOfflineReviewQuery> | undefined;
  try { reviewState = readOfflineReviewQuery(router.query, { machineId }); } catch { /* Invalid URL filters are displayed below; no API request is enabled. */ }
  const reviewEnabled = ready && validTab && tab === "reviews" && smart && Boolean(reviewState);
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, reviewState?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(reviewState!.params, signal), enabled: reviewEnabled, retry: false });
  const detail = useQuery({ queryKey: ["offline-review", subject, reviewState?.reviewId, machineId], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(reviewState!.reviewId!, signal, { machineId }), enabled: reviewEnabled && Boolean(reviewState?.reviewId), retry: false });

  return <AdminShell><div className={adminStyles.pageContent}><div className={styles.operationalOverview}>
    <MachineMonitoringHeader machineId={machineId} machineLabel={machine.data?.serialNumber ?? undefined} backHref={PATH_ADMIN.MACHINE_DETAIL(machineId)} tabs={tabs} activeTab={typeof tab === "string" ? tab : ""} onTabChange={(tab) => navigate({ tab, recordPage: undefined })} idPrefix="admin-monitoring" />
    {router.isReady && !MachineIdSchema.safeParse(machineId).success ? <p role="alert">Mã máy không hợp lệ.</p> : null}
    {machine.isPending && ready ? <p role="status">Đang tải hồ sơ máy…</p> : null}
    {machine.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar onClick={() => void machine.refetch()}>Thử lại</ButtonBar></div> : null}
    {!validTab ? <p role="alert">Mục dữ liệu không hợp lệ. <ButtonBar onClick={() => navigate({ tab: undefined })}>Đặt lại</ButtonBar></p> : null}
    {validTab && machine.isSuccess ? <div id="admin-monitoring-content" className={styles.monitoringContent} role="tabpanel" aria-labelledby={"admin-monitoring-tab-" + tab}>
      {tab === "production" || tab === "history" || tab === "cleaning" ? <MachineRecordsSection key={`${subject}:${machineId}:${tab}`} subject={subject} machineId={machineId} kind={tab} query={router.query} onNavigate={navigate} /> : null}
      {!smart ? tab === "connection" || tab === "reviews" ? <p className={styles.monitoringEmpty}>Máy này chưa được xác nhận là Smart IoT để xem dữ liệu kết nối.</p> : null : tab === "production" || tab === "history" ? null : tab === "connection" ? <>
        <MachineHeartbeatPanel title="Kết nối & sức khỏe máy" heartbeat={heartbeat.data} loading={heartbeat.isPending} error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined} onRetry={() => void heartbeat.refetch()} />
        <SmartIotPanel title="Lịch sử thông số">{range ? <TelemetryHistoryPanel range={range} onRangeChange={(range) => navigate({ telemetryFrom: range.from, telemetryTo: range.to })} selectedField={typeof router.query.field === "string" ? router.query.field : ""} onFieldChange={(field) => navigate({ field })} points={telemetryPoints} loading={points.isPending} error={points.isError ? getApiErrorMessage(points.error) : undefined} onRetry={() => void points.refetch()} hasMore={points.hasNextPage} loadingMore={points.isFetchingNextPage} onLoadMore={() => void points.fetchNextPage()} /> : <p role="alert">Khoảng thời gian không hợp lệ. <ButtonBar onClick={() => navigate({ telemetryFrom: undefined, telemetryTo: undefined })}>Đặt lại khoảng thời gian</ButtonBar></p>}</SmartIotPanel>
      </> : tab === "cleaning" ? complianceParams.success ? <MachineCleaningCompliancePanel data={compliance.data} days={complianceDays} loading={compliance.isPending} refreshing={compliance.isFetching} error={compliance.isError ? getApiErrorMessage(compliance.error) : undefined} onDaysChange={(days) => navigate({ complianceDays: String(days) })} onRefresh={() => void compliance.refetch()} /> : <p role="alert">Khoảng đánh giá vệ sinh không hợp lệ. <ButtonBar onClick={() => navigate({ complianceDays: undefined })}>Đặt lại khoảng đánh giá</ButtonBar></p> : reviewState ? <OfflineReviewPanel selectedId={reviewState?.reviewId} page={reviews.data} detail={detail.data} status={reviewState.params.status ?? ""} machineId={machineId} canDecide loading={reviewEnabled && reviews.isPending} detailLoading={Boolean(reviewState.reviewId) && detail.isPending} error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={detail.isError ? getApiErrorMessage(detail.error) : undefined} onFilterChange={(status) => navigate({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigate({ reviewPage: String(page), reviewId: undefined })} onSelect={(reviewId) => navigate({ reviewId })} onRefresh={() => { if (reviewEnabled) { void reviews.refetch(); if (reviewState?.reviewId) void detail.refetch(); } }} onDecide={async (id, body, files) => { try { await offlineViolationReviewsApi.decideIfRequired(id, body, { machineId }, files); } catch (error) { throw new Error(error instanceof OfflineReviewWorkflowError ? error.message : getApiErrorMessage(error, "mutation")); } finally { await Promise.all([reviews.refetch(), detail.refetch()]); } }} /> : <p role="alert">Bộ lọc rà soát không hợp lệ. <ButtonBar onClick={() => navigate({ reviewStatus: undefined, reviewPage: undefined, reviewId: undefined })}>Đặt lại bộ lọc</ButtonBar></p>}
    </div> : null}
  </div></div><PageActions actions={[{ id: "operations-reports", label: "Báo cáo tổng hợp", variant: "secondary", href: PATH_ADMIN.REPORTS }]} /></AdminShell>;
}
