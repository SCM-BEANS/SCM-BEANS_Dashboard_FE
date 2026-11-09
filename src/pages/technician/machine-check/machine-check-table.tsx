import { machineStatusLabel } from "@/components/machines/machine-status-labels";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { machinesApi } from "@/apis/machines.api";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import styles from "../technician-shell.module.css";

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
              { key: "status", header: T.MACHINE_CHECK.STATUS, render: (machine) => machineStatusLabel(machine.status) },
              { key: "machine-type", header: T.MACHINE_CHECK.MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Máy thường" : "—" },
            ]}
          />
        )}
      </section>
    </section>
  );
}
