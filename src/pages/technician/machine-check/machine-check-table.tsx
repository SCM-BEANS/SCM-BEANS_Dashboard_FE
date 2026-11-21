import headingStyles from "@/components/heading/dashboard-page.module.css";
import { ButtonBar } from "@/components/button/button-bar";
import { machineStatusLabel } from "@/components/machines/machine-status-labels";
import { TextLinkButton } from "@/components/button/text-link-button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TableFilters } from "@/components/table/table-filters";
import { Pagination } from "@/components/pagination/pagination";
import { Panel } from "@/components/panel/panel";
import { MachineListView } from "@/components/machines/machine-list-view";
import { SectionTabList } from "@/components/tabs/section-tab-list";
import { machinesApi } from "@/apis/machines.api";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "../technician-shell.module.css";

export function MachineCheckTable() {
  const queryClient = useQueryClient();
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
      <div className={headingStyles.headingWithActionsEnd}>
      <header className={styles.pageHeading}>
        <h1 id="technician-machine-check-title">Quản lý máy</h1>
      </header>
      <PageActionsRenderer actions={[{ id: "refresh", label: "Làm mới", onClick: () => void queryClient.refetchQueries({ type: "active", predicate: (query) => query.queryKey[0] === "dolores" && ((query.queryKey[1] === "machines" && query.queryKey[2] === "inventory") || (query.queryKey[1] === "profiles" && query.queryKey[2] === "owner-names")) }) }]} />
      </div>
      <MachineListView labelledBy="technician-machine-check-title">
      <SectionTabList aria-label="Chọn danh sách máy"><ButtonBar type="button" aria-pressed="true">Danh sách máy</ButtonBar></SectionTabList>
      <Panel title={T.MACHINE_CHECK.TABLE_TITLE}>
        {machines.isPending && <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p>}
        {machines.isError && (
          <div className={styles.machineCheckError} role="alert">
            <p>{getApiErrorMessage(machines.error)}</p>
            <ButtonBar className={styles.machineCheckRetry} type="button" onClick={() => void machines.refetch()}>
              {T.MACHINE_CHECK.RETRY}
            </ButtonBar>
          </div>
        )}
        <TableFilters
          search={{ ariaLabel: T.MACHINE_CHECK.SEARCH_LABEL, placeholder: T.MACHINE_CHECK.SEARCH_PLACEHOLDER, value: draft.search, onChange: (search) => setDraft((value) => ({ ...value, search })) }}
          selects={[{
            id: "machine-status",
            ariaLabel: T.MACHINE_CHECK.STATUS_FILTER,
            value: draft.status,
            options: [
              { value: "", label: T.MACHINE_CHECK.STATUS_ALL },
              ...statuses.map((status) => ({ value: status!, label: machineStatusLabel(status) })),
            ],
            onChange: (status) => setDraft((value) => ({ ...value, status })),
          }]}
          submitLabel={T.MACHINE_CHECK.FILTER_SUBMIT}
          onSubmit={(event) => { event.preventDefault(); setFilters(draft); setPage(0); }}
        />
        {machines.data && (
          <DataTable
            rows={filtered.slice(page * 10, (page + 1) * 10)}
            rowKey={(machine) => machine.id}
            emptyMessage={T.MACHINE_CHECK.EMPTY}
            columns={[
              { key: "machine", header: "Serial", kind: "code", noWrap: true, render: (machine) => <TextLinkButton href={PATH_TECHNICIAN.MACHINE_CHECK_DETAIL(machine.id)}>{machine.serialNumber || machine.id}</TextLinkButton> },
              { key: "owner-id", header: "Khách hàng", kind: "name", render: (machine) => (
                (typeof machine.ownerName === "string" && machine.ownerName.trim() ? machine.ownerName.trim() : "")
                  || (machine.ownerId ? ownerNames.data?.[machine.ownerId] : undefined)
                  || "—"
              ) },
              { key: "status", header: T.MACHINE_CHECK.STATUS, render: (machine) => <StatusBadge variant="dot" status={machine.status}>{machineStatusLabel(machine.status)}</StatusBadge> },
              { key: "machine-type", header: T.MACHINE_CHECK.MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Máy thường" : "—" },
            ]}
          />
        )}
        {machines.data && <div className={styles.pagination}><span>{filtered.length} máy</span><Pagination page={page} hasNext={(page + 1) * 10 < filtered.length} ariaLabel={T.MACHINE_CHECK.PAGINATION_LABEL} previousLabel={T.MACHINE_CHECK.PREVIOUS} nextLabel={T.MACHINE_CHECK.NEXT} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} hideWhenSinglePage={false} onPageChange={setPage} /></div>}
      </Panel>
      </MachineListView>
    </section>
  );
}
