import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { DataTable } from "@/components/table/data-table";

import { tenantsApi } from "@/apis/tenants.api";

import { PATH_MODERATOR } from "@/routes/path";

import { getApiErrorMessage } from "@/lib/api-errors";

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

export function TenantListScreen() {
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_DESCRIPTION}
      />
      <QueryFeedback query={tenants} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANTS} />
      {tenants.data?.length === 0 && !tenants.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_TENANTS}</p>
      )}
      {tenants.data && tenants.data.length > 0 && (
        <DataTable variant="moderator" headers={[
          MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME,
          MODERATOR_MESSAGES.READ_SCREENS.TENANT_ID,
          MODERATOR_MESSAGES.READ_SCREENS.TENANT_TYPE,
          MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT,
          "HĂ nh Ä‘á»™ng",
        ]}>
          {tenants.data.map((tenant) => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.id}</td>
              <td>{tenant.type ?? "â€”"}</td>
              <td>{tenant.billingExempt == null
                ? "â€”"
                : tenant.billingExempt
                  ? MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_YES
                  : MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_NO}</td>
              <td><Link className={styles.tableLink} href={PATH_MODERATOR.CUSTOMER_DETAIL(tenant.id)}>Chi tiáº¿t</Link></td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}

