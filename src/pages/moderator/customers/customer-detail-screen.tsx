import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { tenantsApi } from "@/apis/tenants.api";

import { PATH_MODERATOR } from "@/routes/path";

import { getApiErrorMessage } from "@/lib/api-errors";

import { TenantIdSchema } from "@/schema/tenants.schema";

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

export function TenantDetailScreen({ id }: { id: string }) {
  const validId = TenantIdSchema.safeParse(id).success;
  const tenant = useQuery({
    queryKey: ["dolores", "tenants", "id", id],
    queryFn: ({ signal }) => tenantsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.TENANT_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={tenant} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANT} />}
      {tenant.data && !tenant.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME}</dt><dd>{tenant.data.name}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_ID}</dt><dd>{tenant.data.id}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_TYPE}</dt><dd>{tenant.data.type ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT}</dt><dd>{tenant.data.billingExempt == null
              ? "â€”"
              : tenant.data.billingExempt
                ? MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_YES
                : MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_NO}</dd></div>
          </dl>
          <Link className={styles.tableLink} href={PATH_MODERATOR.CUSTOMERS}>Quay láº¡i danh sĂ¡ch khĂ¡ch hĂ ng</Link>
        </>
      )}
    </div>
  );
}

