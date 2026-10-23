import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ZodError } from "zod";
import { notificationsApi } from "@/apis/notifications.api";
import { ButtonBar } from "@/components/button/button-bar";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import type { Notification } from "@/schema/notifications.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "./admin-shell";

const NOTIFICATIONS_QUERY_KEY = ["dolores", "notifications"] as const;
const ALERTS_QUERY_KEY = ["dolores", "alerts"] as const;

function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return ADMIN_MESSAGES.NOTIFICATIONS.INVALID;
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return ADMIN_MESSAGES.OVERVIEW.FORBIDDEN;
  }
  return ADMIN_MESSAGES.NOTIFICATIONS.ERROR;
}

function NotificationContent() {
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState("");
  const notifications = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: ({ signal }) => notificationsApi.list(signal),
  });
  const alerts = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: async (updatedNotification) => {
      queryClient.setQueryData<Notification[]>(NOTIFICATIONS_QUERY_KEY, (current) =>
        current?.map((item) =>
          item.id === updatedNotification.id ? updatedNotification : item,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      setStatusMessage(ADMIN_MESSAGES.NOTIFICATIONS.READ_SUCCESS);
    },
    onError: () => setStatusMessage(ADMIN_MESSAGES.NOTIFICATIONS.READ_ERROR),
  });

  return (
    <>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{ADMIN_MESSAGES.NOTIFICATIONS.TITLE}</h1>
        <p>{ADMIN_MESSAGES.NOTIFICATIONS.DESCRIPTION}</p>
      </div>
      {statusMessage && (
        <p className={markRead.isError ? styles.accountInlineWarning : styles.notice} role={markRead.isError ? "alert" : "status"}>
          {statusMessage}
        </p>
      )}

      <section className={styles.panel} aria-labelledby="notification-list-title">
        <h2 id="notification-list-title">{ADMIN_MESSAGES.NOTIFICATIONS.ITEMS}</h2>
        {notifications.isPending && <p role="status">{ADMIN_MESSAGES.NOTIFICATIONS.LOADING}</p>}
        {notifications.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{errorMessage(notifications.error)}</p>
            <button type="button" onClick={() => void notifications.refetch()}>{ADMIN_MESSAGES.NOTIFICATIONS.RETRY}</button>
          </div>
        )}
        {notifications.data?.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.NOTIFICATIONS.EMPTY_NOTIFICATIONS}</p>
        )}
        {notifications.data && notifications.data.length > 0 && (
          <div className={styles.tableScroll}>
            <table className={styles.operationsTable}>
              <thead>
                <tr>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.SUBJECT}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.OWNER_ID}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.TIME}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.STATUS}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.MARK_READ}</th>
                </tr>
              </thead>
              <tbody>
                {notifications.data.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong><br />{item.message}</td>
                    <td>{item.ownerId || "—"}</td>
                    <td>{item.createdAt}</td>
                    <td>{item.read ? ADMIN_MESSAGES.NOTIFICATIONS.READ : ADMIN_MESSAGES.NOTIFICATIONS.UNREAD}</td>
                    <td>
                      <button
                        className={styles.accountSecondaryButton}
                        type="button"
                        disabled={item.read || markRead.isPending}
                        onClick={() => {
                          setStatusMessage("");
                          markRead.mutate(item.id);
                        }}
                      >
                        {markRead.isPending && markRead.variables === item.id
                          ? ADMIN_MESSAGES.NOTIFICATIONS.MARKING_READ
                          : ADMIN_MESSAGES.NOTIFICATIONS.MARK_READ}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="alerts-list-title">
        <h2 id="alerts-list-title">{ADMIN_MESSAGES.NOTIFICATIONS.ALERTS}</h2>
        <p className={styles.panelSubtitle}>{ADMIN_MESSAGES.NOTIFICATIONS.ALERT_READ_ONLY}</p>
        {alerts.isPending && <p role="status">{ADMIN_MESSAGES.NOTIFICATIONS.LOADING}</p>}
        {alerts.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{errorMessage(alerts.error)}</p>
            <button type="button" onClick={() => void alerts.refetch()}>{ADMIN_MESSAGES.NOTIFICATIONS.RETRY}</button>
          </div>
        )}
        {alerts.data?.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.NOTIFICATIONS.EMPTY_ALERTS}</p>
        )}
        {alerts.data && alerts.data.length > 0 && (
          <div className={styles.tableScroll}>
            <table className={styles.operationsTable}>
              <thead>
                <tr>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.LEVEL}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.MACHINE_ID}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.TIME}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.CONTENT}</th>
                  <th>{ADMIN_MESSAGES.NOTIFICATIONS.STATUS}</th>
                </tr>
              </thead>
              <tbody>
                {alerts.data.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.level}</td>
                    <td>{alert.machineId || "—"}</td>
                    <td>{alert.ts}</td>
                    <td>{alert.message}</td>
                    <td>{alert.acknowledged ? ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACKNOWLEDGED : ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACTIVE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
    <AdminActionBar>
      <ButtonBar href={PATH_ADMIN.REPORTS}>
        {ADMIN_MESSAGES.REPORTS.TITLE}
      </ButtonBar>
      <ButtonBar
        type="button"
        disabled={notifications.isFetching || alerts.isFetching}
        onClick={() => void Promise.all([notifications.refetch(), alerts.refetch()])}
      >
        {ADMIN_MESSAGES.NOTIFICATIONS.RETRY}
      </ButtonBar>
    </AdminActionBar>
    </>
  );
}

export default function AdminNotificationsPage() {
  return <AdminShell><NotificationContent /></AdminShell>;
}
