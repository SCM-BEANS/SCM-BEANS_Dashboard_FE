import { useQuery } from "@tanstack/react-query";
import { AlertAcknowledgementButton } from "@/components/features/operations/alert-acknowledgement-button";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { notificationsApi } from "@/apis/notifications.api";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const ALERTS_QUERY_KEY = ["dolores", "alerts", authScopedQuerySubject("ADMIN")] as const;

function NotificationContent() {
  const alerts = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
  });

  return (
    <>
      <NotificationInbox
        scope="admin"
        title={ADMIN_MESSAGES.NOTIFICATIONS.TITLE}
        description={ADMIN_MESSAGES.NOTIFICATIONS.DESCRIPTION}
        showOwnerId
        onRefreshExtra={() => alerts.refetch()}
      >
        <section className={styles.panel} aria-labelledby="alerts-list-title">
          <h2 id="alerts-list-title">{ADMIN_MESSAGES.NOTIFICATIONS.ALERTS}</h2>
          <p className={styles.panelSubtitle}>Cảnh báo mức CRITICAL/HIGH có thể được xác nhận tại đây.</p>
          {alerts.isPending && <p role="status">{ADMIN_MESSAGES.NOTIFICATIONS.LOADING}</p>}
          {alerts.isError && (
            <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
              <p>{getApiErrorMessage(alerts.error)}</p>
              <button type="button" onClick={() => void alerts.refetch()}>{ADMIN_MESSAGES.NOTIFICATIONS.RETRY}</button>
            </div>
          )}
          {alerts.data?.length === 0 && (
            <p className={styles.emptyText}>{ADMIN_MESSAGES.NOTIFICATIONS.EMPTY_ALERTS}</p>
          )}
          {alerts.data && alerts.data.length > 0 && (
            <DataTable
              rows={alerts.data}
              rowKey={(alert) => alert.id}
              columns={[
                { key: "level", header: ADMIN_MESSAGES.NOTIFICATIONS.LEVEL, render: (alert) => alert.level },
                { key: "machine", header: ADMIN_MESSAGES.NOTIFICATIONS.MACHINE_ID, render: (alert) => alert.machineId || "—" },
                { key: "time", header: ADMIN_MESSAGES.NOTIFICATIONS.TIME, render: (alert) => alert.ts },
                { key: "content", header: ADMIN_MESSAGES.NOTIFICATIONS.CONTENT, render: (alert) => alert.message },
                { key: "status", header: ADMIN_MESSAGES.NOTIFICATIONS.STATUS, render: (alert) => <StatusBadge tone={alert.acknowledged ? "success" : "danger"}>{alert.acknowledged ? ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACKNOWLEDGED : ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACTIVE}</StatusBadge> },
                { key: "acknowledge", header: "Thao tác", render: (alert) => !alert.acknowledged ? <AlertAcknowledgementButton id={alert.id} level={alert.level} /> : null },
              ]}
            />
          )}
        </section>
      </NotificationInbox>
      <ActionBarConfig>
        <ButtonBar href={PATH_ADMIN.REPORTS}>{ADMIN_MESSAGES.REPORTS.TITLE}</ButtonBar>
      </ActionBarConfig>
    </>
  );
}

export default function AdminNotificationsPage() {
  return <AdminShell><NotificationContent /></AdminShell>;
}
