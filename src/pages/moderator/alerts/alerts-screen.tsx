import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";


import { DataTable } from "@/components/table/data-table";

import { notificationsApi } from "@/apis/notifications.api";

import { ModeratorPageHeading } from "../moderator-page-heading";

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

export function AlertsScreen() {
  const queryClient = useQueryClient();
  const [ackError, setAckError] = useState<string | null>(null);
  const alerts = useQuery({
    queryKey: ["dolores", "alerts"],
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
  });
  const acknowledge = useMutation({
    mutationFn: notificationsApi.acknowledgeAlert,
    onMutate: () => setAckError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dolores", "alerts"] }),
    onError: (error) => setAckError(getApiErrorMessage(error)),
  });

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.ALERTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.ALERTS_DESCRIPTION}
      />
      <p className={styles.pendingNotice} role="note">
        {MODERATOR_MESSAGES.READ_SCREENS.ALERT_SCOPE_NOTICE}
      </p>
      <section className={styles.pendingNotice} aria-labelledby="moderator-alert-list">
        <h2 id="moderator-alert-list">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_LIST}</h2>
        <QueryFeedback
          query={alerts}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_ALERTS}
        />
        {alerts.data?.length === 0 && !alerts.isError && (
          <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_ALERTS}</p>
        )}
        {alerts.data && alerts.data.length > 0 && (
          <DataTable variant="moderator" headers={[
            MODERATOR_MESSAGES.READ_SCREENS.ALERT_LEVEL,
            MODERATOR_MESSAGES.READ_SCREENS.MACHINE_ID,
            MODERATOR_MESSAGES.READ_SCREENS.ALERT_TIME,
            MODERATOR_MESSAGES.READ_SCREENS.ALERT_CONTENT,
            MODERATOR_MESSAGES.READ_SCREENS.ALERT_STATUS,
            MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACTION,
          ]}>
            {alerts.data.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.level}</td>
                <td>{alert.machineId ?? "â€”"}</td>
                <td>{alert.ts}</td>
                <td>{alert.message}</td>
                <td>{alert.acknowledged
                  ? MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACKNOWLEDGED
                  : MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACTIVE}</td>
                <td>
                  {!alert.acknowledged && (
                    <button
                      className={styles.retryButton}
                      type="button"
                      disabled={acknowledge.isPending}
                      onClick={() => acknowledge.mutate(alert.id)}
                    >
                      {acknowledge.isPending && acknowledge.variables === alert.id
                        ? MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACKNOWLEDGING
                        : MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACKNOWLEDGE}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
      {ackError && <p className={styles.pendingNotice} role="alert">{ackError}</p>}
    </div>
  );
}

