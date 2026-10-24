import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Children, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { locationsApi } from "@/apis/locations.api";
import { machinesApi } from "@/apis/machines.api";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { tenantsApi } from "@/apis/tenants.api";
import { PATH_MODERATOR } from "@/routes/path";
import { LocationIdSchema } from "@/schema/locations.schema";
import { MachineIdSchema, type MachineInventoryItem, type MaintenanceTicket } from "@/schema/machines.schema";
import {
  InstallationWorkOrderIdSchema,
  type InstallationWorkOrderDetails,
  type InstallationWorkOrderSummary,
} from "@/schema/installation-work-orders.schema";
import { TenantIdSchema, type Tenant } from "@/schema/tenants.schema";
import { TelemetryPointsParamsSchema, type MachineHeartbeat, type TelemetryPoint } from "@/schema/telemetry.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { API_ERROR_MESSAGES, getApiErrorMessage } from "@/lib/api-errors";
import { moderatorStyles as styles } from "./moderator-shell";

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

function ActionLink({ href, children }: { href: string; children: string }) {
  return <Link className={styles.tableLink} href={href}>{children}</Link>;
}

function DetailValue({ label, value, code = false }: { label: string; value: string | number; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

function DataTable({
  headers,
  children,
  emptyMessage,
  minWidth,
}: {
  headers: string[];
  children: ReactNode;
  emptyMessage?: string;
  minWidth?: number;
}) {
  const hasChildren = Children.count(children) > 0;
  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable} style={minWidth ? { minWidth } : undefined}>
        <thead><tr>{headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
        <tbody>{hasChildren ? children : emptyMessage ? <tr><td colSpan={headers.length}>{emptyMessage}</td></tr> : null}</tbody>
      </table>
    </div>
  );
}

const machineListPaths = new Set(["machines", "machines/list", "machines/stock", "machines/customer"]);
const machineHistoryPath = "machines/repair-history";
const unavailableMachinePaths = new Set(["machines/loans", "machines/substitute", "machines/substitute/return"]);

function getMachineDetailId(path: string): string {
  if (!path.startsWith("machines/")) return "";
  const candidate = path.slice("machines/".length);
  if (!candidate || candidate.includes("/") || machineListPaths.has(path) || unavailableMachinePaths.has(path) || path === machineHistoryPath) {
    return "";
  }
  return candidate;
}

function MachineList({
  machines,
  isStock,
  isCustomer,
  failed,
}: {
  machines: MachineInventoryItem[];
  isStock: boolean;
  isCustomer: boolean;
  failed: boolean;
}) {
  const visibleMachines = machines.filter((machine) => {
    if (isStock) return ["IN_WAREHOUSE", "PENDING_ACTIVATION", "AVAILABLE_FOR_RENT"].includes(machine.status ?? "");
    if (isCustomer) return Boolean(machine.tenantId);
    return true;
  });
  const emptyMessage = failed
    ? undefined
    : isStock
      ? messages.MACHINE_STOCK_EMPTY
      : isCustomer
        ? messages.MACHINE_CUSTOMER_EMPTY
        : messages.MACHINE_EMPTY;

  return (
    <DataTable headers={[messages.MACHINE_SERIAL, messages.TECHNICAL_MACHINE_ID, messages.MACHINE_TENANT, messages.MACHINE_TYPE, messages.MACHINE_STATUS]} emptyMessage={visibleMachines.length === 0 ? emptyMessage : undefined}>
      {visibleMachines.map((machine) => (
        <tr key={machine.id}>
          <td><ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(machine.id)}>{machine.serialNumber ?? machine.id}</ActionLink></td>
          <td className={styles.codeValue}>{machine.id}</td>
          <td className={styles.codeValue}>{machine.tenantId ?? "—"}</td>
          <td>{machine.machineType ?? "—"}</td>
          <td>{machine.status ?? "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function MaintenanceTicketTable({ tickets, machineId }: { tickets: MaintenanceTicket[]; machineId?: string }) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  return (
    <DataTable
      headers={[messages.TECHNICAL_ID, messages.TECHNICAL_MACHINE_ID, messages.TECHNICAL_STATUS, messages.TECHNICAL_DATE, messages.TECHNICAL_NOTES]}
      emptyMessage={visibleTickets.length === 0 ? messages.MACHINE_HISTORY_EMPTY : undefined}
      minWidth={760}
    >
      {visibleTickets.map((ticket, index) => (
        <tr key={ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}>
          <td className={styles.codeValue}>{ticket.id ?? "—"}</td>
          <td>{ticket.machineId
            ? <ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(ticket.machineId)}>{ticket.machineId}</ActionLink>
            : "—"}</td>
          <td>{ticket.status ?? "—"}</td>
          <td>{formatDate(ticket.startedAt ?? ticket.acknowledgedAt ?? ticket.completedAt)}</td>
          <td>{ticket.resolutionResult ?? ticket.notes ?? ticket.diagnosis ?? "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

export function ModeratorMachinesScreen({ path }: { path: string }) {
  const machineId = getMachineDetailId(path);
  const validMachineId = MachineIdSchema.safeParse(machineId).success;
  const isDetail = Boolean(machineId);
  const isHistory = path === machineHistoryPath;
  const isUnsupported = unavailableMachinePaths.has(path);
  const isStock = path === "machines/stock";
  const isCustomer = path === "machines/customer";
  const inventory = useQuery({
    queryKey: ["dolores", "machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isDetail && !isHistory && !isUnsupported,
    retry: false,
  });
  const inventorySummary = useQuery({
    queryKey: ["dolores", "inventory-summary"],
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
    enabled: !isDetail && !isHistory && !isUnsupported,
    retry: false,
  });
  const machine = useQuery({
    queryKey: ["dolores", "machines", "id", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: isDetail && validMachineId,
    retry: false,
  });
  const schedule = useQuery({
    queryKey: ["dolores", "machines", "maintenance-schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId, signal),
    enabled: isDetail && validMachineId,
    retry: false,
  });
  const shouldReadTickets = isHistory || (isDetail && validMachineId);
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets"],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets(signal),
    enabled: shouldReadTickets,
    retry: false,
  });
  const locationId = machine.data?.locationId ?? "";
  const validLocationId = LocationIdSchema.safeParse(locationId).success;
  const location = useQuery({
    queryKey: ["dolores", "locations", "id", locationId],
    queryFn: ({ signal }) => locationsApi.getById(locationId, signal),
    enabled: Boolean(locationId) && validLocationId,
    retry: false,
  });
  const locationScopeMismatch = Boolean(
    machine.data && location.data && (
      (machine.data.tenantId && location.data.tenantId && machine.data.tenantId !== location.data.tenantId) ||
      (machine.data.ownerId && location.data.ownerId && machine.data.ownerId !== location.data.ownerId)
    ),
  );

  if (isUnsupported) {
    return <div className={styles.pageContent}><PageHeading title={messages.MACHINES_TITLE} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.MACHINE_UNAVAILABLE_ACTION}</p></div>;
  }

  if (isDetail) {
    if (!validMachineId) {
      return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_DETAIL_TITLE} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{machineId}: {messages.MACHINE_LEGACY_ID}</p><ActionLink href={PATH_MODERATOR.MACHINES}>Quay lại danh sách máy</ActionLink></div>;
    }
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.MACHINE_DETAIL_TITLE} description={messages.MACHINES_DESCRIPTION} />
        <ActionLink href={PATH_MODERATOR.MACHINES}>Quay lại danh sách máy</ActionLink>
        <QueryFeedback query={machine} loadingMessage={messages.LOADING_MACHINE} />
        {machine.data && !machine.isError && (
          <>
            <dl className={styles.detailGrid}>
              <DetailValue label={messages.MACHINE_SERIAL} value={machine.data.serialNumber ?? "—"} />
              <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={machine.data.id} code />
              <DetailValue label={messages.MACHINE_TENANT} value={machine.data.tenantId ?? "—"} code />
              <DetailValue label={messages.MACHINE_TYPE} value={machine.data.machineType ?? "—"} />
              <DetailValue label={messages.MACHINE_STATUS} value={machine.data.status ?? "—"} />
              <DetailValue label={messages.MACHINE_LOCATION} value={locationScopeMismatch ? machine.data.locationId ?? "—" : location.data?.name ?? machine.data.locationId ?? "—"} />
              <DetailValue label={messages.MACHINE_DEPLOYED} value={formatDate(machine.data.deployedAt)} />
              <DetailValue label={messages.MACHINE_REGION} value={machine.data.region ?? "—"} />
            </dl>
            {locationId && (
              !validLocationId
                ? <p className={styles.pendingNotice} role="alert">{API_ERROR_MESSAGES.INVALID_RESPONSE}</p>
                : locationScopeMismatch
                  ? <p className={styles.partialNotice} role="alert">{messages.LOCATION_MACHINE_SCOPE_MISMATCH}</p>
                  : <QueryFeedback query={location} loadingMessage={messages.LOCATION_LOADING} />
            )}
            <section className={styles.pendingNotice}>
              <h2 className={styles.sectionTitle}>{messages.MACHINE_NEXT_MAINTENANCE}</h2>
              <QueryFeedback query={schedule} loadingMessage={messages.LOADING_MACHINE_SCHEDULE} />
              {schedule.data && !schedule.isError && (
                <dl className={styles.detailGrid}>
                  <DetailValue label={messages.MACHINE_NEXT_MAINTENANCE} value={formatDate(schedule.data.nextPreventiveMaintenanceAt)} />
                  <DetailValue label={messages.MACHINE_CUPS_SINCE_DESCALE} value={schedule.data.cupsServedSinceLastDescale == null ? "—" : numberFormat.format(schedule.data.cupsServedSinceLastDescale)} />
                </dl>
              )}
            </section>
            <section className={styles.pendingNotice}>
              <h2 className={styles.sectionTitle}>{messages.MACHINE_TICKETS}</h2>
              <QueryFeedback query={tickets} loadingMessage={messages.LOADING_MACHINE_TICKETS} />
              {tickets.data && !tickets.isError && (
                <>
                  <p className={styles.formHint}>{messages.MACHINE_HISTORY_SCOPE}</p>
                  <p>{tickets.data.filter((ticket) => ticket.machineId === machineId).length} {messages.MACHINE_TICKETS_FOR_ID}</p>
                  <MaintenanceTicketTable tickets={tickets.data} machineId={machineId} />
                </>
              )}
            </section>
          </>
        )}
      </div>
    );
  }

  if (isHistory) {
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} />
        <QueryFeedback query={tickets} loadingMessage={messages.LOADING_MACHINE_TICKETS} />
        {tickets.data && !tickets.isError && <MaintenanceTicketTable tickets={tickets.data} />}
      </div>
    );
  }

  const title = isStock ? "Máy trong kho" : isCustomer ? "Máy gắn với tenant" : messages.MACHINES_TITLE;
  return (
    <div className={styles.pageContent}>
      <PageHeading title={title} description={messages.MACHINES_DESCRIPTION} />
      <div className={styles.detailGrid}>
        <section className={styles.detailItem}>
          <h2 className={styles.sectionTitle}>{messages.MACHINE_INVENTORY_SUMMARY}</h2>
          <p>{messages.MACHINE_TOTAL}: {inventorySummary.data?.totalMachines == null ? "—" : numberFormat.format(inventorySummary.data.totalMachines)}</p>
          <QueryFeedback query={inventorySummary} loadingMessage={messages.LOADING_MACHINES} />
        </section>
      </div>
      <QueryFeedback query={inventory} loadingMessage={messages.LOADING_MACHINES} />
      {inventory.data && !inventory.isError && (
        <MachineList machines={inventory.data} isStock={isStock} isCustomer={isCustomer} failed={inventory.isError} />
      )}
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
                  : <DataTable headers={[messages.ALERT_TIME, "Field", "Value", messages.TECHNICAL_MACHINE_ID]} minWidth={680}>
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

function WorkOrderRows({ records }: { records: Array<{ tenant: Tenant; record: InstallationWorkOrderSummary }> }) {
  return <>
    {records.map(({ tenant, record }) => <tr key={record.id}>
      <td>{messages.TECHNICAL_WORK_ORDER}</td>
      <td><ActionLink href={PATH_MODERATOR.TECHNICAL_REQUEST_DETAIL(record.id)}>{record.id}</ActionLink></td>
      <td className={styles.codeValue}>{record.machineId}</td>
      <td>{tenant.name}</td>
      <td>{record.status}</td>
      <td>{formatDate(record.scheduledFor)}</td>
      <td>{record.failureReason ?? "—"}</td>
    </tr>)}
  </>;
}

function TicketRows({ tickets }: { tickets: MaintenanceTicket[] }) {
  return <>
    {tickets.map((ticket, index) => <tr key={ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}>
      <td>{messages.TECHNICAL_TICKET}</td>
      <td className={styles.codeValue}>{ticket.id ?? "—"}</td>
      <td>{ticket.machineId
        ? <ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(ticket.machineId)}>{ticket.machineId}</ActionLink>
        : "—"}</td>
      <td className={styles.codeValue}>{ticket.tenantId ?? "—"}</td>
      <td>{ticket.status ?? "—"}</td>
      <td>{formatDate(ticket.startedAt ?? ticket.acknowledgedAt ?? ticket.completedAt)}</td>
      <td>{ticket.resolutionResult ?? ticket.notes ?? ticket.diagnosis ?? "—"}</td>
    </tr>)}
  </>;
}

function WorkOrderDetail({ details }: { details: InstallationWorkOrderDetails }) {
  const workOrder = details.workOrder;
  return <>
    <dl className={styles.detailGrid}>
      <DetailValue label={messages.TECHNICAL_ID} value={workOrder.id} code />
      <DetailValue label={messages.TECHNICAL_STATUS} value={workOrder.status} />
      <DetailValue label={messages.TECHNICAL_TENANT} value={workOrder.tenantId} code />
      <DetailValue label={messages.TECHNICAL_CONTRACT_ID} value={workOrder.contractId} code />
      <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={workOrder.machineId} code />
      <DetailValue label={messages.MACHINE_TYPE} value={workOrder.machineType} />
      <DetailValue label={messages.TECHNICAL_ASSIGNEE} value={workOrder.assignedTechnicianId ?? "—"} code />
      <DetailValue label={messages.TECHNICAL_SCHEDULED} value={formatDate(workOrder.scheduledFor)} />
      <DetailValue label={messages.TECHNICAL_STARTED} value={formatDate(workOrder.startedAt)} />
      <DetailValue label={messages.TECHNICAL_COMPLETED} value={formatDate(workOrder.completedAt)} />
      <DetailValue label={messages.TECHNICAL_RECIPIENT} value={workOrder.handoverRecipient ?? "—"} />
      <DetailValue label={messages.TECHNICAL_FAILURE_REASON} value={workOrder.failureReason ?? "—"} />
    </dl>
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_CHECKLIST} ({details.checklistItems.length})</h2>
      <DataTable headers={[messages.TECHNICAL_ITEM_CODE, messages.TECHNICAL_ITEM_LABEL, messages.TECHNICAL_REQUIRED, messages.TECHNICAL_RESULT, messages.TECHNICAL_NOTES_LABEL]} emptyMessage={details.checklistItems.length === 0 ? messages.TECHNICAL_CHECKLIST_EMPTY : undefined}>
        {details.checklistItems.map((item) => <tr key={item.id}><td>{item.itemCode}</td><td>{item.label}</td><td>{item.required ? "Có" : "Không"}</td><td>{item.result}</td><td>{item.notes ?? "—"}</td></tr>)}
      </DataTable>
    </section>
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_ACCESSORIES} ({details.accessories.length})</h2>
      <DataTable headers={[messages.TECHNICAL_ACCESSORY_NAME, messages.TECHNICAL_QUANTITY, messages.TECHNICAL_SERIAL, messages.TECHNICAL_NOTES_LABEL]} emptyMessage={details.accessories.length === 0 ? messages.TECHNICAL_ACCESSORIES_EMPTY : undefined}>
        {details.accessories.map((item) => <tr key={item.id}><td>{item.accessoryName}</td><td>{item.quantity}</td><td>{item.serialNumber ?? "—"}</td><td>{item.notes ?? "—"}</td></tr>)}
      </DataTable>
    </section>
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_EVIDENCE} ({details.evidence.length})</h2>
      <DataTable headers={[messages.TECHNICAL_FILENAME, messages.TECHNICAL_CONTENT_TYPE, messages.TECHNICAL_SIZE, messages.TECHNICAL_SHA256, messages.TECHNICAL_UPLOADED_AT]} emptyMessage={details.evidence.length === 0 ? messages.TECHNICAL_EVIDENCE_EMPTY : undefined} minWidth={760}>
        {details.evidence.map((item) => <tr key={item.id}><td>{item.originalFilename}</td><td>{item.contentType ?? "—"}</td><td>{numberFormat.format(item.sizeBytes)} bytes</td><td className={styles.codeValue}>{item.sha256 ?? "—"}</td><td>{formatDate(item.uploadedAt)}</td></tr>)}
      </DataTable>
    </section>
  </>;
}

export function ModeratorTechnicalScreen({ path }: { path: string }) {
  const isMachineHistory = path === "machine-history" || path.startsWith("machine-history/");
  const isWorkOrderList = path === "technical-requests" || path === "technical-requests/list";
  const isUnsupportedWrite = path === "technical-requests/new" || path.startsWith("technical-requests/new/");
  const workOrderId = path.startsWith("technical-requests/") ? path.slice("technical-requests/".length) : "";
  const isDetail = Boolean(workOrderId) && !workOrderId.includes("/") && !["list", "new"].includes(workOrderId) && !isUnsupportedWrite;
  const validWorkOrderId = InstallationWorkOrderIdSchema.safeParse(workOrderId).success;
  const historyMachineId = path.startsWith("machine-history/") ? path.slice("machine-history/".length) : "";
  const validHistoryMachineId = MachineIdSchema.safeParse(historyMachineId).success;
  const shouldLoadHistory = isMachineHistory && (!historyMachineId || validHistoryMachineId);
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    enabled: isWorkOrderList,
    retry: false,
  });
  const tenantIds = tenants.data?.map((tenant) => tenant.id) ?? [];
  const workOrders = useQuery({
    queryKey: ["dolores", "moderator", "installation-work-orders-by-tenant", tenantIds],
    queryFn: ({ signal }) => readTenantRecords(tenants.data ?? [], signal, (id, requestSignal) => installationWorkOrdersApi.listByTenant(id, requestSignal)),
    enabled: isWorkOrderList && !tenants.isPending && !tenants.isError,
    retry: false,
  });
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets"],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets(signal),
    enabled: isWorkOrderList || shouldLoadHistory,
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["dolores", "installation-work-orders", "id", workOrderId],
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    enabled: isDetail && validWorkOrderId,
    retry: false,
  });

  if (isUnsupportedWrite) {
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button><p className={styles.pendingNotice} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p></div>;
  }

  if (isDetail) {
    if (!validWorkOrderId) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{workOrderId}: {messages.TECHNICAL_LEGACY_ID}</p><ActionLink href={PATH_MODERATOR.TECHNICAL_REQUESTS}>Quay lại danh sách</ActionLink></div>;
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><ActionLink href={PATH_MODERATOR.TECHNICAL_REQUESTS}>Quay lại danh sách</ActionLink><QueryFeedback query={detail} loadingMessage={messages.LOADING_WORK_ORDER} />{detail.data && !detail.isError && <WorkOrderDetail details={detail.data} />}</div>;
  }

  if (isMachineHistory) {
    if (historyMachineId && !validHistoryMachineId) return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><p className={styles.pendingNotice} role="status">{historyMachineId}: {messages.MACHINE_LEGACY_ID}</p></div>;
    return <div className={styles.pageContent}><PageHeading title={historyMachineId ? "Lịch sử ticket của máy" : messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><QueryFeedback query={tickets} loadingMessage={messages.LOADING_TICKETS} />{tickets.data && !tickets.isError && <MaintenanceTicketTable tickets={tickets.data} machineId={historyMachineId || undefined} />}</div>;
  }

  if (!isWorkOrderList) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p></div>;

  const combinedRows = (workOrders.data?.records.length ?? 0) + (tickets.data?.length ?? 0);
  const partial = Boolean(tickets.isError || tenants.isError || workOrders.isError || workOrders.data?.failedTenants.length);
  const listReady = !tenants.isPending && !tickets.isPending && (!tenants.data?.length || !workOrders.isPending);
  return (
    <div className={styles.pageContent}>
      <PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} />
      <button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button>
      <p className={styles.formHint} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p>
      <QueryFeedback query={tickets} loadingMessage={messages.LOADING_TICKETS} />
      <QueryFeedback query={tenants} loadingMessage={messages.LOADING_TENANTS} />
      {tenants.data && !tenants.isError && <QueryFeedback query={workOrders} loadingMessage={messages.TECHNICAL_LOADING_WORK_ORDERS} />}
      {workOrders.data && <TenantPartialFailure failedTenants={workOrders.data.failedTenants} retry={workOrders.refetch} subject={messages.TECHNICAL_WORK_ORDER} />}
      {listReady && !partial && combinedRows === 0 && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
      {listReady && combinedRows > 0 && <DataTable headers={[messages.TECHNICAL_TYPE, messages.TECHNICAL_ID, messages.TECHNICAL_MACHINE_ID, messages.TECHNICAL_TENANT, messages.TECHNICAL_STATUS, messages.TECHNICAL_DATE, messages.TECHNICAL_NOTES]} minWidth={900}>
        <WorkOrderRows records={workOrders.data?.records ?? []} />
        <TicketRows tickets={tickets.data ?? []} />
      </DataTable>}
      {partial && <p className={styles.partialNotice} role="status">{messages.PARTIAL_TENANT_FAILURE}</p>}
    </div>
  );
}
