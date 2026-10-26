import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { profilesApi } from "@/apis/profiles.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
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

export function CustomerProfileDetailScreen({ id }: { id: string }) {
  const validId = ProfileIdSchema.safeParse(id).success;
  const profile = useQuery({
    queryKey: ["dolores", "profiles", "id", id],
    queryFn: ({ signal }) => profilesApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMER_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMERS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={profile} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_PROFILE} />}
      {profile.data && !profile.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NAME}</dt>
              <dd>{profile.data.fullName || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_ID}</dt>
              <dd>{profile.data.idaasUserId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_EMAIL}</dt>
              <dd>{profile.data.email || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE}</dt>
              <dd>{profile.data.phone || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_ROLES}</dt>
              <dd>{profile.data.roles.join(", ") || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS}</dt>
              <dd>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS_LABELS[profile.data.status]}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_EMAIL_VERIFIED}</dt>
              <dd>{profile.data.emailVerified ? "Có" : "Không"}</dd>
            </div>
          </dl>
          <Link className={styles.tableLink} href={PATH_MODERATOR.CUSTOMERS}>
            Quay lại danh sách khách hàng
          </Link>
        </>
      )}
    </div>
  );
}
