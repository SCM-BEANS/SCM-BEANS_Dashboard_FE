import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState, type FormEvent } from "react";

import Link from "next/link";

import { locationsApi } from "@/apis/locations.api";

import { machinesApi } from "@/apis/machines.api";

import { profilesApi } from "@/apis/profiles.api";

import { PATH_MODERATOR } from "@/routes/path";

import { LocationIdSchema } from "@/schema/locations.schema";

import { MachineIdSchema, MachineTypeSchema, type Machine, type MachineInventoryItem, type MaintenanceTicket } from "@/schema/machines.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { API_ERROR_MESSAGES, getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

async function listVerifiedActiveTechnicians(signal: AbortSignal) {
  const firstPage = await profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal);
  const pages = [firstPage];
  for (let page = 1; page < firstPage.totalPages; page += 5) {
    const pageNumbers = Array.from({ length: Math.min(5, firstPage.totalPages - page) }, (_, offset) => page + offset);
    pages.push(...await Promise.all(pageNumbers.map((pageNumber) =>
      profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: pageNumber, size: 100 }, signal),
    )));
  }
  return pages.flatMap((page) => page.items).filter((profile) => profile.emailVerified);
}

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

function MachineManagementPanel({ machine }: { machine: Machine }) {
  const queryClient = useQueryClient();
  const [technicianId, setTechnicianId] = useState("");
  const [machineType, setMachineType] = useState<"CONVENTIONAL" | "SMART_IOT">(machine.machineType ?? "CONVENTIONAL");
  const [typeReason, setTypeReason] = useState("");
  const [region, setRegion] = useState(machine.region ?? "");
  const [locationId, setLocationId] = useState(machine.locationId ?? "");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "technicians", "verified-active"],
    queryFn: ({ signal }) => listVerifiedActiveTechnicians(signal),
    enabled: Boolean(machine.ownerId),
    retry: false,
  });
  const locations = useQuery({
    queryKey: ["dolores", "locations", "owner", machine.ownerId, "active"],
    queryFn: ({ signal }) => locationsApi.list({ ownerId: machine.ownerId!, activeOnly: true }, signal),
    enabled: Boolean(machine.ownerId),
    retry: false,
  });
  const refresh = async () => {
    setActionSuccess(messages.MACHINE_ACTION_SUCCESS);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "inventory-summary"] }),
    ]);
  };
  const onError = (error: unknown) => setActionError(getApiErrorMessage(error));
  const assign = useMutation({
    mutationFn: () => machinesApi.assignTechnician(technicianId, machine.id),
    onMutate: () => { setActionError(null); setActionSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const unassign = useMutation({
    mutationFn: () => machinesApi.unassignTechnician(technicianId, machine.id),
    onMutate: () => { setActionError(null); setActionSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const updateType = useMutation({
    mutationFn: () => machinesApi.setType(machine.id, { machineType, reason: typeReason }),
    onMutate: () => { setActionError(null); setActionSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const updateMachine = useMutation({
    mutationFn: () => {
      if (!machine.serialNumber || !machine.status) throw new Error("Không thể cập nhật máy khi API thiếu serial hoặc trạng thái hiện tại.");
      return machinesApi.update(machine.id, {
        serialNumber: machine.serialNumber,
        status: machine.status,
        region,
        ...(locationId ? { locationId } : {}),
      });
    },
    onMutate: () => { setActionError(null); setActionSuccess(null); },
    onSuccess: refresh,
    onError,
  });
  const actionsPending = assign.isPending || unassign.isPending || updateType.isPending || updateMachine.isPending;
  const locationOptions = locations.data ?? [];

  function submitMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMachine.mutate();
  }

  function submitType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateType.mutate();
  }

  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-machine-management">
      <h2 id="moderator-machine-management" className={styles.sectionTitle}>{messages.MACHINE_MANAGEMENT_ACTIONS}</h2>
      {machine.ownerId ? (
        <>
          <QueryFeedback query={locations} loadingMessage={messages.MACHINE_LOADING_LOCATIONS} />
          <form onSubmit={submitMachine} style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            <label htmlFor="moderator-machine-region">{messages.MACHINE_REGION_UPDATE}</label>
            <input id="moderator-machine-region" value={region} disabled={actionsPending} onChange={(event) => setRegion(event.target.value)} />
            <label htmlFor="moderator-machine-location">{messages.MACHINE_LOCATION_UPDATE}</label>
            <select id="moderator-machine-location" value={locationId} disabled={actionsPending || locations.isPending} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">{messages.MACHINE_SELECT_LOCATION}</option>
              {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
            <button className={styles.retryButton} type="submit" disabled={actionsPending || !machine.serialNumber || !machine.status}>
              {updateMachine.isPending ? messages.MACHINE_SAVING : messages.MACHINE_SAVE_CHANGES}
            </button>
          </form>
          <form onSubmit={submitType} style={{ display: "grid", gap: 8, marginBottom: 20 }}>
            <label htmlFor="moderator-machine-type">{messages.MACHINE_TYPE_UPDATE}</label>
            <select id="moderator-machine-type" value={machineType} disabled={actionsPending} onChange={(event) => setMachineType(MachineTypeSchema.parse(event.target.value))}>
              <option value="CONVENTIONAL">CONVENTIONAL</option>
              <option value="SMART_IOT">SMART_IOT</option>
            </select>
            <label htmlFor="moderator-machine-type-reason">{messages.MACHINE_TYPE_REASON}</label>
            <textarea id="moderator-machine-type-reason" value={typeReason} maxLength={1000} required rows={2} disabled={actionsPending} onChange={(event) => setTypeReason(event.target.value)} />
            <button className={styles.retryButton} type="submit" disabled={actionsPending || !typeReason.trim()}>
              {updateType.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TYPE_UPDATE}
            </button>
          </form>
          <QueryFeedback query={technicians} loadingMessage={messages.MACHINE_LOADING_TECHNICIANS} />
          <div style={{ display: "grid", gap: 8 }}>
            <label htmlFor="moderator-machine-technician">{messages.MACHINE_SELECT_TECHNICIAN}</label>
            <select id="moderator-machine-technician" value={technicianId} disabled={actionsPending || technicians.isPending} onChange={(event) => setTechnicianId(event.target.value)}>
              <option value="">{messages.MACHINE_SELECT_TECHNICIAN}</option>
              {technicians.data?.map((technician) => <option key={technician.idaasUserId} value={technician.idaasUserId}>{technician.fullName || technician.email || technician.idaasUserId}</option>)}
            </select>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className={styles.retryButton} type="button" disabled={!technicianId || actionsPending} onClick={() => assign.mutate()}>{assign.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TECHNICIAN_ASSIGN}</button>
              <button className={styles.retryButton} type="button" disabled={!technicianId || actionsPending} onClick={() => unassign.mutate()}>{unassign.isPending ? messages.MACHINE_SAVING : messages.MACHINE_TECHNICIAN_UNASSIGN}</button>
            </div>
          </div>
        </>
      ) : (
        <p className={styles.formHint}>{messages.MACHINE_OWNER_ASSIGNMENT_REQUIRED}</p>
      )}
      {actionError && <p role="alert">{actionError}</p>}
      {actionSuccess && <p role="status">{actionSuccess}</p>}
    </section>
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
    if (isCustomer) return Boolean(machine.ownerId);
    return true;
  });
  const emptyMessage = failed
    ? undefined
    : isStock
      ? messages.MACHINE_STOCK_EMPTY
      : isCustomer
        ? messages.MACHINE_OWNER_EMPTY
        : messages.MACHINE_EMPTY;

  return (
    <DataTable variant="moderator" headers={[messages.MACHINE_SERIAL, messages.TECHNICAL_MACHINE_ID, messages.MACHINE_OWNER, messages.MACHINE_TYPE, messages.MACHINE_STATUS]} emptyMessage={visibleMachines.length === 0 ? emptyMessage : undefined}>
      {visibleMachines.map((machine) => (
        <tr key={machine.id}>
          <td><ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(machine.id)}>{machine.serialNumber ?? machine.id}</ActionLink></td>
          <td className={styles.codeValue}>{machine.id}</td>
          <td className={styles.codeValue}>{machine.ownerId ?? "—"}</td>
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
      variant="moderator"
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
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({}, signal),
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
      machine.data.ownerId && location.data.ownerId !== machine.data.ownerId
    ),
  );

  if (isUnsupported) {
    return <div className={styles.pageContent}><PageHeading title={messages.MACHINES_TITLE} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.MACHINE_UNAVAILABLE_ACTION}</p></div>;
  }

  if (isDetail) {
    if (!validMachineId) {
      return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_DETAIL_TITLE} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{machineId}: {messages.MACHINE_LEGACY_ID}</p></div>;
    }
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.MACHINE_DETAIL_TITLE} description={messages.MACHINES_DESCRIPTION} />
        <QueryFeedback query={machine} loadingMessage={messages.LOADING_MACHINE} />
        {machine.data && !machine.isError && (
          <>
            <dl className={styles.detailGrid}>
              <DetailValue label={messages.MACHINE_SERIAL} value={machine.data.serialNumber ?? "—"} />
              <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={machine.data.id} code />
              <DetailValue label={messages.MACHINE_OWNER} value={machine.data.ownerId ?? "—"} code />
              <DetailValue label={messages.MACHINE_TYPE} value={machine.data.machineType ?? "—"} />
              <DetailValue label={messages.MACHINE_STATUS} value={machine.data.status ?? "—"} />
              <DetailValue label={messages.MACHINE_LOCATION} value={locationScopeMismatch ? machine.data.locationId ?? "—" : location.data?.name ?? machine.data.locationId ?? "—"} />
              <DetailValue label={messages.MACHINE_DEPLOYED} value={formatDate(machine.data.deployedAt)} />
              <DetailValue label={messages.MACHINE_REGION} value={machine.data.region ?? "—"} />
            </dl>
            <MachineManagementPanel machine={machine.data} />
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

  const title = isStock ? "Máy trong kho" : isCustomer ? messages.MACHINE_OWNER_TITLE : messages.MACHINES_TITLE;
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
