import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Link from "next/link";

import { DataTable } from "@/components/table/data-table";

import { notificationsApi } from "@/apis/notifications.api";

import { PATH_MODERATOR } from "@/routes/path";

import { getApiErrorMessage } from "@/lib/api-errors";

import { moderatorStyles as styles } from "../moderator-shell";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

const numberFormat = new Intl.NumberFormat("vi-VN");

const countFormat = (value: number | null | undefined) =>
  value == null ? "â€”" : numberFormat.format(value);

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

export function NotificationsScreen() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["dolores", "notifications"],
    queryFn: ({ signal }) => notificationsApi.list(signal),
  });
  const unreadCount = useQuery({
    queryKey: ["dolores", "notifications", "unread-count"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "notifications"] });
    },
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATIONS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATIONS_DESCRIPTION}
      />
      <section className={styles.pendingNotice} aria-label={MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT}>
        <strong>{MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT}</strong>
        <QueryFeedback
          query={unreadCount}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_UNREAD_COUNT}
          errorMessage={MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT_UNAVAILABLE + " " + getApiErrorMessage(unreadCount.error)}
        />
        {!unreadCount.isPending && !unreadCount.isError && (
          <p style={{ marginBottom: 0, fontSize: 24 }}>
            {countFormat(unreadCount.data?.unreadCount)}
          </p>
        )}
      </section>
      <section className={styles.pendingNotice} aria-labelledby="moderator-notification-list">
        <h2 id="moderator-notification-list">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_LIST}</h2>
        <Link href={PATH_MODERATOR.NOTIFICATION_ALERTS}>
          {MODERATOR_MESSAGES.READ_SCREENS.VIEW_ALERTS}
        </Link>
        <QueryFeedback
          query={notifications}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_NOTIFICATIONS}
        />
        {markReadMutation.isError && (
          <p className={styles.partialNotice} role="alert" aria-live="assertive">
            {MODERATOR_MESSAGES.READ_SCREENS.MARK_READ_ERROR} {getApiErrorMessage(markReadMutation.error, "mutation")}
          </p>
        )}
        {notifications.data?.length === 0 && !notifications.isError && (
          <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_NOTIFICATIONS}</p>
        )}
        {notifications.data && notifications.data.length > 0 && (
          <DataTable variant="moderator" headers={[
            MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TITLE,
            MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_CONTENT,
            MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TYPE,
            MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TIME,
            MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_STATUS,
          ]}>
            {notifications.data.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.message}</td>
                <td>{item.type}</td>
                <td>{item.createdAt ?? "â€”"}</td>
                <td>
                  {item.read ? MODERATOR_MESSAGES.READ_SCREENS.READ : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span>{MODERATOR_MESSAGES.READ_SCREENS.UNREAD}</span>
                      <button
                        className={styles.retryButton}
                        type="button"
                        disabled={markReadMutation.isPending}
                        onClick={() => markReadMutation.mutate(item.id)}
                      >
                        {markReadMutation.isPending && markReadMutation.variables === item.id
                          ? MODERATOR_MESSAGES.READ_SCREENS.MARKING_READ
                          : MODERATOR_MESSAGES.READ_SCREENS.MARK_READ}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}

