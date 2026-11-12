import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import { useRouter } from "next/router";

import { machineModelsApi } from "@/apis/machine-models.api";

import { machinesApi } from "@/apis/machines.api";

import { PATH_MODERATOR } from "@/routes/path";

import { MachineModelIdSchema } from "@/schema/machine-models.schema";

import { MachineStatusSchema, type MachineInventoryItem } from "@/schema/machines.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { API_ERROR_MESSAGES, getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";
import { TextLinkButton } from "@/components/button/text-link-button";
import { MachineListView } from "@/components/machines/machine-list-view";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { MACHINE_STATUS_LABELS } from "@/components/machines/machine-status-labels";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { CreateMachineForm } from "@/pages/admin/machines/create-machine-form";
import { CreateMachineModelForm } from "@/pages/admin/machines/create-machine-model-form";
import { MachineModelDetail } from "@/pages/admin/machines/machine-model-detail";
import { ADMIN_OPERATIONS_MESSAGES as ADMIN_T } from "@/text/admin/admin-operations-messages";
import { adminStyles } from "@/pages/admin/admin-shell";
import { ModeratorMachineDetailScreen } from "./machine-detail-screen";
import { MachineMaintenanceTicketTable } from "./machine-maintenance-ticket-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

const MACHINE_STATUSES = MachineStatusSchema.options;
type MachineStatus = typeof MACHINE_STATUSES[number];
type StatusFilter = "ALL" | MachineStatus;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "—" : new Date(timestamp).toLocaleDateString("vi-VN");
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : numberFormat.format(value);
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "—";
  return `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
}

function machineStatusLabel(status: MachineInventoryItem["status"]): string {
  if (!status) return "—";
  return MACHINE_STATUS_LABELS[status as keyof typeof MACHINE_STATUS_LABELS] ?? status;
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

function MachineStatusFilter({ statusFilter, onChange }: { statusFilter: StatusFilter; onChange: (status: string) => void }) {
  return (
    <div className={adminStyles.machineFilterToolbar}>
      <label className={adminStyles.machineFilterControl}>
        <span className={adminStyles.machineFilterLabel}>{ADMIN_T.MACHINES.STATUS}</span>
        <select className={adminStyles.machineStatusSelect} aria-label="Lọc máy theo trạng thái" value={statusFilter} onChange={(event) => onChange(event.target.value)}>
          <option value="ALL">{ADMIN_T.MACHINES.FILTER_ALL} {ADMIN_T.MACHINES.STATUS.toLowerCase()}</option>
          {MACHINE_STATUSES.map((status) => <option value={status} key={status}>{machineStatusLabel(status)}</option>)}
        </select>
      </label>
    </div>
  );
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return <ModeratorPageHeading title={title} description={description} />;
}

const machineListPaths = new Set([
  "machines",
  "machines/list",
  "machines/stock",
  "machines/customer",
  "machines/models",
  "machines/new",
]);

const machineHistoryPath = "machines/repair-history";

function getMachineModelDetailId(path: string): string {
  const prefix = "machines/models/";
  if (!path.startsWith(prefix)) return "";
  const candidate = path.slice(prefix.length);
  return candidate && !candidate.includes("/") ? candidate : "";
}

const unavailableMachinePaths = new Set(["machines/loans", "machines/substitute", "machines/substitute/return"]);

function getMachineDetailId(path: string): string {
  if (!path.startsWith("machines/")) return "";
  const candidate = path.slice("machines/".length);
  if (!candidate || candidate.includes("/") || machineListPaths.has(path) || unavailableMachinePaths.has(path) || path === machineHistoryPath) {
    return "";
  }
  return candidate;
}

function getVisibleMachines(
  machines: MachineInventoryItem[],
  isStock: boolean,
  isCustomer: boolean,
  statusFilter: StatusFilter,
) {
  return machines.filter((machine) => {
    if (statusFilter !== "ALL" && machine.status !== statusFilter) return false;
    if (isStock) return ["IN_WAREHOUSE", "PENDING_ACTIVATION", "AVAILABLE_FOR_RENT"].includes(machine.status ?? "");
    if (isCustomer) return Boolean(machine.ownerId);
    return true;
  });
}

function MachineList({
  machines,
  isStock,
  isCustomer,
  statusFilter,
  failed,
}: {
  machines: MachineInventoryItem[];
  isStock: boolean;
  isCustomer: boolean;
  statusFilter: StatusFilter;
  failed: boolean;
}) {
  const visibleMachines = getVisibleMachines(machines, isStock, isCustomer, statusFilter);
  const emptyMessage = failed
    ? undefined
    : statusFilter !== "ALL"
      ? ADMIN_T.MACHINES.NO_MATCH
    : isStock
      ? messages.MACHINE_STOCK_EMPTY
      : isCustomer
        ? messages.MACHINE_OWNER_EMPTY
        : messages.MACHINE_EMPTY;

  return (
    <div>
      <DataTable
        headerVariant="admin"
        className={`${adminStyles.adminTable} ${adminStyles.machineInventoryTable}`}
        rows={visibleMachines}
        rowKey={(machine) => machine.id}
        emptyMessage={visibleMachines.length === 0 ? emptyMessage : undefined}
        columns={[
          { key: "serial", header: ADMIN_T.MACHINES.SERIAL, render: (machine) => <TextLinkButton href={`${PATH_MODERATOR.MACHINE_DETAIL(machine.id)}${statusFilter === "ALL" ? "" : `?status=${encodeURIComponent(statusFilter)}`}`}>{machine.serialNumber ?? "—"}</TextLinkButton> },
          { key: "status", header: ADMIN_T.MACHINES.STATUS, render: (machine) => machine.status ? <StatusBadge status={machine.status}>{machineStatusLabel(machine.status)}</StatusBadge> : "—" },
          { key: "connection", header: "Kết nối", render: (machine) => {
            if (machine.machineType !== "SMART_IOT") return "—";
            return <MachineConnectionBadge state="permission-denied" />;
          } },
          { key: "contract-period", header: ADMIN_T.MACHINES.CONTRACT_PERIOD, render: (machine) => formatPeriod(machine.contractStartDate, machine.contractEndDate) },
        ]}
      />
    </div>
  );
}

export function ModeratorMachinesScreen({ path }: { path: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creationSuccess, setCreationSuccess] = useState<{ title: string; description: string } | null>(null);
  const machineId = getMachineDetailId(path);
  const isDetail = Boolean(machineId);
  const machineModelDetailId = getMachineModelDetailId(path);
  const isMachineModelDetail = Boolean(machineModelDetailId);
  const validMachineModelDetailId = MachineModelIdSchema.safeParse(machineModelDetailId).success;
  const isCreateMachine = path === "machines/new";
  const isCreateMachineModel = path === "machines/models/new";
  const isCreateView = isCreateMachine || isCreateMachineModel;
  const isHistory = path === machineHistoryPath;
  const isUnsupported = unavailableMachinePaths.has(path);
  const isMachineModelsView = path === "machines/models";
  const isStock = path === "machines/stock";
  const isCustomer = path === "machines/customer";
  const isInventoryView = !isDetail && !isHistory && !isUnsupported && !isCreateView && !isMachineModelsView && !isMachineModelDetail;
  const requestedStatus = typeof router.query.status === "string" ? router.query.status : "";
  const statusFilter: StatusFilter = MACHINE_STATUSES.includes(requestedStatus as MachineStatus)
    ? requestedStatus as StatusFilter
    : "ALL";
  const machineListPath = isStock
    ? `${PATH_MODERATOR.MACHINES}/stock`
    : isCustomer ? `${PATH_MODERATOR.MACHINES}/customer` : PATH_MODERATOR.MACHINES;
  const selectStatus = (status: string) => {
    void router.push({
      pathname: machineListPath,
      query: status === "ALL" ? {} : { status },
    }, undefined, { shallow: true });
  };
  const inventory = useQuery({
    queryKey: ["dolores", "machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isDetail && !isHistory && !isUnsupported && !isCreateView && !isMachineModelsView,
    retry: false,
  });
  const inventorySummary = useQuery({
    queryKey: ["dolores", "inventory-summary"],
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
    enabled: !isDetail && !isHistory && !isUnsupported && !isCreateView && !isMachineModelsView,
    retry: false,
  });
  const machineModels = useQuery({
    queryKey: ["dolores", "machine-models"],
    queryFn: ({ signal }) => machineModelsApi.list(signal),
    enabled: isMachineModelsView,
    retry: false,
  });
  const visibleMachines = getVisibleMachines(inventory.data ?? [], isStock, isCustomer, statusFilter);
  const shouldReadTickets = isHistory;
  const ticketParams = {};
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets", ticketParams],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets(ticketParams, signal),
    enabled: shouldReadTickets,
    retry: false,
  });
  if (isUnsupported) {
    return <div className={styles.pageContent}><PageHeading title={messages.MACHINES_TITLE} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.MACHINE_UNAVAILABLE_ACTION}</p></div>;
  }

  if (isCreateView) {
    const returnToMachineList = () => {
      setCreationSuccess(null);
      void router.push(isCreateMachineModel ? PATH_MODERATOR.MACHINE_MODELS : PATH_MODERATOR.MACHINES);
    };

    return (
      <div className={styles.pageContent}>
        <PageHeading
          title={isCreateMachine ? ADMIN_T.MACHINES.CREATE_TITLE : ADMIN_T.MACHINE_MODELS.CREATE_TITLE}
          description={messages.MACHINES_DESCRIPTION}
        />
        {isCreateMachine ? (
          <CreateMachineForm
            onCancel={returnToMachineList}
            onCreated={(serialNumber) => {
              void queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] });
              void queryClient.invalidateQueries({ queryKey: ["dolores", "inventory-summary"] });
              setCreationSuccess({
                title: ADMIN_T.MACHINES.CREATE_SUCCESS,
                description: `${ADMIN_T.MACHINES.SERIAL}: ${serialNumber}`,
              });
            }}
          />
        ) : (
          <CreateMachineModelForm
            onCancel={returnToMachineList}
            onCreated={(modelCode) => {
              void queryClient.invalidateQueries({ queryKey: ["dolores", "machine-models"] });
              setCreationSuccess({
                title: ADMIN_T.MACHINE_MODELS.CREATE_SUCCESS,
                description: `${ADMIN_T.MACHINE_MODELS.MODEL_CODE}: ${modelCode}`,
              });
            }}
          />
        )}
        {creationSuccess && (
          <NotificationDialog
            variant="success"
            title={creationSuccess.title}
            description={creationSuccess.description}
            primaryAction={{ label: isCreateMachineModel ? ADMIN_T.MACHINE_MODELS.TITLE : messages.MACHINES_TITLE, onClick: returnToMachineList }}
            onClose={returnToMachineList}
          />
        )}
      </div>
    );
  }

  if (isMachineModelDetail) {
    if (!validMachineModelDetailId) {
      return <div className={styles.pageContent}><PageHeading title={ADMIN_T.MACHINE_MODELS.DETAIL} description={messages.MACHINES_DESCRIPTION} /><p className={styles.pendingNotice} role="alert">{API_ERROR_MESSAGES.INVALID_RESPONSE}</p></div>;
    }
    return (
      <div className={styles.pageContent}>
        <PageHeading title={ADMIN_T.MACHINE_MODELS.DETAIL} description={machineModelDetailId} />
        <MachineModelDetail modelId={machineModelDetailId} role="moderator" />
      </div>
    );
  }

  if (isDetail) {
    return <ModeratorMachineDetailScreen machineId={machineId} />;
  }
  if (isHistory) {
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} />
        <QueryFeedback query={tickets} loadingMessage={messages.LOADING_MACHINE_TICKETS} />
        {tickets.data && !tickets.isError && <MachineMaintenanceTicketTable tickets={tickets.data} />}
      </div>
    );
  }

  const title = isMachineModelsView
    ? ADMIN_T.MACHINE_MODELS.TITLE
    : isStock ? "Máy trong kho" : isCustomer ? messages.MACHINE_OWNER_TITLE : messages.MACHINES_TITLE;
  const inventoryCount = visibleMachines.length;
  const countFor = (...statuses: string[]) => {
    const counts = inventorySummary.data?.statusCounts;
    if (!counts) return "—";
    return numberFormat.format(statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0));
  };
  return (
    <>
    <div className={styles.pageContent}>
      <PageHeading title={title} description={messages.MACHINES_DESCRIPTION} />
      <MachineListView label={title} summary={!isMachineModelsView ? <>
        <div className={adminStyles.metricsGrid}>
          <article className={`${adminStyles.metricCard} ${adminStyles.metricCardCentered}`}><span>{ADMIN_T.MACHINES.TOTAL}</span><strong>{inventorySummary.data?.totalMachines == null ? "—" : numberFormat.format(inventorySummary.data.totalMachines)}</strong></article>
          <article className={`${adminStyles.metricCard} ${adminStyles.metricCardCentered}`}><span>{ADMIN_T.MACHINES.WAREHOUSE}</span><strong>{countFor("IN_WAREHOUSE")}</strong></article>
          <article className={`${adminStyles.metricCard} ${adminStyles.metricCardCentered}`}><span>{ADMIN_T.MACHINES.DEPLOYED}</span><strong>{countFor("DEPLOYED_CONTRACT_OWNER", "DEPLOYED_STORE_OWNER")}</strong></article>
          <article className={`${adminStyles.metricCard} ${adminStyles.metricCardCentered}`}><span>{ADMIN_T.MACHINES.MAINTENANCE}</span><strong>{countFor("UNDER_MAINTENANCE", "REFURBISHING", "PENDING_QA")}</strong></article>
        </div>
        <QueryFeedback query={inventorySummary} loadingMessage={messages.LOADING_MACHINES} />
      </> : null}>
      <div className={adminStyles.machineInventoryGroup}>
        <div className={adminStyles.machineViewTabs} role="tablist" aria-label="Danh sách máy và loại máy">
          <button type="button" role="tab" aria-selected={!isMachineModelsView} className={`${adminStyles.machineViewTab} ${!isMachineModelsView ? adminStyles.machineViewTabActive : ""}`} onClick={() => void router.push(PATH_MODERATOR.MACHINES)}>{ADMIN_T.MACHINES.TITLE}</button>
          <button type="button" role="tab" aria-selected={isMachineModelsView} className={`${adminStyles.machineViewTab} ${isMachineModelsView ? adminStyles.machineViewTabActive : ""}`} onClick={() => void router.push(PATH_MODERATOR.MACHINE_MODELS)}>{ADMIN_T.MACHINE_MODELS.TITLE}</button>
        </div>
        <section className={adminStyles.panel}>
          <div className={adminStyles.machineInventoryHeading}>
            <h2>{isMachineModelsView ? ADMIN_T.MACHINE_MODELS.TITLE : title}</h2>
            {isMachineModelsView
              ? machineModels.data && <span>{machineModels.data.length} {ADMIN_T.MACHINE_MODELS.COUNT}</span>
              : inventory.data && <span className={adminStyles.machineFilterCount} aria-live="polite">{numberFormat.format(inventoryCount)} / {numberFormat.format(inventory.data.length)} máy</span>}
          </div>
          {!isMachineModelsView && <MachineStatusFilter statusFilter={statusFilter} onChange={selectStatus} />}
          {isMachineModelsView ? <>
            <QueryFeedback query={machineModels} loadingMessage={messages.LOADING_MACHINES} />
            {machineModels.data?.length === 0 && <p className={styles.formHint}>{ADMIN_T.COMMON.EMPTY}</p>}
            {machineModels.data && machineModels.data.length > 0 && <>
              <p className={adminStyles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>
              <DataTable
                headerVariant="admin"
                className={adminStyles.adminTable}
                rows={machineModels.data}
                rowKey={(model) => model.id}
                columns={[
                  { key: "model-code", header: ADMIN_T.MACHINE_MODELS.MODEL_CODE, align: "center", render: (model) => (
                    <button
                      className={adminStyles.accountTextButton}
                      type="button"
                      aria-label={`Xem chi tiết mẫu máy ${model.modelCode}`}
                      onClick={() => void router.push(PATH_MODERATOR.MACHINE_MODEL_DETAIL(model.id))}
                    >
                      {model.modelCode}
                    </button>
                  ) },
                  { key: "manufacturer", header: ADMIN_T.MACHINE_MODELS.MANUFACTURER, render: (model) => model.manufacturer },
                  { key: "display-name", header: ADMIN_T.MACHINE_MODELS.DISPLAY_NAME, render: (model) => model.displayName },
                  { key: "machine-type", header: ADMIN_T.MACHINES.MACHINE_TYPE, render: (model) => model.machineType === "SMART_IOT" ? ADMIN_T.MACHINES.SMART : ADMIN_T.MACHINES.CONVENTIONAL },
                ]}
              />
            </>}
          </> : <>
            <QueryFeedback query={inventory} loadingMessage={messages.LOADING_MACHINES} />
            {inventory.data && inventory.data.length > 0 && <p className={adminStyles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>}
            {inventory.data && !inventory.isError && <MachineList machines={inventory.data} isStock={isStock} isCustomer={isCustomer} statusFilter={statusFilter} failed={inventory.isError} />}
          </>}
        </section>
      </div>
      </MachineListView>
    </div>
    {!isCreateView && !isMachineModelDetail && (
      <PageActions actions={[
        { id: "machine-create", label: ADMIN_T.MACHINES.CREATE, variant: "primary", priority: 20, href: PATH_MODERATOR.NEW_MACHINE },
        { id: "model-create", label: "Tạo dòng máy", variant: "secondary", priority: 10, href: PATH_MODERATOR.NEW_MACHINE_MODEL },
        { id: "iot", label: ADMIN_T.MACHINES.VIEW_IOT, variant: "secondary", priority: 0, href: PATH_MODERATOR.IOT },
      ]} />
    )}
    </>
  );
}
