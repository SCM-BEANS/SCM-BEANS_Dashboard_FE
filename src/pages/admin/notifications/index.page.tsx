import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { notificationsApi } from "@/apis/notifications.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const ALERTS_QUERY_KEY = ["dolores", "alerts"] as const;

function NotificationContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationDetailOpen = Boolean(router.query.notificationId);
  const alerts = useQuery({
    queryKey: ALERTS_QUERY_KEY,
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
  });
  const acknowledge = useMutation({
    mutationFn: (id: string) => notificationsApi.acknowledgeAlert(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
    },
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
          <p className={styles.panelSubtitle}>Xác nhận sẽ đóng sự cố cảnh báo CRITICAL/HIGH tương ứng.</p>
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
              headerVariant="admin"
              rows={alerts.data}
              rowKey={(alert) => alert.id}
              columns={[
                { key: "level", header: ADMIN_MESSAGES.NOTIFICATIONS.LEVEL, render: (alert) => alert.level },
                { key: "machine", header: ADMIN_MESSAGES.NOTIFICATIONS.MACHINE_ID, render: (alert) => alert.machineId || "—" },
                { key: "time", header: ADMIN_MESSAGES.NOTIFICATIONS.TIME, render: (alert) => alert.ts },
                { key: "content", header: ADMIN_MESSAGES.NOTIFICATIONS.CONTENT, render: (alert) => alert.message },
                { key: "status", header: ADMIN_MESSAGES.NOTIFICATIONS.STATUS, render: (alert) => alert.acknowledged ? ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACKNOWLEDGED : ADMIN_MESSAGES.NOTIFICATIONS.ALERT_ACTIVE },
                { key: "actions", header: "Thao tác", render: (alert) => alert.acknowledged ? "—" : (
                  <button
                    type="button"
                    className={styles.accountTextButton}
                    disabled={acknowledge.isPending}
                    onClick={() => acknowledge.mutate(alert.id)}
                  >
                    {acknowledge.isPending && acknowledge.variables === alert.id ? "Đang xác nhận…" : "Xác nhận cảnh báo"}
                  </button>
                ) },
              ]}
            />
          )}
          {acknowledge.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(acknowledge.error, "mutation")}</p>}
        </section>
      </NotificationInbox>
      {!notificationDetailOpen && (
        <ActionBar>
          <ButtonBar href={PATH_ADMIN.REPORTS}>{ADMIN_MESSAGES.REPORTS.TITLE}</ButtonBar>
        </ActionBar>
      )}
    </>
  );
}

export default function AdminNotificationsPage() {
  return <AdminShell><NotificationContent /></AdminShell>;
}
