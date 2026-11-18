import { machineStatusLabel } from "@/components/machines/machine-status-labels";
import { TextLinkButton } from "@/components/button/text-link-button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { machinesApi } from "@/apis/machines.api";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "../technician-shell.module.css";

export function MachineCheckTable() {
  const [draft, setDraft] = useState({ search: "", status: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(0);
  const machines = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const ownerNames = useOwnerNames((machines.data ?? []).map((machine) => (
    typeof machine.ownerName === "string" && machine.ownerName.trim() ? null : machine.ownerId
  )));

  const filtered = (machines.data ?? []).filter(machine => (!filters.status || machine.status === filters.status) && `${machine.serialNumber ?? ""} ${machine.modelName ?? ""} ${machine.id}`.toLocaleLowerCase("vi-VN").includes(filters.search.trim().toLocaleLowerCase("vi-VN")));
  const statuses = [...new Set((machines.data ?? []).map(machine => machine.status).filter(Boolean))];
  return (
    <section className={styles.pageContent} aria-labelledby="technician-machine-check-title">
      <header className={styles.pageHeading}>
        <h1 id="technician-machine-check-title">{T.NAVIGATION.MACHINE_CHECK}</h1>
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
        <form className={styles.filters} onSubmit={event => { event.preventDefault(); setFilters(draft); setPage(0); }}>
          <input aria-label="Tìm máy" placeholder="Tìm serial hoặc mẫu máy" value={draft.search} onChange={event => setDraft(value => ({ ...value, search: event.target.value }))} />
          <select aria-label="Trạng thái máy" value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}><option value="">Tất cả trạng thái</option>{statuses.map(status => <option key={status} value={status!}>{machineStatusLabel(status)}</option>)}</select>
          <ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form>
        {machines.data && (
          <DataTable
            rows={filtered.slice(page * 10, (page + 1) * 10)}
            rowKey={(machine) => machine.id}
            emptyMessage={T.MACHINE_CHECK.EMPTY}
            columns={[
              { key: "machine", header: "Máy", render: (machine) => <TextLinkButton href={PATH_TECHNICIAN.MACHINE_CHECK_DETAIL(machine.id)}>{machine.serialNumber || machine.id}</TextLinkButton> },
              { key: "owner-id", header: "Khách hàng", render: (machine) => (
                (typeof machine.ownerName === "string" && machine.ownerName.trim() ? machine.ownerName.trim() : "")
                  || (machine.ownerId ? ownerNames.data?.[machine.ownerId] : undefined)
                  || "—"
              ) },
              { key: "status", header: T.MACHINE_CHECK.STATUS, render: (machine) => <StatusBadge variant="dot" status={machine.status}>{machineStatusLabel(machine.status)}</StatusBadge> },
              { key: "machine-type", header: T.MACHINE_CHECK.MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Máy thường" : "—" },
            ]}
          />
        )}
        {machines.data && <div className={styles.pagination}><span>{filtered.length} máy · Trang {page + 1}</span><ButtonBar disabled={page === 0} onClick={() => setPage(value => value - 1)}>Trang trước</ButtonBar><ButtonBar disabled={(page + 1) * 10 >= filtered.length} onClick={() => setPage(value => value + 1)}>Trang sau</ButtonBar></div>}
      </section>
    </section>
  );
}
