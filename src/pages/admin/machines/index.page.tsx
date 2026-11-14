import { MachineListFilters, type MachineListFilterValue } from "@/components/machines/machine-list-filters";
import Link from "next/link";
import { useRouter } from "next/router";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { machinesApi } from "@/apis/machines.api";
import { telemetryApi } from "@/apis/telemetry.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { MachineListView } from "@/components/machines/machine-list-view";
import { MACHINE_STATUS_LABELS } from "@/components/machines/machine-status-labels";
import { MachineConnectionBadge, type MachineConnectionState } from "@/components/machines/machine-connection-badge";
import { staggerHeartbeatRequest, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { MachineStatusSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getMachinesBackDestination } from "../admin-back-destination";
import { CreateMachineForm } from "./create-machine-form";
import { CreateMachineModelForm } from "./create-machine-model-form";
import { MachineModelDetail } from "./machine-model-detail";


const STATUSES = MachineStatusSchema.options;
type MachineStatus = z.infer<typeof MachineStatusSchema>;
type StatusFilter = "ALL" | MachineStatus;
const queryValue = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

const STATUS_FILTER_LABELS: Record<MachineStatus, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Owner cửa hàng",
  UNDER_MAINTENANCE: "Bảo trì",
  REFURBISHING: "Tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Ngừng sử dụng",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function statusLabel(status: MachineStatus | null | undefined): string {
  return status ? MACHINE_STATUS_LABELS[status] : "Chưa có trạng thái";
}

function machineTypeLabel(machineType: string | null | undefined): string {
  if (machineType === "SMART_IOT") return T.MACHINES.SMART;
  if (machineType === "CONVENTIONAL") return T.MACHINES.CONVENTIONAL;
  return T.MACHINES.UNCLASSIFIED;
}

function MachinesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject("ADMIN");
  const view = queryValue(router.query.view);
  const isCreateView = view === "create";
  const isCreateMachineModelView = view === "create-model";
  const isMachineTypesView = view === "types";
  const isMachineModelDetailView = view === "model-detail";
  const isInventoryView = !isCreateView && !isCreateMachineModelView && !isMachineTypesView && !isMachineModelDetailView;
  const isPageVisible = usePageVisibility();
  const heartbeatTableRef = useRef<HTMLDivElement>(null);
  const machineModelId = queryValue(router.query.id);
  const requestedStatus = queryValue(router.query.status);
  const statusFilter: StatusFilter = requestedStatus === "ALL" || STATUSES.includes(requestedStatus as MachineStatus)
    ? requestedStatus as StatusFilter
    : "ALL";
  const [search, setSearch] = useState("");
  const [filterDraft, setFilterDraft] = useState<MachineListFilterValue>({ search: "", status: statusFilter === "ALL" ? "" : statusFilter, connection: "" });
  useEffect(() => { setFilterDraft((current) => ({ ...current, status: statusFilter === "ALL" ? "" : statusFilter })); }, [statusFilter]);
  const requestedPage = Number(queryValue(router.query.page));
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const [successSerialNumber, setSuccessSerialNumber] = useState("");
  const [successMachineModelCode, setSuccessMachineModelCode] = useState("");
  const inventory = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: isInventoryView,
  });
  const machineModels = useQuery({
    queryKey: ["admin", "machine-models"],
    queryFn: ({ signal }) => machineModelsApi.list(signal),
    enabled: isMachineTypesView,
  });
  const navigateToCreate = () => {
    setSuccessSerialNumber("");
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "create", ...(statusFilter === "ALL" ? {} : { status: statusFilter }) } }, undefined, { shallow: true });
  };
  const navigateToMachineView = (nextView: "inventory" | "types") => {
    void router.push({
      pathname: PATH_ADMIN.MACHINES,
      query: {
        ...(nextView === "types" ? { view: "types" } : {}),
        ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
      },
    }, undefined, { shallow: true });
  };
  const navigateToCreateMachineModel = () => {
    setSuccessMachineModelCode("");
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "create-model" } }, undefined, { shallow: true });
  };
  const navigateToMachineTypes = () => {
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "types" } }, undefined, { shallow: true });
  };
  const navigateToMachineModelDetail = (id: string) => {
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "model-detail", id } }, undefined, { shallow: true });
  };
  const handleMachineModelCreated = (modelCode: string) => {
    setSuccessMachineModelCode(modelCode);
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "types" } }, undefined, { shallow: true });
  };
  const handleMachineCreated = (serialNumber: string) => {
    setSuccessSerialNumber(serialNumber);
    void router.push({
      pathname: PATH_ADMIN.MACHINES,
      query: statusFilter === "ALL" ? {} : { status: statusFilter },
    }, undefined, { shallow: true });
  };

  const visibleMachines = (inventory.data ?? []).filter(
    (machine) => (statusFilter === "ALL" || machine.status === statusFilter) && (!search || `${machine.serialNumber ?? ""} ${machine.modelName ?? ""}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))),
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(visibleMachines.length / 10) - 1));
  const modelPage = Math.min(page, Math.max(0, Math.ceil((machineModels.data?.length ?? 0) / 10) - 1));
  const pageMachines = visibleMachines.slice(currentPage * 10, currentPage * 10 + 10);
  const smartIotMachines = isInventoryView ? pageMachines.filter((machine) => machine.machineType === "SMART_IOT") : [];
  const visibleHeartbeatMachines = smartIotMachines;
  const listHeartbeats = useQueries({
    queries: visibleHeartbeatMachines.map((machine, index) => ({
      queryKey: ["dolores", "admin", "telemetry", "heartbeat", subject, machine.id],
      queryFn: async ({ signal }) => {
        await staggerHeartbeatRequest(index, signal);
        return telemetryApi.getLatestHeartbeat(machine.id, signal);
      },
      enabled: isPageVisible && Boolean(getAuthenticatedSubjectId()),
      retry: false,
      staleTime: 3_000,
      refetchInterval: isPageVisible ? 5_000 : false,
      refetchIntervalInBackground: false,
    })),
  });
  const heartbeatByMachineId = new Map<string, (typeof listHeartbeats)[number]>();
  visibleHeartbeatMachines.forEach((machine, index) => heartbeatByMachineId.set(machine.id, listHeartbeats[index]!));
  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <div className={styles.summarySectionHeading}>
        <BackButtonHeading
          title={isCreateView
            ? T.MACHINES.CREATE_TITLE
            : isCreateMachineModelView
              ? T.MACHINE_MODELS.CREATE_TITLE
              : isMachineModelDetailView
                ? T.MACHINE_MODELS.DETAIL
                : "Quản lý máy"}
          titleId="admin-machines-title"
          description={isCreateView ? T.MACHINES.CREATE_DESCRIPTION : undefined}
          className={styles.pageHeading}
          back={getMachinesBackDestination(router.query)}
        />
        {(isInventoryView || isMachineTypesView) && <ButtonBar variant="primary" onClick={isMachineTypesView ? navigateToCreateMachineModel : navigateToCreate}>{isMachineTypesView ? "Th\u00eam m\u1eabu m\u00e1y" : "Th\u00eam m\u00e1y"}</ButtonBar>}
        </div>
        {isCreateView ? (
          <CreateMachineForm onCancel={() => navigateToMachineView("inventory")} onCreated={handleMachineCreated} />
        ) : isCreateMachineModelView ? (
          <CreateMachineModelForm onCancel={navigateToMachineTypes} onCreated={handleMachineModelCreated} />
        ) : isMachineModelDetailView ? (
          <MachineModelDetail modelId={machineModelId} />
        ) : (
          <MachineListView
            label={isMachineTypesView ? T.MACHINE_MODELS.TITLE : T.MACHINES.TITLE}

          >

            <div className={styles.machineInventoryGroup}>
              <div className={styles.machineViewTabs} role="group" aria-label="Chọn danh sách máy">
                <button
                  type="button"
                  className={`${styles.machineViewTab} ${!isMachineTypesView ? styles.machineViewTabActive : ""}`}
                  aria-pressed={!isMachineTypesView}
                  onClick={() => navigateToMachineView("inventory")}
                >
                  Danh sách máy
                </button>
                <button
                  type="button"
                  className={`${styles.machineViewTab} ${isMachineTypesView ? styles.machineViewTabActive : ""}`}
                  aria-pressed={isMachineTypesView}
                  onClick={() => navigateToMachineView("types")}
                >
                  Mẫu máy
                </button>
              </div>
              <section className={styles.panel}>
              <div className={styles.machineInventoryHeading}>
                <h2>{isMachineTypesView ? T.MACHINE_MODELS.TITLE : T.MACHINES.TITLE}</h2>
                {isMachineTypesView ? machineModels.data && (
                  <span className={styles.machineFilterCount} aria-live="polite">
                    {machineModels.data.length} {T.MACHINE_MODELS.COUNT}
                  </span>
                ) : inventory.data && (
                  <span className={styles.machineFilterCount} aria-live="polite">
                    {visibleMachines.length} / {inventory.data.length} máy
                  </span>
                )}
              </div>
              {!isMachineTypesView && <MachineListFilters value={filterDraft} onChange={setFilterDraft} onSubmit={() => {
                setSearch(filterDraft.search.trim());
                void router.push({ pathname: PATH_ADMIN.MACHINES, query: { ...(filterDraft.status ? { status: filterDraft.status } : {}), page: "0" } }, undefined, { shallow: true });
              }} />}
              {!isMachineTypesView && inventory.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {!isMachineTypesView && inventory.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(inventory.error)}</p><button type="button" onClick={() => void inventory.refetch()}>{T.COMMON.RETRY}</button></div>}
              {isMachineTypesView && machineModels.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {isMachineTypesView && machineModels.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machineModels.error)}</p><button type="button" onClick={() => void machineModels.refetch()}>{T.COMMON.RETRY}</button></div>}
              {inventory.data && !isMachineTypesView && visibleMachines.length === 0 && <p className={styles.emptyText}>{inventory.data.length ? T.MACHINES.NO_MATCH : T.COMMON.EMPTY}</p>}
              {isMachineTypesView && machineModels.data?.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
              {isMachineTypesView && machineModels.data && machineModels.data.length > 0 && <>
                <p className={styles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>
                <DataTable
                  variant="accounts"
                  className={styles.adminTable}
                  rows={machineModels.data.slice(modelPage * 10, modelPage * 10 + 10)}
                  rowKey={(machineModel) => machineModel.id}
                  columns={[
                    { key: "model-code", header: T.MACHINE_MODELS.MODEL_CODE, align: "left", render: (machineModel) => (
                      <button
                        className={styles.accountTextButton}
                        type="button"
                        aria-label={`Xem chi tiết mẫu máy ${machineModel.modelCode}`}
                        onClick={() => navigateToMachineModelDetail(machineModel.id)}
                      >
                        {machineModel.modelCode}
                      </button>
                    ) },
                    { key: "manufacturer", header: T.MACHINE_MODELS.MANUFACTURER, render: (machineModel) => machineModel.manufacturer },
                    { key: "display-name", header: T.MACHINE_MODELS.DISPLAY_NAME, render: (machineModel) => machineModel.displayName },
                    { key: "machine-type", header: T.MACHINES.MACHINE_TYPE, render: (machineModel) => machineTypeLabel(machineModel.machineType) },
                    { key: "open", header: "", render: (machineModel) => <ButtonBar rollingLabel onClick={() => navigateToMachineModelDetail(machineModel.id)}>Mở hồ sơ</ButtonBar> },
                  ]}
                />
                <nav className={styles.machinePagination} aria-label="Phân trang mẫu máy">
                  <span>{modelPage * 10 + 1}–{Math.min((modelPage + 1) * 10, machineModels.data.length)} / {machineModels.data.length} mẫu máy</span>
                  <ButtonBar disabled={modelPage === 0} onClick={() => void router.push({ pathname: router.pathname, query: { ...router.query, page: String(modelPage - 1) } }, undefined, { shallow: true })}>Trước</ButtonBar>
                  <span>Trang {modelPage + 1}/{Math.max(1, Math.ceil(machineModels.data.length / 10))}</span>
                  <ButtonBar disabled={(modelPage + 1) * 10 >= machineModels.data.length} onClick={() => void router.push({ pathname: router.pathname, query: { ...router.query, page: String(modelPage + 1) } }, undefined, { shallow: true })}>Sau</ButtonBar>
                </nav>
              </>}
              {inventory.data && !isMachineTypesView && visibleMachines.length > 0 && <>
                <p className={styles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>
                <div ref={heartbeatTableRef}>
                  <DataTable
                    variant="accounts"
                    className={`${styles.adminTable} ${styles.machineInventoryTable}`}
                    rows={pageMachines}
                    rowKey={(machine) => machine.id}
                    rowProps={(machine) => machine.machineType === "SMART_IOT" ? { "data-machine-heartbeat-id": machine.id } : {}}
                    columns={[
                      { key: "serial", header: T.MACHINES.SERIAL, align: "left", render: (machine) => <Link className={styles.machineInventoryLink} href={statusFilter === "ALL" ? PATH_ADMIN.MACHINE_DETAIL(machine.id) : { pathname: PATH_ADMIN.MACHINE_DETAIL(machine.id), query: { status: statusFilter } }} title={machine.serialNumber ?? machine.id}>{machine.serialNumber ?? "—"}</Link> },
                      { key: "status", header: T.MACHINES.STATUS, align: "left", render: (machine) => machine.status ? <span className={styles.machinePlainStatus} data-status={machine.status}>{statusLabel(machine.status).replace("Đang triển khai · Owner hợp đồng", "Đang cho thuê").replace("Đang triển khai · Owner cửa hàng", "Đang sử dụng tại cửa hàng")}</span> : "—" },
                      { key: "connection", header: "Kết nối", align: "left", render: (machine) => {
                        if (machine.machineType !== "SMART_IOT") return "—";
                        const query = heartbeatByMachineId.get(machine.id);
                        const state: MachineConnectionState = query?.isError ? "error" : query?.isPending ? "loading" : query?.data?.status ?? "not-requested";
                        return <MachineConnectionBadge state={state} onRetry={query ? () => void query.refetch() : undefined} />;
                      } },
                      { key: "contract-period", header: T.MACHINES.CONTRACT_PERIOD, align: "left", render: (machine) => formatPeriod(machine.contractStartDate, machine.contractEndDate) },
                      { key: "open", header: "", render: (machine) => <ButtonBar rollingLabel href={PATH_ADMIN.MACHINE_DETAIL(machine.id)}>Mở hồ sơ</ButtonBar> },
                    ]}
                  />
                </div>
                <nav className={styles.machinePagination} aria-label="Phân trang máy">
                  <span>{currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, visibleMachines.length)} / {visibleMachines.length} máy</span>
                  <ButtonBar disabled={currentPage === 0} onClick={() => void router.push({ pathname: router.pathname, query: { ...router.query, page: String(currentPage - 1) } }, undefined, { shallow: true })}>Trước</ButtonBar>
                  <span>Trang {currentPage + 1}/{Math.max(1, Math.ceil(visibleMachines.length / 10))}</span>
                  <ButtonBar disabled={(currentPage + 1) * 10 >= visibleMachines.length} onClick={() => void router.push({ pathname: router.pathname, query: { ...router.query, page: String(currentPage + 1) } }, undefined, { shallow: true })}>Sau</ButtonBar>
                </nav>
              </>}
              </section>
            </div>
          </MachineListView>
        )}
      </div>
      {successSerialNumber && (
        <NotificationDialog
          variant="success"
          title={T.MACHINES.CREATE_SUCCESS}
          description={`${T.MACHINES.SERIAL}: ${successSerialNumber}`}
          primaryAction={{ label: T.MACHINES.TITLE, onClick: () => setSuccessSerialNumber("") }}
          onClose={() => setSuccessSerialNumber("")}
        />
      )}
      {successMachineModelCode && (
        <NotificationDialog
          variant="success"
          title={T.MACHINE_MODELS.CREATE_SUCCESS}
          description={`${T.MACHINE_MODELS.MODEL_CODE}: ${successMachineModelCode}`}
          primaryAction={{ label: T.MACHINE_MODELS.TITLE, onClick: () => setSuccessMachineModelCode("") }}
          onClose={() => setSuccessMachineModelCode("")}
        />
      )}
    </AdminShell>
  );
}

export default function MachinesPage() {
  return <MachinesContent />;
}
