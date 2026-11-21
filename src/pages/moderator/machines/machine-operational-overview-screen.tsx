import { PageActions } from "@/components/action-bar/page-actions";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { MachineHealthPanel } from "@/components/machines/machine-health-panel";
import { OfflineReviewWorkflowError, offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { MachineMonitoringHeader, MachinePeriodFilter, MachineRecordsSection } from "@/components/machines/operational-overview";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { ButtonBar } from "@/components/button/button-bar";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MachineIdSchema } from "@/schema/machines.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { moderatorStyles } from "../moderator-shell";
import styles from "@/components/machines/machines.module.css";
const tabs = [{ value: "production", label: "Sản lượng" }, { value: "history", label: "Lịch sử pha" }, { value: "health", label: "Sức khỏe máy" }, { value: "cleaning", label: "Vệ sinh" }, { value: "reviews", label: "Mất kết nối" }];
export function ModeratorMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter(), subject = authScopedQuerySubject("MODERATOR");
  const ready = router.isReady && Boolean(getAuthenticatedSubjectId()) && MachineIdSchema.safeParse(machineId).success;
  const tab = router.query.tab ?? "reviews";
  const validTab = typeof tab === "string" && tabs.some((item) => item.value === tab);
  const navigate = (patch: Record<string, string | undefined>) => { const query = { ...router.query }; for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === "") delete query[key]; else query[key] = value; } void router.push({ pathname: router.pathname, query }, undefined, { shallow: true }); };
  const machine = useQuery({ queryKey: ["monitoring-machine", subject, machineId], queryFn: ({ signal }) => machinesApi.getById(machineId, signal), enabled: ready, retry: false });
  const smart = machine.isSuccess && machine.data.machineType === "SMART_IOT";
  let state: ReturnType<typeof readOfflineReviewQuery> | undefined;
  try { state = readOfflineReviewQuery(router.query, { machineId }); } catch { /* Invalid filters never enable a request. */ }
  const enabled = ready && validTab && tab === "reviews" && smart && Boolean(state);
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, state?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(state!.params, signal), enabled, retry: false });
  const detail = useQuery({ queryKey: ["offline-review", subject, state?.reviewId, machineId], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(state!.reviewId!, signal, { machineId }), enabled: enabled && Boolean(state?.reviewId), retry: false });
  return <div className={moderatorStyles.pageContent}><div className={styles.operationalOverview}>
    <PageActions actions={[{ id: "refresh", label: "Làm mới", onClick: () => { void queryClient.refetchQueries({ type: "active", predicate: (query) => query.queryKey.includes(subject) }); } }]} />
    <MachineMonitoringHeader machineLabel={machine.data?.serialNumber ?? undefined} backHref={router.query.from === "priority" ? `${PATH_MODERATOR.IOT}?view=priority` : PATH_MODERATOR.MACHINE_DETAIL(machineId)} backLabel={router.query.from === "priority" ? "Về danh sách ưu tiên" : undefined} tabs={tabs} activeTab={validTab ? tab : ""} onTabChange={(tab) => navigate({ tab, recordPage: undefined })} idPrefix="moderator-monitoring" trailing={machine.isSuccess && (tab === "production" || tab === "history" || tab === "cleaning") ? <MachinePeriodFilter query={router.query} onNavigate={navigate} /> : null} />
    {router.isReady && !MachineIdSchema.safeParse(machineId).success ? <p role="alert">Mã máy không hợp lệ.</p> : null}
    {ready && machine.isPending ? <p role="status">Đang tải hồ sơ máy…</p> : null}
    {machine.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar onClick={() => void machine.refetch()}>Thử lại</ButtonBar></div> : null}
    {!validTab || tab === "reviews" && !state ? <p role="alert">Bộ lọc rà soát không hợp lệ. <ButtonBar onClick={() => navigate({ tab: undefined, reviewId: undefined, reviewPage: undefined, reviewStatus: undefined })}>Đặt lại bộ lọc</ButtonBar></p> : machine.isSuccess ? <div id="moderator-monitoring-content" className={styles.monitoringContent} role="tabpanel" aria-labelledby={`moderator-monitoring-tab-${tab}`}>
      {tab === "health" ? smart
        ? <MachineHealthPanel showRefresh={false} key={machineId} machineId={machineId} subject={subject} canReadTelemetry={false} onOpenCleaning={() => navigate({ tab: "cleaning" })} />
        : <p className={styles.monitoringEmpty}>Đánh giá sức khỏe chỉ có cho máy Smart IoT.</p> : null}
      {tab === "health" ? null : tab === "production" || tab === "history" || tab === "cleaning" ? <MachineRecordsSection showPeriodFilter={false} showRefresh={false} key={`${subject}:${machineId}:${tab}`} subject={subject} machineId={machineId} kind={tab} query={router.query} onNavigate={navigate} /> : state ? <>
      {machine.data.machineType === "SMART_IOT" ? <OfflineReviewPanel key={machineId} showDateFilter selectedId={state?.reviewId} page={reviews.data} detail={detail.data} status={state.params.status ?? ""} machineId={machineId} canDecide loading={enabled && reviews.isPending} detailLoading={Boolean(state.reviewId) && detail.isPending} error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={detail.isError ? getApiErrorMessage(detail.error) : undefined} onFilterChange={(status) => navigate({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigate({ reviewPage: String(page), reviewId: undefined })} onSelect={(reviewId) => navigate({ reviewId })} onDecide={async (id, body, files) => { try { await offlineViolationReviewsApi.decideIfRequired(id, body, { machineId }, files); } catch (error) { throw new Error(error instanceof OfflineReviewWorkflowError ? error.message : getApiErrorMessage(error, "mutation")); } finally { await Promise.all([reviews.refetch(), detail.refetch()]); } }} /> : <p className={styles.monitoringEmpty}>Máy này chưa được xác nhận là Smart IoT để xem hồ sơ mất kết nối.</p>}
      </> : null}
    </div> : null}
  </div></div>;
}
