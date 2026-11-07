import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { OfflineReviewWorkflowError, offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { MachineMonitoringHeader } from "@/components/machines/operational-overview";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { ButtonBar } from "@/components/button/button-bar";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MachineIdSchema } from "@/schema/machines.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { moderatorStyles } from "../moderator-shell";
import styles from "@/components/machines/machines.module.css";

const tabs = [{ value: "reviews", label: "Mất kết nối" }];
export function ModeratorMachineOperationalOverviewScreen({ machineId }: { machineId: string }) {
  const router = useRouter(), subject = authScopedQuerySubject("MODERATOR");
  const ready = router.isReady && Boolean(getAuthenticatedSubjectId()) && MachineIdSchema.safeParse(machineId).success;
  const validTab = router.query.tab === undefined || router.query.tab === "reviews";
  const navigate = (patch: Record<string, string | undefined>) => { const query = { ...router.query }; for (const [key, value] of Object.entries(patch)) { if (value === undefined || value === "") delete query[key]; else query[key] = value; } void router.push({ pathname: router.pathname, query }, undefined, { shallow: true }); };
  const machine = useQuery({ queryKey: ["monitoring-machine", subject, machineId], queryFn: ({ signal }) => machinesApi.getById(machineId, signal), enabled: ready, retry: false });
  let state: ReturnType<typeof readOfflineReviewQuery> | undefined;
  try { state = readOfflineReviewQuery(router.query, { machineId }); } catch { /* Invalid filters never enable a request. */ }
  const enabled = ready && validTab && machine.isSuccess && machine.data.machineType === "SMART_IOT" && Boolean(state);
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, state?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(state!.params, signal), enabled, retry: false });
  const detail = useQuery({ queryKey: ["offline-review", subject, state?.reviewId, machineId], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(state!.reviewId!, signal, { machineId }), enabled: enabled && Boolean(state?.reviewId), retry: false });
  return <div className={moderatorStyles.pageContent}><div className={styles.operationalOverview}>
    <MachineMonitoringHeader machineId={machineId} machineLabel={machine.data?.serialNumber ?? undefined} backHref={PATH_MODERATOR.MACHINE_DETAIL(machineId)} tabs={tabs} activeTab={validTab ? "reviews" : ""} onTabChange={() => navigate({ tab: "reviews" })} idPrefix="moderator-monitoring" />
    {router.isReady && !MachineIdSchema.safeParse(machineId).success ? <p role="alert">Mã máy không hợp lệ.</p> : null}
    {ready && machine.isPending ? <p role="status">Đang tải hồ sơ máy…</p> : null}
    {machine.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(machine.error)}</p><ButtonBar onClick={() => void machine.refetch()}>Thử lại</ButtonBar></div> : null}
    {!validTab || !state ? <p role="alert">Bộ lọc rà soát không hợp lệ. <ButtonBar onClick={() => navigate({ tab: undefined, reviewId: undefined, reviewPage: undefined, reviewStatus: undefined })}>Đặt lại bộ lọc</ButtonBar></p> : machine.isSuccess ? <div id="moderator-monitoring-content" className={styles.monitoringContent} role="tabpanel" aria-labelledby="moderator-monitoring-tab-reviews">
      <p className={styles.telemetryRangeCaption}>Theo dõi và xử lý các lần mất kết nối của máy này.</p>
      {machine.data.machineType === "SMART_IOT" ? <OfflineReviewPanel page={reviews.data} detail={detail.data} status={state.params.status ?? ""} machineId={machineId} canDecide loading={enabled && reviews.isPending} detailLoading={Boolean(state.reviewId) && detail.isPending} error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={detail.isError ? getApiErrorMessage(detail.error) : undefined} onFilterChange={(status) => navigate({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigate({ reviewPage: String(page), reviewId: undefined })} onSelect={(reviewId) => navigate({ reviewId })} onRefresh={() => { if (enabled) { void reviews.refetch(); if (state?.reviewId) void detail.refetch(); } }} onDecide={async (id, body) => { try { await offlineViolationReviewsApi.decideIfRequired(id, body, { machineId }); } catch (error) { throw new Error(error instanceof OfflineReviewWorkflowError ? error.message : getApiErrorMessage(error, "mutation")); } finally { await Promise.all([reviews.refetch(), detail.refetch()]); } }} /> : <p className={styles.monitoringEmpty}>Máy này chưa được xác nhận là Smart IoT để xem hồ sơ mất kết nối.</p>}
    </div> : null}
  </div><ActionBarConfig><ButtonBar href={PATH_MODERATOR.MACHINE_DETAIL(machineId)}>Về hồ sơ máy</ButtonBar></ActionBarConfig></div>;
}
