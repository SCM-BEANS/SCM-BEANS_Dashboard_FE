import { telemetryApi } from "@/apis/telemetry.api";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { staggerHeartbeatRequest, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { adminStyles } from "@/pages/admin/admin-shell";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { OfflineReviewWorkflowError, offlineViolationReviewsApi, readOfflineReviewQuery } from "@/apis/offline-violation-reviews.api";
import { MACHINE_STATUS_LABELS } from "@/components/machines/machine-status-labels";
import { OfflineReviewPanel } from "@/components/machines/offline-review-panel";
import { ButtonBar } from "@/components/button/button-bar";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";

import { locationsApi } from "@/apis/locations.api";

import { machinesApi } from "@/apis/machines.api";

import { PATH_MODERATOR } from "@/routes/path";
import machineStyles from "@/components/machines/machines.module.css";

import { profilesApi } from "@/apis/profiles.api";

import { MachineIdSchema } from "@/schema/machines.schema";

import { type Profile } from "@/schema/profiles.schema";
import { type Location } from "@/schema/locations.schema";


import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

function QueryFeedback({
  query,
  loadingMessage,
  errorMessage,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  loadingMessage: string;
  errorMessage?: string;
}) {
  if (query.isPending) return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>{messages.RETRY}</button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return <ModeratorPageHeading title={title} description={description} />;
}

type OwnerReadBatch<T> = {
  records: Array<{ owner: Profile; record: T }>;
  failedOwners: Array<{ owner: Profile; error: unknown }>;
};

async function listModeratorOwners(signal: AbortSignal): Promise<Profile[]> {
  const firstPage = await profilesApi.list({ role: "OWNER", page: 0, size: 100 }, signal);
  const pages = [firstPage];
  for (let page = 1; page < firstPage.totalPages; page += 5) {
    const pageNumbers = Array.from(
      { length: Math.min(5, firstPage.totalPages - page) },
      (_, offset) => page + offset,
    );
    pages.push(...await Promise.all(pageNumbers.map((pageNumber) =>
      profilesApi.list({ role: "OWNER", page: pageNumber, size: 100 }, signal),
    )));
  }
  return pages.flatMap((page) => page.items);
}

async function readOwnerRecords<T>(
  owners: Profile[],
  signal: AbortSignal,
  read: (ownerId: string, signal: AbortSignal) => Promise<T[]>,
): Promise<OwnerReadBatch<T>> {
  const results: Array<{ owner: Profile; records: T[] } | { owner: Profile; error: unknown } | undefined> = new Array(owners.length);
  let nextIndex = 0;
  const workerCount = Math.min(5, owners.length);
  const worker = async () => {
    while (!signal.aborted) {
      const index = nextIndex++;
      if (index >= owners.length) return;
      const owner = owners[index]!;
      try {
        results[index] = { owner, records: await read(owner.idaasUserId, signal) };
      } catch (error) {
        if (signal.aborted) throw error;
        results[index] = { owner, error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (signal.aborted) throw new DOMException("The request was cancelled", "AbortError");
  const records: OwnerReadBatch<T>["records"] = [];
  const failedOwners: OwnerReadBatch<T>["failedOwners"] = [];
  for (const result of results) {
    if (!result) continue;
    if ("error" in result) failedOwners.push(result);
    else for (const record of result.records) records.push({ owner: result.owner, record });
  }
  return { records, failedOwners };
}

function OwnerPartialFailure({
  failedOwners,
  retry,
  subject,
}: {
  failedOwners: Array<{ owner: Profile; error: unknown }>;
  retry: () => unknown;
  subject: string;
}) {
  if (failedOwners.length === 0) return null;
  return (
    <div className={styles.partialNotice} role="alert">
      <p>{messages.PARTIAL_OWNER_FAILURE}</p>
      <ul>{failedOwners.map(({ owner, error }) => <li key={owner.idaasUserId}>{owner.fullName || owner.email || owner.idaasUserId}: {subject} — {getApiErrorMessage(error)}</li>)}</ul>
      <button className={styles.retryButton} type="button" onClick={() => void retry()}>{messages.RETRY}</button>
    </div>
  );
}

function LocationTable({ records, failed }: { records: OwnerReadBatch<Awaited<ReturnType<typeof locationsApi.listByOwner>>[number]>["records"]; failed: boolean }) {
  return (
    <DataTable
      variant="moderator"
      headers={[messages.LOCATION_OWNER, messages.LOCATION_NAME, messages.LOCATION_ADDRESS, messages.LOCATION_CITY, messages.LOCATION_STATUS, messages.LOCATION_MACHINE_COUNT, messages.LOCATION_ACTION]}
      emptyMessage={failed ? undefined : messages.OWNER_LOCATION_EMPTY}
      minWidth={780}
    >
      {records.map(({ owner, record }) => <LocationRow key={`${owner.idaasUserId}-${record.id}`} owner={owner} location={record} />)}
    </DataTable>
  );
}

function LocationRow({ owner, location }: { owner: Profile; location: Location }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [address, setAddress] = useState(location.address ?? "");
  const [city, setCity] = useState(location.city ?? "");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: () => locationsApi.update(location.id, { name, address, city }),
    onMutate: () => { setError(null); setSuccess(false); },
    onSuccess: async () => {
      setEditing(false);
      setSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "locations-by-owner"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "locations"] }),
      ]);
    },
    onError: (requestError) => setError(getApiErrorMessage(requestError)),
  });

  return <>
    <tr>
      <td>{owner.fullName || owner.email || owner.idaasUserId}</td>
      <td>{location.name}</td>
      <td>{location.address ?? "—"}</td>
      <td>{location.city ?? "—"}</td>
      <td>{location.active == null ? messages.LOCATION_UNKNOWN_STATUS : location.active ? messages.LOCATION_ACTIVE : messages.LOCATION_INACTIVE}</td>
      <td>{location.machineCount == null ? "—" : numberFormat.format(location.machineCount)}</td>
      <td>
        <button className={styles.retryButton} type="button" onClick={() => setEditing((current) => !current)}>
          {editing ? messages.LOCATION_CANCEL : messages.LOCATION_EDIT}
        </button>
        {success && <p role="status">{messages.LOCATION_UPDATE_SUCCESS}</p>}
      </td>
    </tr>
    {editing && (
      <tr>
        <td colSpan={7}>
          <form onSubmit={(event) => { event.preventDefault(); update.mutate(); }} style={{ display: "grid", gap: 8, padding: 12 }}>
            <label htmlFor={`moderator-location-name-${location.id}`}>{messages.LOCATION_NAME}</label>
            <input id={`moderator-location-name-${location.id}`} value={name} required maxLength={160} disabled={update.isPending} onChange={(event) => setName(event.target.value)} />
            <label htmlFor={`moderator-location-address-${location.id}`}>{messages.LOCATION_ADDRESS}</label>
            <input id={`moderator-location-address-${location.id}`} value={address} disabled={update.isPending} onChange={(event) => setAddress(event.target.value)} />
            <label htmlFor={`moderator-location-city-${location.id}`}>{messages.LOCATION_CITY}</label>
            <input id={`moderator-location-city-${location.id}`} value={city} disabled={update.isPending} onChange={(event) => setCity(event.target.value)} />
            <button className={styles.retryButton} type="submit" disabled={update.isPending || !name.trim()}>
              {update.isPending ? messages.LOCATION_UPDATING : messages.LOCATION_SAVE}
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        </td>
      </tr>
    )}
  </>;
}

export function ModeratorIoTScreen({ path }: { path: string }) {
  const router = useRouter();
  const subject = authScopedQuerySubject("MODERATOR");
  const isLocationsView = path === "iot/customer";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const isPageVisible = usePageVisibility();
  const owners = useQuery({
    queryKey: ["dolores", "moderator", "owner-profiles"],
    queryFn: ({ signal }) => listModeratorOwners(signal),
    enabled: isLocationsView,
    retry: false,
  });
  const ownerIds = owners.data?.map((owner) => owner.idaasUserId) ?? [];
  const locationBatch = useQuery({
    queryKey: ["dolores", "moderator", "locations-by-owner", ownerIds],
    queryFn: ({ signal }) => readOwnerRecords(owners.data ?? [], signal, (id, requestSignal) => locationsApi.listByOwner(id, requestSignal)),
    enabled: isLocationsView && !owners.isPending && !owners.isError,
    retry: false,
  });
  const inventory = useQuery({
    queryKey: ["dolores", "machines", subject],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isLocationsView,
    retry: false,
  });
  const selectedMachineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validSelectedId = MachineIdSchema.safeParse(selectedMachineId).success;
  const reviewView = router.query.view === "reviews" || Boolean(selectedMachineId) || typeof router.query.reviewId === "string" || typeof router.query.reviewStatus === "string";
  const selectedMachine = useQuery({
    queryKey: ["dolores", "machines", "id", subject, selectedMachineId],
    queryFn: ({ signal }) => machinesApi.getById(selectedMachineId, signal),
    enabled: !isLocationsView && Boolean(selectedMachineId) && validSelectedId,
    retry: false,
  });
  let reviewState: ReturnType<typeof readOfflineReviewQuery> | undefined;
  let reviewFilterError: string | undefined;
  try { reviewState = readOfflineReviewQuery(router.query); } catch { reviewFilterError = "Bộ lọc rà soát không hợp lệ. Hãy đặt lại bộ lọc để tiếp tục."; }
  const reviewContext = reviewState?.params.machineId ? { machineId: reviewState.params.machineId } : {};
  const reviewsEnabled = !isLocationsView && router.isReady && Boolean(getAuthenticatedSubjectId()) && Boolean(reviewState) && reviewView;
  const reviews = useQuery({ queryKey: ["offline-reviews", subject, reviewState?.params], queryFn: ({ signal }) => offlineViolationReviewsApi.listPage(reviewState!.params, signal), enabled: reviewsEnabled, retry: false });
  const reviewDetail = useQuery({ queryKey: ["offline-review", subject, reviewState?.reviewId, reviewContext], queryFn: ({ signal }) => offlineViolationReviewsApi.getById(reviewState!.reviewId!, signal, reviewContext), enabled: reviewsEnabled && Boolean(reviewState?.reviewId), retry: false });
  const navigateReview = (patch: Record<string, string | undefined>) => {
    const query = { ...router.query };
    for (const [key, value] of Object.entries(patch)) { if (!value) delete query[key]; else query[key] = value; }
    void router.push({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const smartMachines = inventory.data?.filter((machine) => machine.machineType === "SMART_IOT") ?? [];
  const filtered = smartMachines.filter((machine) => !search || (machine.serialNumber ?? "").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 10) - 1));
  const rows = filtered.slice(currentPage * 10, currentPage * 10 + 10);
  const heartbeats = useQueries({ queries: rows.map((machine, index) => ({
    queryKey: ["dolores", "moderator", "telemetry", "heartbeat", subject, machine.id],
    queryFn: async ({ signal }) => { await staggerHeartbeatRequest(index, signal); return telemetryApi.getLatestHeartbeat(machine.id, signal); },
    enabled: !isLocationsView && !reviewView && isPageVisible && Boolean(getAuthenticatedSubjectId()),
    retry: false, staleTime: 3_000, refetchInterval: (query: { state: { error: unknown } }) => isPageVisible && !query.state.error ? 5_000 : false, refetchIntervalInBackground: false,
  })) });
  if (isLocationsView) {
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.LOCATIONS_TITLE} description={messages.OWNER_LOCATIONS_DESCRIPTION} />
        <QueryFeedback query={owners} loadingMessage={messages.LOADING_OWNERS} />
        {owners.data && !owners.isError && <>
          <QueryFeedback query={locationBatch} loadingMessage={messages.OWNER_LOCATION_LOADING} />
          {locationBatch.data && <>
            <OwnerPartialFailure failedOwners={locationBatch.data.failedOwners} retry={locationBatch.refetch} subject={messages.OWNER_LOCATION_FAILURE} />
            {!locationBatch.isError && <LocationTable records={locationBatch.data.records} failed={locationBatch.data.failedOwners.length > 0} />}
          </>}
        </>}
      </div>
    );
  }


  return <div className={styles.pageContent}>
    <PageHeading title="Giám sát máy" description="Chọn máy để xem các lần mất kết nối và theo dõi xử lý." />
    <div className={machineStyles.ownerOperationsTabs} role="group" aria-label="Phạm vi giám sát"><button type="button" aria-pressed={!reviewView} onClick={() => navigateReview({ view: "machines", machineId: undefined, reviewId: undefined, reviewStatus: undefined, reviewPage: undefined })}>Máy Smart IoT</button><button type="button" aria-pressed={reviewView} onClick={() => navigateReview({ view: "reviews" })}>Mất kết nối</button></div>
    <QueryFeedback query={inventory} loadingMessage={messages.LOADING_MACHINES} />
    {!reviewView && inventory.isSuccess ? <section className={styles.formPanel}>
      <div className={machineStyles.operationalOverviewPanelHeading}><h2>Máy Smart IoT</h2><ButtonBar disabled={inventory.isFetching} onClick={() => void inventory.refetch()}>Làm mới</ButtonBar></div>
      <label className={adminStyles.machineSearch}>Tìm máy<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Tìm serial máy" /></label>
      <DataTable variant="accounts" headerVariant="admin" rows={rows} rowKey={(machine) => machine.id} emptyMessage="Chưa có máy Smart IoT trong danh sách." columns={[
        { key: "serial", header: "Máy", render: (machine) => <Link className={machineStyles.ownerMachineLink} href={PATH_MODERATOR.MACHINE_OPERATIONAL_OVERVIEW(machine.id)}>{machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()}</Link> },
        { key: "status", header: "Trạng thái triển khai", render: (machine) => machine.status ? <span className={adminStyles.machinePlainStatus} data-status={machine.status}>{MACHINE_STATUS_LABELS[machine.status] ?? machine.status}</span> : "—" },
        { key: "connection", header: "Kết nối", render: (machine) => { const result = heartbeats[rows.findIndex((item) => item.id === machine.id)]; return <MachineConnectionBadge state={result?.isError ? "error" : result?.isPending ? "loading" : result?.data?.status ?? "not-requested"} onRetry={result ? () => void result.refetch() : undefined} />; } },
        { key: "profile", header: "", render: (machine) => <ButtonBar rollingLabel href={PATH_MODERATOR.MACHINE_DETAIL(machine.id)}>Xem hồ sơ</ButtonBar> },
        { key: "open", header: "Giám sát", render: (machine) => <ButtonBar rollingLabel href={PATH_MODERATOR.MACHINE_OPERATIONAL_OVERVIEW(machine.id)}>Xem vận hành</ButtonBar> },
      ]} />
      <nav className={adminStyles.machinePagination} aria-label="Phân trang giám sát"><span>{filtered.length} máy · Trang {currentPage + 1}/{Math.max(1, Math.ceil(filtered.length / 10))}</span><ButtonBar disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Trước</ButtonBar><ButtonBar disabled={(currentPage + 1) * 10 >= filtered.length} onClick={() => setPage(currentPage + 1)}>Sau</ButtonBar></nav>
    </section> : null}
    {reviewView ? <>
      {inventory.isSuccess ? <section className={styles.formPanel}><label className={styles.formField} htmlFor="moderator-iot-machine">Máy cần theo dõi<select id="moderator-iot-machine" value={selectedMachineId} onChange={(event) => navigateReview({ machineId: event.target.value, reviewId: undefined, reviewPage: undefined })}><option value="">Tất cả máy</option>{smartMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()}</option>)}</select></label>{selectedMachineId ? <QueryFeedback query={selectedMachine} loadingMessage={messages.LOADING_MACHINE} /> : null}</section> : null}
      {reviewFilterError ? <div className={styles.partialNotice} role="alert"><p>{reviewFilterError}</p><ButtonBar onClick={() => navigateReview({ machineId: undefined, reviewId: undefined, reviewPage: undefined, reviewStatus: undefined })}>Đặt lại bộ lọc rà soát</ButtonBar></div> : <OfflineReviewPanel selectedId={reviewState?.reviewId}
        machineLabels={Object.fromEntries(smartMachines.map((machine) => [machine.id, machine.serialNumber ?? machine.id.slice(0, 8).toUpperCase()]))} page={reviews.data} detail={reviewDetail.data} status={reviewState?.params.status ?? ""} machineId={reviewState?.params.machineId} canDecide
        loading={reviewsEnabled && reviews.isPending} detailLoading={Boolean(reviewState?.reviewId) && reviewDetail.isPending}
        error={reviews.isError ? getApiErrorMessage(reviews.error) : undefined} detailError={reviewDetail.isError ? getApiErrorMessage(reviewDetail.error) : undefined}
        onFilterChange={(status) => navigateReview({ reviewStatus: status, reviewPage: undefined, reviewId: undefined })} onPageChange={(page) => navigateReview({ reviewPage: String(page), reviewId: undefined })} onSelect={(id) => navigateReview({ reviewId: id })}
        onRefresh={() => { if (reviewsEnabled) { void reviews.refetch(); if (reviewState?.reviewId) void reviewDetail.refetch(); } }}
        onDecide={async (id, body, files) => { try { await offlineViolationReviewsApi.decideIfRequired(id, body, reviewContext, files); } catch (error) { throw new Error(error instanceof OfflineReviewWorkflowError ? error.message : getApiErrorMessage(error, "mutation")); } finally { await Promise.all([reviews.refetch(), reviewDetail.refetch()]); } }}
      />}
    </> : null}
  </div>;
}
