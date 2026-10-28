import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { machinesApi } from "@/apis/machines.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { MachineInventoryItem } from "@/schema/machines.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import styles from "../technician-shell.module.css";

type MachineStatus = NonNullable<MachineInventoryItem["status"]>;

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

export function MachineCheckTable() {
  const machines = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="technician-machine-check-title">
      <header className={styles.pageHeading}>
        <h1 id="technician-machine-check-title">{T.NAVIGATION.MACHINE_CHECK}</h1>
        <p>{T.ROUTES.MACHINE_CHECK_DESCRIPTION}</p>
      </header>
      <section className={styles.machineCheckPanel}>
        <h2>{T.MACHINE_CHECK.TABLE_TITLE}</h2>
        {machines.isPending && <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p>}
        {machines.isError && (
          <div className={styles.machineCheckError} role="alert">
            <p>{getApiErrorMessage(machines.error)}</p>
            <button className={styles.machineCheckRetry} type="button" onClick={() => void machines.refetch()}>
              {T.MACHINE_CHECK.RETRY}
            </button>
          </div>
        )}
        {machines.data && (
          <DataTable
            rows={machines.data}
            rowKey={(machine) => machine.id}
            emptyMessage={T.MACHINE_CHECK.EMPTY}
            columns={[
              { key: "id", header: T.MACHINE_CHECK.ID, render: (machine) => (
                <Link className={styles.machineCheckIdLink} href={PATH_TECHNICIAN.MACHINE_CHECK_DETAIL(machine.id)}>
                  {machine.id}
                </Link>
              ) },
              { key: "owner-id", header: T.MACHINE_CHECK.OWNER_ID, render: (machine) => machine.ownerId ?? "—" },
              { key: "serial", header: T.MACHINE_CHECK.SERIAL, render: (machine) => machine.serialNumber ?? "—" },
              { key: "status", header: T.MACHINE_CHECK.STATUS, render: (machine) => machine.status ? STATUS_LABELS[machine.status] ?? machine.status : "—" },
              { key: "machine-type", header: T.MACHINE_CHECK.MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Máy thường" : "—" },
            ]}
          />
        )}
      </section>
      <ActionBar label={`Thao tác ${T.NAVIGATION.MACHINE_CHECK}`}>
        <ButtonBar disabled={machines.isFetching} onClick={() => void machines.refetch()}>
          {machines.isFetching ? T.MACHINE_CHECK.LOADING : T.MACHINE_CHECK.RETRY}
        </ButtonBar>
      </ActionBar>
    </section>
  );
}
