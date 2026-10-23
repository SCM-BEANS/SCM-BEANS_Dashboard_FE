import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { contractsApi } from "@/apis/contracts.api";
import { locationsApi } from "@/apis/locations.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import type { Contract } from "@/schema/contracts.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { AdminShell, adminStyles as styles } from "./admin-shell";

const PAGE_SIZE = 20;

function errorText(error: unknown): string {
  if (error instanceof z.ZodError) return T.COMMON.INVALID;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return T.COMMON.FORBIDDEN;
    if (error.response?.status === 404) return T.IOT.OWNER_NOT_FOUND;
    if (error.response?.status === 502 || !error.response) return "Không kết nối được tới Dolores. Vui lòng thử lại sau.";
  }
  return T.COMMON.ERROR;
}

function count(value: number | undefined): string {
  return value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function machineTypeFor(machineId: string, ownerContracts: Contract[]): string {
  const types = new Set(ownerContracts
    .filter((contract) => contract.machineId === machineId && contract.status === "ACTIVE")
    .map((contract) => contract.machineTypeSnapshot)
    .filter((value): value is string => Boolean(value)));
  if (types.size === 1) return [...types][0] === "SMART_IOT" ? T.MACHINES.SMART : T.MACHINES.CONVENTIONAL;
  if (types.size > 1) return "Nhiều loại theo hợp đồng";
  return T.MACHINES.UNCLASSIFIED;
}

function IoTContent() {
  const router = useRouter();
  const ownerId = typeof router.query.ownerId === "string" ? router.query.ownerId : "";
  const page = Math.max(0, Number(typeof router.query.page === "string" ? router.query.page : 0) || 0);
  const hasOwnerId = ownerId.length > 0;
  const validOwnerId = router.isReady && ProfileIdSchema.safeParse(ownerId).success;

  const owners = useQuery({
    queryKey: ["dolores", "profiles", "owners", "iot", page],
    queryFn: ({ signal }) => profilesApi.list({ role: "OWNER", page, size: PAGE_SIZE }, signal),
    enabled: router.isReady && !hasOwnerId,
  });
  const profile = useQuery({
    queryKey: ["dolores", "profiles", "owner", ownerId, "iot"],
    queryFn: ({ signal }) => profilesApi.getById(ownerId, signal),
    enabled: validOwnerId,
  });
  const machines = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const contracts = useQuery({
    queryKey: ["dolores", "contracts", "all"],
    queryFn: ({ signal }) => contractsApi.list(signal),
  });
  const locations = useQuery({
    queryKey: ["dolores", "locations", "owner", ownerId],
    queryFn: ({ signal }) => locationsApi.list({ ownerId }, signal),
    enabled: validOwnerId && Boolean(profile.data),
  });

  const navigate = (query: Record<string, string | number | undefined>) => {
    const cleanQuery = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));
    void router.push({ pathname: PATH_ADMIN.IOT, query: cleanQuery }, undefined, { shallow: true });
  };

  const allContracts = contracts.data ?? [];
  const allMachines = machines.data ?? [];
  const ownerRows = owners.data?.items ?? [];
  const maxPage = Math.max(0, (owners.data?.totalPages ?? 1) - 1);

  if (hasOwnerId && !validOwnerId && router.isReady) {
    return <AdminShell><div className={styles.pageContent}>
      <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{T.COMMON.INVALID}</p></div>
    </div><AdminActionBar>
      <ButtonBar type="button" onClick={() => navigate({})}>{T.IOT.BACK}</ButtonBar>
    </AdminActionBar></AdminShell>;
  }

  if (hasOwnerId) {
    const ownerContracts = allContracts.filter((contract) => contract.ownerId === ownerId);
    const ownerMachines = allMachines.filter((machine) => machine.ownerId === ownerId);
    const activeSmartContracts = ownerContracts.filter((contract) => contract.status === "ACTIVE" && contract.machineTypeSnapshot === "SMART_IOT");
    const smartMachineIds = new Set(activeSmartContracts.map((contract) => contract.machineId).filter((id): id is string => Boolean(id)));
    const ownerLocations = (locations.data ?? []).filter((location) => (location.ownerId ?? location.tenantId) === ownerId);

    return <AdminShell>
      <div className={styles.pageContent}>
        <div className={styles.pageHeading}>
          <h1>{profile.data ? `${T.IOT.OWNER_DETAIL}: ${profile.data.fullName}` : T.IOT.OWNER_DETAIL}</h1>
          <p>{T.IOT.DESCRIPTION}</p>
        </div>

        {profile.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
        {profile.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(profile.error)}</p><button type="button" onClick={() => void profile.refetch()}>{T.COMMON.RETRY}</button></div>}
        {profile.data && <>
          <div className={styles.metricsGrid}>
            <article className={styles.metricCard}><span>{T.IOT.STORES}</span><strong>{locations.isError ? "—" : locations.isPending ? "…" : count(ownerLocations.length)}</strong></article>
            <article className={styles.metricCard}><span>{T.IOT.MACHINES}</span><strong>{machines.isError ? "—" : machines.isPending ? "…" : count(ownerMachines.length)}</strong></article>
            <article className={styles.metricCard}><span>{T.IOT.SMART_CONTRACTS}</span><strong>{contracts.isError ? "—" : contracts.isPending ? "…" : count(activeSmartContracts.length)}</strong></article>
            <article className={styles.metricCard}><span>{T.IOT.OWNER}</span><strong>{profile.data.idaasUserId.slice(0, 8).toUpperCase()}</strong></article>
          </div>
          {locations.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(locations.error)}</p><button type="button" onClick={() => void locations.refetch()}>{T.COMMON.RETRY}</button></div>}
          {machines.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(machines.error)}</p><button type="button" onClick={() => void machines.refetch()}>{T.COMMON.RETRY}</button></div>}
          {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(contracts.error)}</p><button type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</button></div>}

          <section className={styles.panel}>
            <h2>{T.IOT.STORES}</h2>
            {locations.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
            {locations.data && ownerLocations.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
            {ownerLocations.length > 0 && <div className={styles.tableScroll}><table className={styles.operationsTable}>
              <thead><tr><th>{T.STORES.NAME}</th><th>{T.STORES.ADDRESS}</th><th>{T.STORES.CITY}</th><th>{T.MACHINES.STATUS}</th></tr></thead>
              <tbody>{ownerLocations.map((location) => <tr key={location.id}><td>{location.name}</td><td>{location.address ?? "—"}</td><td>{location.city ?? "—"}</td><td>{location.active === undefined ? "—" : location.active ? T.STORES.ACTIVE : T.STORES.INACTIVE}</td></tr>)}</tbody>
            </table></div>}
          </section>

          <section className={styles.panel}>
            <h2>{T.IOT.OWNER_DETAIL}</h2>
            {machines.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
            {machines.data && ownerMachines.length === 0 && <p className={styles.emptyText}>{T.IOT.NO_SMART_MACHINES}</p>}
            {ownerMachines.length > 0 && <div className={styles.tableScroll}><table className={styles.operationsTable}>
              <thead><tr><th>{T.MACHINES.SERIAL}</th><th>{T.IOT.MACHINE_TYPE_CONTRACT}</th><th>{T.MACHINES.STATUS}</th><th>{T.MACHINES.REGION}</th><th>{T.MACHINES.DEPLOYED_AT}</th><th>{T.MACHINES.OPEN_DETAIL}</th></tr></thead>
              <tbody>{ownerMachines.map((machine) => <tr key={machine.id}>
                <td>{machine.serialNumber ?? machine.id}</td><td>{machineTypeFor(machine.id, ownerContracts)}</td><td>{machine.status ?? "—"}</td><td>{machine.region ?? "—"}</td><td>{machine.deployedAt ? new Date(machine.deployedAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td><Link className={styles.accountTextButton} href={PATH_ADMIN.MACHINE_DETAIL(machine.id)}>{T.MACHINES.OPEN_DETAIL}</Link></td>
              </tr>)}</tbody>
            </table></div>}
            {smartMachineIds.size === 0 && ownerMachines.length > 0 && <p className={styles.panelSubtitle}>{T.IOT.NO_SMART_MACHINES}</p>}
          </section>
        </>}
      </div>
      <AdminActionBar>
        <ButtonBar type="button" onClick={() => navigate({})}>{T.IOT.BACK}</ButtonBar>
        <ButtonBar href={PATH_ADMIN.MACHINES}>{T.MACHINES.TITLE}</ButtonBar>
        <ButtonBar type="button" disabled={profile.isFetching || machines.isFetching || contracts.isFetching || locations.isFetching} onClick={() => { void Promise.all([profile.refetch(), machines.refetch(), contracts.refetch(), locations.refetch()]); }}>{T.COMMON.RETRY}</ButtonBar>
      </AdminActionBar>
    </AdminShell>;
  }

  return <AdminShell>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}><h1>{T.IOT.TITLE}</h1><p>{T.IOT.DESCRIPTION}</p></div>
      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}><span>{T.IOT.OWNER}</span><strong>{owners.data ? count(owners.data.totalElements) : "—"}</strong></article>
        <article className={styles.metricCard}><span>{T.IOT.MACHINES}</span><strong>{machines.data ? count(machines.data.length) : "—"}</strong></article>
        <article className={styles.metricCard}><span>{T.IOT.SMART_CONTRACTS}</span><strong>{contracts.data ? count(allContracts.filter((contract) => contract.status === "ACTIVE" && contract.machineTypeSnapshot === "SMART_IOT").length) : "—"}</strong></article>
      </div>
      {owners.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {owners.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(owners.error)}</p><button type="button" onClick={() => void owners.refetch()}>{T.COMMON.RETRY}</button></div>}
      {machines.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(machines.error)}</p><button type="button" onClick={() => void machines.refetch()}>{T.COMMON.RETRY}</button></div>}
      {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(contracts.error)}</p><button type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</button></div>}
      {owners.data && <section className={styles.panel}>
        <h2>{T.IOT.OWNER}</h2>
        {ownerRows.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
        {ownerRows.length > 0 && <div className={styles.tableScroll}><table className={styles.operationsTable}>
          <thead><tr><th>{T.COMMON.NAME}</th><th>{T.COMMON.EMAIL}</th><th>{T.MACHINES.OWNER_ID}</th><th>{T.IOT.MACHINES}</th><th>{T.IOT.SMART_CONTRACTS}</th><th>{T.IOT.VIEW_OWNER}</th></tr></thead>
          <tbody>{ownerRows.map((owner) => <tr key={owner.idaasUserId}>
            <td>{owner.fullName || "—"}</td><td>{owner.email || "—"}</td><td title={owner.idaasUserId}>{owner.idaasUserId.slice(0, 8).toUpperCase()}</td>
            <td>{machines.isError ? "—" : machines.isPending ? "…" : count(allMachines.filter((machine) => machine.ownerId === owner.idaasUserId).length)}</td>
            <td>{contracts.isError ? "—" : contracts.isPending ? "…" : count(allContracts.filter((contract) => contract.ownerId === owner.idaasUserId && contract.status === "ACTIVE" && contract.machineTypeSnapshot === "SMART_IOT").length)}</td>
            <td><button className={styles.accountTextButton} type="button" onClick={() => navigate({ ownerId: owner.idaasUserId })}>{T.IOT.VIEW_OWNER}</button></td>
          </tr>)}</tbody>
        </table></div>}
        <div className={styles.operationsPagination}>
          <span>{T.BUSINESSES.PAGE} {page + 1} / {owners.data.totalPages || 1}</span>
          <div><button className={styles.accountSecondaryButton} type="button" disabled={page <= 0} onClick={() => navigate({ page: page - 1 })}>{T.BUSINESSES.PREVIOUS}</button><button className={styles.accountSecondaryButton} type="button" disabled={page >= maxPage} onClick={() => navigate({ page: page + 1 })}>{T.BUSINESSES.NEXT}</button></div>
        </div>
      </section>}
    </div>
    <AdminActionBar>
      <ButtonBar href={PATH_ADMIN.MACHINES}>{T.MACHINES.TITLE}</ButtonBar>
      <ButtonBar type="button" disabled={owners.isFetching || machines.isFetching || contracts.isFetching} onClick={() => { void Promise.all([owners.refetch(), machines.refetch(), contracts.refetch()]); }}>{T.COMMON.RETRY}</ButtonBar>
    </AdminActionBar>
  </AdminShell>;
}

export default function IoTPage() {
  return <IoTContent />;
}
