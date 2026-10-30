import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState, type FormEvent } from "react";

import { locationsApi } from "@/apis/locations.api";

import { machinesApi } from "@/apis/machines.api";

import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";

import { profilesApi } from "@/apis/profiles.api";

import { MachineIdSchema } from "@/schema/machines.schema";

import { type Profile } from "@/schema/profiles.schema";
import { type Location } from "@/schema/locations.schema";

import { TelemetryPointsParamsSchema, type MachineHeartbeat, type TelemetryPoint } from "@/schema/telemetry.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

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
  return <ModeratorPageHeading title={title} description={description} />;
}

function DetailValue({ label, value, code = false }: { label: string; value: string | number; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
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
  const isLocationsView = path === "iot/customer";
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
