import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { MachineStatusSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getMachinesBackDestination } from "../admin-back-destination";
import { CreateMachineForm } from "./create-machine-form";
import { CreateMachineModelForm } from "./create-machine-model-form";
import { MachineModelDetail } from "./machine-model-detail";
import { MachineInventorySummary } from "./machine-inventory-summary";

const STATUSES = MachineStatusSchema.options;
type MachineStatus = z.infer<typeof MachineStatusSchema>;
type StatusFilter = "ALL" | MachineStatus;
const queryValue = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

const STATUS_LABELS: Record<MachineStatus, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

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
  return status ? STATUS_LABELS[status] : "Chưa có trạng thái";
}

function machineTypeLabel(machineType: string | null | undefined): string {
  if (machineType === "SMART_IOT") return T.MACHINES.SMART;
  if (machineType === "CONVENTIONAL") return T.MACHINES.CONVENTIONAL;
  return T.MACHINES.UNCLASSIFIED;
}

function MachinesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = queryValue(router.query.view);
  const isCreateView = view === "create";
  const isCreateMachineModelView = view === "create-model";
  const isMachineTypesView = view === "types";
  const isMachineModelDetailView = view === "model-detail";
  const machineModelId = queryValue(router.query.id);
  const requestedStatus = queryValue(router.query.status);
  const statusFilter: StatusFilter = requestedStatus === "ALL" || STATUSES.includes(requestedStatus as MachineStatus)
    ? requestedStatus as StatusFilter
    : "ALL";
  const [successSerialNumber, setSuccessSerialNumber] = useState("");
  const [successMachineModelCode, setSuccessMachineModelCode] = useState("");
  const inventory = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isCreateView && !isCreateMachineModelView && !isMachineTypesView && !isMachineModelDetailView,
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
    (machine) => statusFilter === "ALL" || machine.status === statusFilter,
  );
  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <BackButtonHeading
          title={isCreateView
            ? T.MACHINES.CREATE_TITLE
            : isCreateMachineModelView
              ? T.MACHINE_MODELS.CREATE_TITLE
              : isMachineModelDetailView
                ? T.MACHINE_MODELS.DETAIL
                : T.MACHINES.TITLE}
          titleId="admin-machines-title"
          description={isCreateView ? T.MACHINES.CREATE_DESCRIPTION : undefined}
          className={styles.pageHeading}
          back={isMachineModelDetailView ? null : getMachinesBackDestination(router.query)}
        />
        {isCreateView ? (
          <CreateMachineForm onCancel={() => navigateToMachineView("inventory")} onCreated={handleMachineCreated} />
        ) : isCreateMachineModelView ? (
          <CreateMachineModelForm onCancel={navigateToMachineTypes} onCreated={handleMachineModelCreated} />
        ) : isMachineModelDetailView ? (
          <MachineModelDetail modelId={machineModelId} />
        ) : (
          <>
            <MachineInventorySummary />

            <div className={styles.machineInventoryGroup}>
              <div className={styles.machineViewTabs} role="group" aria-label="Chọn danh sách máy">
                <button
                  type="button"
                  className={`${styles.machineViewTab} ${!isMachineTypesView ? styles.machineViewTabActive : ""}`}
                  aria-pressed={!isMachineTypesView}
                  onClick={() => navigateToMachineView("inventory")}
                >
                  {T.MACHINES.TITLE}
                </button>
                <button
                  type="button"
                  className={`${styles.machineViewTab} ${isMachineTypesView ? styles.machineViewTabActive : ""}`}
                  aria-pressed={isMachineTypesView}
                  onClick={() => navigateToMachineView("types")}
                >
                  {T.MACHINE_MODELS.TITLE}
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
              {!isMachineTypesView && <div className={styles.machineFilterToolbar}>
                <label className={styles.machineFilterControl}>
                  <span className={styles.machineFilterLabel}>Trạng thái</span>
                  <select
                    className={styles.machineStatusSelect}
                    aria-label="Lọc máy theo trạng thái"
                    value={statusFilter}
                    onChange={(event) => {
                      const nextStatus = event.target.value as StatusFilter;
                      void router.push({
                        pathname: PATH_ADMIN.MACHINES,
                        query: nextStatus === "ALL" ? {} : { status: nextStatus },
                      }, undefined, { shallow: true });
                    }}
                  >
                    <option value="ALL">{T.MACHINES.FILTER_ALL} trạng thái</option>
                    {STATUSES.map((status) => (
                      <option value={status} key={status}>{STATUS_FILTER_LABELS[status]}</option>
                    ))}
                  </select>
                </label>
              </div>}
              {!isMachineTypesView && inventory.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {!isMachineTypesView && inventory.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(inventory.error)}</p><button type="button" onClick={() => void inventory.refetch()}>{T.COMMON.RETRY}</button></div>}
              {isMachineTypesView && machineModels.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {isMachineTypesView && machineModels.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machineModels.error)}</p><button type="button" onClick={() => void machineModels.refetch()}>{T.COMMON.RETRY}</button></div>}
              {inventory.data && !isMachineTypesView && visibleMachines.length === 0 && <p className={styles.emptyText}>{inventory.data.length ? T.MACHINES.NO_MATCH : T.COMMON.EMPTY}</p>}
              {isMachineTypesView && machineModels.data?.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
              {isMachineTypesView && machineModels.data && machineModels.data.length > 0 && <>
                <p className={styles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>
                <DataTable
                  className={styles.adminTable}
                  rows={machineModels.data}
                  rowKey={(machineModel) => machineModel.id}
                  columns={[
                    { key: "model-code", header: T.MACHINE_MODELS.MODEL_CODE, render: (machineModel) => (
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
                  ]}
                />
              </>}
              {inventory.data && !isMachineTypesView && visibleMachines.length > 0 && <>
                <p className={styles.adminTableHint}>Vuốt ngang để xem đầy đủ cột.</p>
                <DataTable
                  className={styles.adminTable}
                  rows={visibleMachines}
                  rowKey={(machine) => machine.id}
                  columns={[
                    { key: "id", header: T.MACHINES.MACHINE_ID, render: (machine) => <Link className={styles.accountTextButton} href={statusFilter === "ALL" ? PATH_ADMIN.MACHINE_DETAIL(machine.id) : { pathname: PATH_ADMIN.MACHINE_DETAIL(machine.id), query: { status: statusFilter } }} title={machine.id}>{machine.id.slice(0, 8).toUpperCase()}</Link> },
                    { key: "serial", header: T.MACHINES.SERIAL, render: (machine) => machine.serialNumber ?? "—" },
                    { key: "status", header: T.MACHINES.STATUS, render: (machine) => statusLabel(machine.status) },
                    { key: "owner", header: T.MACHINES.OWNER_ID, render: (machine) => machine.ownerId ?? "—", cellProps: (machine) => ({ title: machine.ownerId ?? undefined }) },
                    { key: "region", header: T.MACHINES.REGION, render: (machine) => machine.region ?? "—" },
                    { key: "contract-period", header: T.MACHINES.CONTRACT_PERIOD, render: (machine) => formatPeriod(machine.contractStartDate, machine.contractEndDate) },
                    { key: "deployed-at", header: T.MACHINES.DEPLOYED_AT, render: (machine) => formatDate(machine.deployedAt) },
                  ]}
                />
              </>}
              </section>
            </div>
          </>
        )}
      </div>
      {isCreateView || isCreateMachineModelView || isMachineModelDetailView ? null : (
        <ActionBar>
          <ButtonBar type="button" onClick={navigateToCreate}>{T.MACHINES.CREATE}</ButtonBar>
          <ButtonBar type="button" onClick={navigateToCreateMachineModel}>{T.MACHINE_MODELS.CREATE}</ButtonBar>
          <ButtonBar href={PATH_ADMIN.IOT}>{T.MACHINES.VIEW_IOT}</ButtonBar>
          <ButtonBar
            type="button"
            disabled={isMachineTypesView ? machineModels.isFetching : inventory.isFetching}
            onClick={() => {
              if (isMachineTypesView) {
                void machineModels.refetch();
              } else {
                void Promise.all([
                  inventory.refetch(),
                  queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] }),
                ]);
              }
            }}
          >
            {T.COMMON.RETRY}
          </ButtonBar>
        </ActionBar>
      )}
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
