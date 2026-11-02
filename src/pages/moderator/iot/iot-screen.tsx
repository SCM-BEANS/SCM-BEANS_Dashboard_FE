import { useQuery } from "@tanstack/react-query";

import { useState } from "react";

import { locationsApi } from "@/apis/locations.api";

import { machinesApi } from "@/apis/machines.api";

import { tenantsApi } from "@/apis/tenants.api";

import { MachineIdSchema } from "@/schema/machines.schema";

import { type Tenant } from "@/schema/tenants.schema";

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
  const validSelectedId = MachineIdSchema.safeParse(selectedMachineId).success;
  const selectedMachine = useQuery({
    queryKey: ["dolores", "machines", "id", selectedMachineId],
    queryFn: ({ signal }) => machinesApi.getById(selectedMachineId, signal),
    enabled: !isLocationsView && Boolean(selectedMachineId) && validSelectedId,
    retry: false,
  });
  const smartIotVerified = selectedMachine.data?.machineType === "SMART_IOT";
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
              onChange={(event) => setSelectedMachineId(event.target.value)}
            >
              <option value="">{messages.IOT_SELECT_MACHINE_HINT}</option>
              {smartMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber ?? machine.id} · {machine.id}</option>)}
            </select>
          </label>
          {smartMachines.length === 0 && <p className={styles.formHint}>{messages.IOT_NO_SMART}</p>}
          {selectedMachineId && <QueryFeedback query={selectedMachine} loadingMessage={messages.LOADING_MACHINE} />}
          {selectedMachine.data && !selectedMachine.isError && !smartIotVerified && <p className={styles.partialNotice} role="status">{messages.IOT_NOT_SMART}</p>}
          {smartIotVerified && <p className={styles.partialNotice} role="note">{messages.IOT_MODERATOR_TELEMETRY_UNAVAILABLE}</p>}
        </section>
      </>}
    </div>
  );
}
