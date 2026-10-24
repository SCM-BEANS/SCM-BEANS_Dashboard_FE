import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { DataTable } from "@/components/table/data-table";

import { contractsApi } from "@/apis/contracts.api";

import { tenantsApi } from "@/apis/tenants.api";

import { PATH_MODERATOR } from "@/routes/path";

import { getApiErrorMessage } from "@/lib/api-errors";

import { type ModeratorContract } from "@/schema/contracts.schema";

import { type Tenant } from "@/schema/tenants.schema";

import { moderatorStyles as styles } from "../moderator-shell";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

function QueryFeedback({
  query,
  loadingMessage,
  errorMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
  errorMessage?: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.pageHeading}>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

type TenantContractRead = { tenant: Tenant; contract: ModeratorContract };

type FailedTenantContractRead = { tenant: Tenant; error: unknown };

type TenantContractReads = { contracts: TenantContractRead[]; failedTenants: FailedTenantContractRead[] };

async function readTenantContracts(tenants: Tenant[], signal: AbortSignal): Promise<TenantContractReads> {
  const results: Array<{ tenant: Tenant; contracts: ModeratorContract[] } | FailedTenantContractRead | undefined> =
    new Array(tenants.length);
  let nextIndex = 0;
  const workerCount = Math.min(5, tenants.length);

  const worker = async () => {
    while (!signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tenants.length) return;
      const tenant = tenants[index]!;
      try {
        results[index] = { tenant, contracts: await contractsApi.listByTenant(tenant.id, signal) };
      } catch (error) {
        if (signal.aborted) throw error;
        results[index] = { tenant, error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (signal.aborted) throw new DOMException("The request was cancelled", "AbortError");

  const contracts: TenantContractRead[] = [];
  const failedTenants: FailedTenantContractRead[] = [];
  for (const result of results) {
    if (!result) continue;
    if ("error" in result) failedTenants.push(result);
    else for (const contract of result.contracts) contracts.push({ tenant: result.tenant, contract });
  }
  return { contracts, failedTenants };
}

export function ContractListScreen() {
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    retry: false,
  });
  const tenantIds = tenants.data?.map((tenant) => tenant.id) ?? [];
  const contractReads = useQuery({
    queryKey: ["dolores", "moderator", "contracts-by-tenant", tenantIds],
    queryFn: ({ signal }) => readTenantContracts(tenants.data ?? [], signal),
    enabled: !tenants.isPending && !tenants.isError && tenantIds.length > 0,
    retry: false,
  });
  const tenantById = new Map((tenants.data ?? []).map((tenant) => [tenant.id, tenant]));

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_DESCRIPTION}
      />
      <QueryFeedback query={tenants} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANTS} />
      {tenants.data?.length === 0 && !tenants.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.NO_TENANTS_FOR_CONTRACTS}</p>
      )}
      {tenantIds.length > 0 && (
        <QueryFeedback query={contractReads} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACTS} />
      )}
      {contractReads.data?.failedTenants.length ? (
        <section className={styles.partialNotice} role="status">
          <p>{MODERATOR_MESSAGES.READ_SCREENS.PARTIAL_CONTRACT_FAILURE}</p>
          <ul>
            {contractReads.data.failedTenants.map(({ tenant, error }) => (
              <li key={tenant.id}>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TENANT_FAILURE} {tenant.name}: {getApiErrorMessage(error)}</li>
            ))}
          </ul>
          <button className={styles.retryButton} type="button" onClick={() => void contractReads.refetch()}>
            {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
          </button>
        </section>
      ) : null}
      {contractReads.data?.contracts.length === 0 && contractReads.data.failedTenants.length === 0 && !contractReads.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_CONTRACTS}</p>
      )}
      {contractReads.data && contractReads.data.contracts.length > 0 && (
        <DataTable variant="moderator" headers={[
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID,
          MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PERIOD,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_STATUS,
          MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TYPE,
        ]}>
          {contractReads.data.contracts.map(({ tenant, contract }) => (
            <tr key={contract.id}>
              <td><Link className={styles.tableLink} href={PATH_MODERATOR.CONTRACT_DETAIL(contract.id)}>{contract.id}</Link></td>
              <td>{tenantById.get(tenant.id)?.name ?? tenant.name}<br /><small>{tenant.id}</small></td>
              <td>{contract.startDate ?? "â€”"} â€“ {contract.endDate ?? "â€”"}</td>
              <td>{contract.status}</td>
              <td>{contract.machineTypeSnapshot ?? "â€”"}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

