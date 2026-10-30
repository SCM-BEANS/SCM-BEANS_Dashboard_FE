import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { machinesApi } from "@/apis/machines.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import { MachineIdSchema, type Machine } from "@/schema/machines.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import styles from "../technician-shell.module.css";

type MachineStatus = NonNullable<Machine["status"]>;

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

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function getMachineTypeLabel(machineType: Machine["machineType"]): string {
  if (machineType === "SMART_IOT") return "Smart IoT";
  if (machineType === "CONVENTIONAL") return "Máy thường";
  return "—";
}

function getStatusLabel(status: Machine["status"]): string {
  return status ? STATUS_LABELS[status] ?? status : "—";
}

function MachineDetailFields({ machine }: { machine: Machine }) {
  const fields = [
    [T.MACHINE_CHECK.ID, machine.id],
    [T.MACHINE_CHECK.OWNER_ID, machine.ownerId],
    [T.MACHINE_CHECK.SERIAL, machine.serialNumber],
    [T.MACHINE_CHECK.STATUS, getStatusLabel(machine.status)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.DEPLOYED_AT, formatDate(machine.deployedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.NEXT_MAINTENANCE_AT, formatDate(machine.nextPreventiveMaintenanceAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.CUPS_SINCE_DESCALE, formatNumber(machine.cupsServedSinceLastDescale)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.REGION, machine.region],
    [T.MACHINE_CHECK.DETAIL_FIELDS.LOCATION_ID, machine.locationId],
    [T.MACHINE_CHECK.MACHINE_TYPE, getMachineTypeLabel(machine.machineType)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPED_AT, formatDate(machine.machineTypeMappedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPED_BY, machine.machineTypeMappedBy],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPING_REASON, machine.machineTypeMappingReason],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_ID, machine.modelId],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPED_AT, formatDate(machine.modelMappedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPED_BY, machine.modelMappedBy],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPING_REASON, machine.modelMappingReason],
  ] as const;

  return (
    <div className={styles.machineDetailGrid}>
      {fields.map(([label, value]) => (
        <div className={styles.machineDetailField} key={label}>
          <span>{label}</span>
          <strong>{value || "—"}</strong>
        </div>
      ))}
    </div>
  );
}

export function TechnicianMachineDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const machineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validId = router.isReady && MachineIdSchema.safeParse(machineId).success;
  const machineQueryKey = ["dolores", "machines", "technician-detail", machineId] as const;
  const machine = useQuery({
    queryKey: machineQueryKey,
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId,
  });
  const statusUpdate = useMutation({
    mutationFn: () => {
      return machinesApi.markReady(machineId, { reason: T.MACHINE_CHECK.STATUS_UPDATE_REASON });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: machineQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] }),
      ]);
    },
  });

  const actionBar = (showRefresh: boolean) => (
    <ActionBar label={`Thao tác ${T.MACHINE_CHECK.DETAIL_TITLE}`}>
      <ButtonBar href={PATH_TECHNICIAN.MACHINE_CHECK}>{T.MACHINE_CHECK.BACK_TO_LIST}</ButtonBar>
      <ButtonBar
        disabled={
          !machine.data
          || !machine.data.serialNumber
          || machine.data.status !== "IN_WAREHOUSE"
          || machine.isError
          || machine.isPending
          || statusUpdate.isPending
        }
        onClick={() => statusUpdate.mutate()}
      >
        {statusUpdate.isPending ? T.MACHINE_CHECK.STATUS_UPDATING : T.MACHINE_CHECK.UPDATE_STATUS}
      </ButtonBar>
      {showRefresh && (
        <ButtonBar disabled={machine.isFetching} onClick={() => void machine.refetch()}>
          {machine.isFetching ? T.MACHINE_CHECK.LOADING : T.MACHINE_CHECK.RETRY}
        </ButtonBar>
      )}
    </ActionBar>
  );
  const heading = (title: string = T.MACHINE_CHECK.DETAIL_TITLE, description?: string) => (
    <BackButtonHeading
      title={title}
      titleId="technician-machine-detail-title"
      description={description}
      className={styles.pageHeading}
      back={{ label: T.MACHINE_CHECK.BACK_TO_LIST, fallbackHref: PATH_TECHNICIAN.MACHINE_CHECK }}
    />
  );

  if (!router.isReady) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p></section>
      {actionBar(false)}
    </TechnicianShell>;
  }

  if (!validId) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<div className={styles.machineCheckError} role="alert"><p>{T.MACHINE_CHECK.INVALID_ID}</p></div></section>
      {actionBar(false)}
    </TechnicianShell>;
  }

  if (machine.isPending) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p></section>
      {actionBar(true)}
    </TechnicianShell>;
  }

  if (machine.isError) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading()}
        <div className={styles.machineCheckError} role="alert">
          <p>{getApiErrorMessage(machine.error)}</p>
          <button className={styles.machineCheckRetry} type="button" onClick={() => void machine.refetch()}>{T.MACHINE_CHECK.RETRY}</button>
        </div>
      </section>
      {actionBar(true)}
    </TechnicianShell>;
  }

  if (!machine.data) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading()}
        <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.NOT_FOUND}</p>
      </section>
      {actionBar(false)}
    </TechnicianShell>;
  }

  const device = machine.data;
  return (
    <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading(`${T.MACHINE_CHECK.DETAIL_TITLE} · ${device.serialNumber ?? device.id}`, device.id)}
        {statusUpdate.isSuccess && <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.STATUS_UPDATE_SUCCESS}</p>}
        {statusUpdate.isError && (
          <div className={styles.machineCheckError} role="alert">
            <p>{getApiErrorMessage(statusUpdate.error)}</p>
            {device.status === "IN_WAREHOUSE" ? (
              <button className={styles.machineCheckRetry} type="button" onClick={() => statusUpdate.mutate()}>
                {T.MACHINE_CHECK.UPDATE_STATUS}
              </button>
            ) : null}
          </div>
        )}
        <section className={styles.machineCheckPanel} aria-labelledby="technician-machine-profile-title">
          <h2 id="technician-machine-profile-title">{T.MACHINE_CHECK.TABLE_TITLE}</h2>
          <MachineDetailFields machine={device} />
          {device.status !== "IN_WAREHOUSE" ? (
            <p className={styles.pendingNotice} role="status">
              Chỉ xác nhận sẵn sàng cho máy đang ở trạng thái Trong kho. Máy hiện tại không đủ điều kiện.
            </p>
          ) : null}
        </section>
      </section>
      {actionBar(true)}
    </TechnicianShell>
  );
}
