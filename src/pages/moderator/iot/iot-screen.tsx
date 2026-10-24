import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useState, type FormEvent } from "react";

import { locationsApi } from "@/apis/locations.api";

import { machinesApi } from "@/apis/machines.api";

import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";

import { tenantsApi } from "@/apis/tenants.api";

import { MachineIdSchema } from "@/schema/machines.schema";

import { type Tenant } from "@/schema/tenants.schema";

import { TelemetryPointsParamsSchema, type MachineHeartbeat, type TelemetryPoint } from "@/schema/telemetry.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

const telemetryMaxOffset = 100_000;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

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
  return <header className={styles.pageHeading}><h1>{title}</h1><p>{description}</p></header>;
}

function DetailValue({ label, value, code = false }: { label: string; value: string | number; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

type TenantReadBatch<T> = {
  records: Array<{ tenant: Tenant; record: T }>;
  failedTenants: Array<{ tenant: Tenant; error: unknown }>;
};

async function readTenantRecords<T>(
  tenants: Tenant[],
  signal: AbortSignal,
  read: (tenantId: string, signal: AbortSignal) => Promise<T[]>,
): Promise<TenantReadBatch<T>> {
  const results: Array<{ tenant: Tenant; records: T[] } | { tenant: Tenant; error: unknown } | undefined> = new Array(tenants.length);
  let nextIndex = 0;
  const workerCount = Math.min(5, tenants.length);
  const worker = async () => {
    while (!signal.aborted) {
      const index = nextIndex++;
      if (index >= tenants.length) return;
      const tenant = tenants[index]!;
      try {
        results[index] = { tenant, records: await read(tenant.id, signal) };
      } catch (error) {
        if (signal.aborted) throw error;
        results[index] = { tenant, error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (signal.aborted) throw new DOMException("The request was cancelled", "AbortError");
  const records: TenantReadBatch<T>["records"] = [];
  const failedTenants: TenantReadBatch<T>["failedTenants"] = [];
  for (const result of results) {
    if (!result) continue;
    if ("error" in result) failedTenants.push(result);
    else for (const record of result.records) records.push({ tenant: result.tenant, record });
  }
  return { records, failedTenants };
}

function TenantPartialFailure({
  failedTenants,
  retry,
  subject,
}: {
  failedTenants: Array<{ tenant: Tenant; error: unknown }>;
  retry: () => unknown;
  subject: string;
}) {
  if (failedTenants.length === 0) return null;
  return (
    <div className={styles.partialNotice} role="alert">
      <p>{messages.PARTIAL_TENANT_FAILURE}</p>
      <ul>{failedTenants.map(({ tenant, error }) => <li key={tenant.id}>{tenant.name}: {subject} — {getApiErrorMessage(error)}</li>)}</ul>
      <button className={styles.retryButton} type="button" onClick={() => void retry()}>{messages.RETRY}</button>
    </div>
  );
}

function LocationTable({ records, failed }: { records: TenantReadBatch<Awaited<ReturnType<typeof locationsApi.listByTenant>>[number]>["records"]; failed: boolean }) {
  return (
    <DataTable
      variant="moderator"
      headers={[messages.LOCATION_TENANT, messages.LOCATION_NAME, messages.LOCATION_ADDRESS, messages.LOCATION_CITY, messages.LOCATION_STATUS, messages.LOCATION_MACHINE_COUNT]}
      emptyMessage={failed ? undefined : messages.LOCATION_EMPTY}
      minWidth={780}
    >
      {records.map(({ tenant, record }) => (
        <tr key={`${tenant.id}-${record.id}`}>
          <td>{tenant.name}</td>
          <td>{record.name}</td>
          <td>{record.address ?? "—"}</td>
          <td>{record.city ?? "—"}</td>
          <td>{record.active == null ? messages.LOCATION_UNKNOWN_STATUS : record.active ? messages.LOCATION_ACTIVE : messages.LOCATION_INACTIVE}</td>
          <td>{record.machineCount == null ? "—" : numberFormat.format(record.machineCount)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

export function ModeratorIoTScreen({ path }: { path: string }) {
  const isLocationsView = path === "iot/customer";
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    enabled: isLocationsView,
    retry: false,
  });
  const tenantIds = tenants.data?.map((tenant) => tenant.id) ?? [];
  const locationBatch = useQuery({
    queryKey: ["dolores", "moderator", "locations-by-tenant", tenantIds],
    queryFn: ({ signal }) => readTenantRecords(tenants.data ?? [], signal, (id, requestSignal) => locationsApi.listByTenant(id, requestSignal)),
    enabled: isLocationsView && !tenants.isPending && !tenants.isError,
    retry: false,
  });
  const inventory = useQuery({
    queryKey: ["dolores", "machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isLocationsView,
    retry: false,
  });
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [submittedRange, setSubmittedRange] = useState<{ from: string; to: string } | null>(null);
  const [rangeError, setRangeError] = useState("");
  const validSelectedId = MachineIdSchema.safeParse(selectedMachineId).success;
  const selectedMachine = useQuery({
    queryKey: ["dolores", "machines", "id", selectedMachineId],
    queryFn: ({ signal }) => machinesApi.getById(selectedMachineId, signal),
    enabled: !isLocationsView && Boolean(selectedMachineId) && validSelectedId,
    retry: false,
  });
  const smartIotVerified = selectedMachine.data?.machineType === "SMART_IOT";
  const heartbeat = useQuery({
    queryKey: ["dolores", "telemetry", "heartbeat", selectedMachineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(selectedMachineId, signal),
    enabled: smartIotVerified,
    retry: false,
  });
  const telemetry = useInfiniteQuery({
    queryKey: ["dolores", "telemetry", "points", selectedMachineId, submittedRange],
    queryFn: ({ pageParam, signal }) => telemetryApi.listMachinePoints(selectedMachineId, submittedRange!, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && lastPageParam < telemetryMaxOffset
        ? lastPageParam + TELEMETRY_POINTS_PAGE_SIZE
        : undefined,
    enabled: smartIotVerified && submittedRange !== null,
    retry: false,
  });

  const submitRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fromDate = String(form.get("from") ?? "");
    const toDate = String(form.get("to") ?? "");
    if (!fromDate || !toDate || Number.isNaN(Date.parse(fromDate)) || Number.isNaN(Date.parse(toDate)) || fromDate > toDate) {
      setRangeError(messages.IOT_RANGE_INVALID);
      setSubmittedRange(null);
      return;
    }
    const range = {
      from: `${fromDate}T00:00:00+07:00`,
      to: `${toDate}T23:59:59+07:00`,
    };
    const parsed = TelemetryPointsParamsSchema.safeParse({ ...range, limit: TELEMETRY_POINTS_PAGE_SIZE, offset: 0 });
    if (!parsed.success) {
      setRangeError(messages.IOT_RANGE_INVALID);
      setSubmittedRange(null);
      return;
    }
    setRangeError("");
    setSubmittedRange(range);
  };

  if (isLocationsView) {
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.LOCATIONS_TITLE} description={messages.LOCATIONS_DESCRIPTION} />
        <QueryFeedback query={tenants} loadingMessage={messages.LOADING_TENANTS} />
        {tenants.data && !tenants.isError && <>
          <QueryFeedback query={locationBatch} loadingMessage={messages.LOCATION_LOADING} />
          {locationBatch.data && <>
            <TenantPartialFailure failedTenants={locationBatch.data.failedTenants} retry={locationBatch.refetch} subject={messages.TENANT_LOCATION_FAILURE} />
            {!locationBatch.isError && <LocationTable records={locationBatch.data.records} failed={locationBatch.data.failedTenants.length > 0} />}
          </>}
        </>}
      </div>
    );
  }

  const smartMachines = inventory.data?.filter((machine) => machine.machineType === "SMART_IOT") ?? [];
  const points = telemetry.data?.pages.flat() ?? [];
  return (
    <div className={styles.pageContent}>
      <PageHeading title={messages.IOT_TITLE} description={messages.IOT_DESCRIPTION} />
      <QueryFeedback query={inventory} loadingMessage={messages.LOADING_MACHINES} />
      {inventory.data && !inventory.isError && <>
        <section className={styles.formPanel}>
          <label className={styles.formField} htmlFor="moderator-iot-machine">
            {messages.IOT_SELECT_MACHINE}
            <select
              id="moderator-iot-machine"
              value={selectedMachineId}
              onChange={(event) => {
                setSelectedMachineId(event.target.value);
                setSubmittedRange(null);
                setRangeError("");
              }}
            >
              <option value="">{messages.IOT_SELECT_MACHINE_HINT}</option>
              {smartMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber ?? machine.id} · {machine.id}</option>)}
            </select>
          </label>
          {smartMachines.length === 0 && <p className={styles.formHint}>{messages.IOT_NO_SMART}</p>}
          {selectedMachineId && <QueryFeedback query={selectedMachine} loadingMessage={messages.LOADING_MACHINE} />}
          {selectedMachine.data && !selectedMachine.isError && !smartIotVerified && <p className={styles.partialNotice} role="status">{messages.IOT_NOT_SMART}</p>}
          {smartIotVerified && <>
            <section>
              <h2 className={styles.sectionTitle}>{messages.IOT_HEARTBEAT}</h2>
              <QueryFeedback query={heartbeat} loadingMessage={messages.LOADING_MACHINE} />
              {heartbeat.data && !heartbeat.isError && <HeartbeatDetails heartbeat={heartbeat.data} />}
            </section>
            <form className={styles.formPanel} onSubmit={submitRange}>
              <p className={styles.formHint}>{messages.IOT_RANGE_HINT}</p>
              <div className={styles.formRow}>
                <label className={styles.formField}>{messages.IOT_FROM_DATE}<input name="from" type="date" required /></label>
                <label className={styles.formField}>{messages.IOT_TO_DATE}<input name="to" type="date" required /></label>
              </div>
              {rangeError && <p role="alert" className={styles.partialNotice}>{rangeError}</p>}
              <button type="submit" className={styles.retryButton}>{messages.IOT_LOAD_TELEMETRY}</button>
            </form>
            {submittedRange && <section>
              <h2 className={styles.sectionTitle}>{messages.IOT_TELEMETRY}</h2>
              <p className={styles.formHint}>{formatDate(submittedRange.from)} – {formatDate(submittedRange.to)}</p>
              <QueryFeedback query={telemetry} loadingMessage={messages.LOADING_MACHINE} />
              {telemetry.data && !telemetry.isError && <>
                {points.length === 0
                  ? <p className={styles.pendingNotice} role="status">{messages.IOT_TELEMETRY_EMPTY}</p>
                  : <DataTable variant="moderator" headers={[messages.ALERT_TIME, "Field", "Value", messages.TECHNICAL_MACHINE_ID]} minWidth={680}>
                    {points.map((point, index) => <TelemetryRow key={`${point.timestamp}-${point.field}-${index}`} point={point} />)}
                  </DataTable>}
                {telemetry.hasNextPage && <button type="button" className={styles.retryButton} disabled={telemetry.isFetchingNextPage} onClick={() => void telemetry.fetchNextPage()}>{telemetry.isFetchingNextPage ? messages.IOT_LOADING_MORE : messages.IOT_LOAD_MORE}</button>}
              </>}
            </section>}
          </>}
        </section>
      </>}
    </div>
  );
}

function HeartbeatDetails({ heartbeat }: { heartbeat: MachineHeartbeat }) {
  return (
    <dl className={styles.detailGrid}>
      <DetailValue label={messages.IOT_HEARTBEAT_STATUS} value={heartbeat.status} />
      <DetailValue label={messages.IOT_LAST_SEEN} value={formatDate(heartbeat.lastSeenAt ?? heartbeat.evaluatedAt)} />
      <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={heartbeat.machineId} code />
    </dl>
  );
}

function TelemetryRow({ point }: { point: TelemetryPoint }) {
  let value: string;
  try {
    value = typeof point.value === "string" ? point.value : JSON.stringify(point.value);
  } catch {
    value = String(point.value);
  }
  return <tr><td>{formatDate(point.timestamp)}</td><td>{point.field}</td><td>{value}</td><td className={styles.codeValue}>{point.machineId}</td></tr>;
}
