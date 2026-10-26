import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { CreateMachineRequestSchema, MachineStatusSchema, type CreateMachineRequest } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const STATUSES = MachineStatusSchema.options;
type MachineStatus = z.infer<typeof MachineStatusSchema>;
type StatusFilter = "ALL" | MachineStatus;
type MachineCreateForm = { serialNumber: string; region: string };

const initialMachineForm: MachineCreateForm = { serialNumber: "", region: "" };
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

function MachinesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = queryValue(router.query.view);
  const isCreateView = view === "create";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [form, setForm] = useState<MachineCreateForm>(initialMachineForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [successSerialNumber, setSuccessSerialNumber] = useState("");
  const inventory = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: !isCreateView,
  });
  const summary = useQuery({
    queryKey: ["dolores", "machines", "inventory-summary"],
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
    enabled: !isCreateView,
  });
  const create = useMutation({
    mutationFn: (request: CreateMachineRequest) => machinesApi.create(request),
    onSuccess: (_machine, request) => {
      setRequestError("");
      setSuccessSerialNumber(request.serialNumber);
      setBlockResubmit(false);
      setForm(initialMachineForm);
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] }),
      ]);
      void router.push(PATH_ADMIN.MACHINES, undefined, { shallow: true });
    },
    onError: (error: unknown) => {
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        setRequestError(getApiErrorMessage(error, "mutation"));
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] });
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] });
        return;
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });

  const navigateToList = () => void router.push(PATH_ADMIN.MACHINES, undefined, { shallow: true });
  const navigateToCreate = () => {
    setRequestError("");
    setSuccessSerialNumber("");
    setBlockResubmit(false);
    setForm(initialMachineForm);
    void router.push({ pathname: PATH_ADMIN.MACHINES, query: { view: "create" } }, undefined, { shallow: true });
  };
  const setField = <K extends keyof MachineCreateForm>(key: K, value: MachineCreateForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending || blockResubmit) return;
    setRequestError("");
    const result = CreateMachineRequestSchema.safeParse({
      serialNumber: form.serialNumber,
      region: form.region.trim() || undefined,
      status: "IN_WAREHOUSE",
      cupsServedSinceLastDescale: 0,
    });
    if (!result.success) {
      setRequestError(T.MACHINES.CREATE_INVALID);
      return;
    }
    create.mutate(result.data);
  };

  const visibleMachines = (inventory.data ?? []).filter(
    (machine) => statusFilter === "ALL" || machine.status === statusFilter,
  );
  const countFor = (...statuses: MachineStatus[]) => {
    const counts = summary.data?.statusCounts;
    if (!counts) return "—";
    return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0).toLocaleString("vi-VN");
  };

  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <div className={styles.pageHeading}>
          <h1>{isCreateView ? T.MACHINES.CREATE_TITLE : T.MACHINES.TITLE}</h1>
          <p>{isCreateView ? T.MACHINES.CREATE_DESCRIPTION : T.MACHINES.DESCRIPTION}</p>
        </div>
        {isCreateView ? (
          <form id="machine-create-form" className={`${styles.panel} ${styles.contractForm}`} onSubmit={submit}>
            <h2>{T.MACHINES.CREATE_FORM_TITLE}</h2>
            <div className={styles.operationsGrid}>
              <label>{T.MACHINES.CREATE_SERIAL} *<input required autoComplete="off" value={form.serialNumber} onChange={(event) => setField("serialNumber", event.target.value)} /></label>
              <label>{T.MACHINES.CREATE_REGION}<input value={form.region} onChange={(event) => setField("region", event.target.value)} /></label>
              <div><span>{T.MACHINES.CREATE_INITIAL_STATUS}</span><strong>{STATUS_LABELS.IN_WAREHOUSE} (IN_WAREHOUSE)</strong></div>
              <div><span>{T.MACHINES.CREATE_INITIAL_CUPS}</span><strong>0</strong></div>
            </div>
            {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
            {blockResubmit && <div className={styles.operationsButtons}><ButtonBar type="button" onClick={navigateToList}>{T.MACHINES.CHECK_LIST}</ButtonBar></div>}
          </form>
        ) : (
          <>
            <div className={styles.metricsGrid}>
              <article className={styles.metricCard}><span>{T.MACHINES.TOTAL}</span><strong>{summary.data?.totalMachines?.toLocaleString("vi-VN") ?? "—"}</strong></article>
              <article className={styles.metricCard}><span>{T.MACHINES.WAREHOUSE}</span><strong>{countFor("IN_WAREHOUSE")}</strong></article>
              <article className={styles.metricCard}><span>{T.MACHINES.DEPLOYED}</span><strong>{countFor("DEPLOYED_CONTRACT_OWNER", "DEPLOYED_STORE_OWNER")}</strong></article>
              <article className={styles.metricCard}><span>{T.MACHINES.MAINTENANCE}</span><strong>{countFor("UNDER_MAINTENANCE", "REFURBISHING", "PENDING_QA")}</strong></article>
            </div>

            {summary.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
            {summary.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(summary.error)}</p><button type="button" onClick={() => void summary.refetch()}>{T.COMMON.RETRY}</button></div>}

            <section className={styles.panel}>
              <div className={styles.machineInventoryHeading}>
                <h2>{T.MACHINES.TITLE}</h2>
                {inventory.data && <span className={styles.machineFilterCount} aria-live="polite">{visibleMachines.length} / {inventory.data.length} máy</span>}
              </div>
              <div className={styles.machineFilterToolbar}>
                <label className={styles.machineFilterControl}>
                  <span className={styles.machineFilterLabel}>Trạng thái</span>
                  <select
                    className={styles.machineStatusSelect}
                    aria-label="Lọc máy theo trạng thái"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  >
                    <option value="ALL">{T.MACHINES.FILTER_ALL} trạng thái</option>
                    {STATUSES.map((status) => (
                      <option value={status} key={status}>{STATUS_FILTER_LABELS[status]}</option>
                    ))}
                  </select>
                </label>
              </div>
              {inventory.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
              {inventory.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(inventory.error)}</p><button type="button" onClick={() => void inventory.refetch()}>{T.COMMON.RETRY}</button></div>}
              {inventory.data && visibleMachines.length === 0 && <p className={styles.emptyText}>{inventory.data.length ? T.MACHINES.NO_MATCH : T.COMMON.EMPTY}</p>}
              {inventory.data && visibleMachines.length > 0 && <DataTable
                rows={visibleMachines}
                rowKey={(machine) => machine.id}
                columns={[
                  { key: "id", header: T.MACHINES.MACHINE_ID, render: (machine) => <Link className={styles.accountTextButton} href={PATH_ADMIN.MACHINE_DETAIL(machine.id)} title={machine.id}>{machine.id.slice(0, 8).toUpperCase()}</Link> },
                  { key: "serial", header: T.MACHINES.SERIAL, render: (machine) => machine.serialNumber ?? "—" },
                  { key: "status", header: T.MACHINES.STATUS, render: (machine) => statusLabel(machine.status) },
                  { key: "owner", header: T.MACHINES.OWNER_ID, render: (machine) => machine.ownerId ?? "—", cellProps: (machine) => ({ title: machine.ownerId ?? undefined }) },
                  { key: "region", header: T.MACHINES.REGION, render: (machine) => machine.region ?? "—" },
                  { key: "contract-period", header: T.MACHINES.CONTRACT_PERIOD, render: (machine) => formatPeriod(machine.contractStartDate, machine.contractEndDate) },
                  { key: "deployed-at", header: T.MACHINES.DEPLOYED_AT, render: (machine) => formatDate(machine.deployedAt) },
                ]}
              />}
            </section>
          </>
        )}
      </div>
      {isCreateView ? (
        <ActionBar>
          <ButtonBar type="submit" form="machine-create-form" disabled={create.isPending || blockResubmit}>{create.isPending ? T.MACHINES.CREATING : T.MACHINES.CREATE_SUBMIT}</ButtonBar>
          <ButtonBar type="button" disabled={create.isPending} onClick={navigateToList}>{T.MACHINES.CANCEL}</ButtonBar>
        </ActionBar>
      ) : (
        <ActionBar>
          <ButtonBar type="button" onClick={navigateToCreate}>{T.MACHINES.CREATE}</ButtonBar>
          <ButtonBar href={PATH_ADMIN.IOT}>{T.MACHINES.VIEW_IOT}</ButtonBar>
          <ButtonBar type="button" disabled={inventory.isFetching || summary.isFetching} onClick={() => { void Promise.all([inventory.refetch(), summary.refetch()]); }}>
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
    </AdminShell>
  );
}

export default function MachinesPage() {
  return <MachinesContent />;
}
