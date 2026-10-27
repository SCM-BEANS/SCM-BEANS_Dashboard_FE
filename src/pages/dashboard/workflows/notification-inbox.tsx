import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { notificationsApi } from "@/apis/notifications.api";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

export function NotificationInbox({ back }: { back?: BackButtonDestination | null }) {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useQuery({
    queryKey: ["owner-notifications", unreadOnly],
    queryFn: ({ signal }) => notificationsApi.list(signal, unreadOnly ? true : undefined),
  });
  const unreadCount = useQuery({
    queryKey: ["owner-notification-unread-count"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-notification-unread-count"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-notification-unread-count"] });
    },
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <BackButtonHeading
        back={back ?? null}
        title={messages.NOTIFICATIONS_TITLE}
        titleId="customer-workflow-title"
        description={messages.NOTIFICATIONS_DESCRIPTION}
        className={styles.pageHeading}
      />
      <div className={styles.dataPanel}>
        <div className={styles.actionRow} role="group" aria-label={messages.NOTIFICATIONS_FILTER_LABEL}>
          <button className={styles.secondaryButton} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} type="button">
            {messages.NOTIFICATIONS_FILTER_ALL}
          </button>
          <button className={styles.secondaryButton} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} type="button">
            {messages.NOTIFICATIONS_FILTER_UNREAD}
          </button>
          <span>{messages.NOTIFICATIONS_UNREAD_COUNT}: {unreadCount.data?.unreadCount ?? "—"}</span>
          <button
            className={styles.primaryButton}
            disabled={markAll.isPending || (unreadCount.isSuccess && unreadCount.data.unreadCount === 0)}
            onClick={() => markAll.mutate()}
            type="button"
          >
            {messages.NOTIFICATIONS_MARK_ALL}
          </button>
        </div>
        {markOne.isError || markAll.isError ? <p className={styles.errorNotice} role="alert">{messages.NOTIFICATIONS_MARK_ERROR}</p> : null}
        {markOne.isSuccess ? <p className={styles.successNotice} role="status">{messages.NOTIFICATIONS_MARKED_ONE}</p> : null}
        {markAll.isSuccess ? <p className={styles.successNotice} role="status">{messages.NOTIFICATIONS_MARKED_ALL}</p> : null}
        {list.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {list.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p> : null}
        {!list.isPending && !list.isError && !list.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.NOTIFICATIONS_EMPTY}</p>
          : null}
        {list.data?.length ? (
          <div className={styles.recordList}>
            {list.data.map((notification) => (
              <article className={styles.recordCard} key={notification.id}>
                <div className={styles.notificationCard}>
                  <div className={styles.notificationMeta}>
                    <span className={styles.unreadBadge}>
                      {notification.read ? messages.NOTIFICATIONS_READ_BADGE : messages.NOTIFICATIONS_UNREAD_BADGE}
                    </span>
                    <span>{notification.type}</span>
                    <time dateTime={notification.createdAt ?? undefined}>
                      {notification.createdAt ? new Date(notification.createdAt).toLocaleString("vi-VN") : "—"}
                    </time>
                  </div>
                  <h2>{notification.title}</h2>
                  <p>{notification.message}</p>
                </div>
                {!notification.read ? (
                  <button
                    className={styles.secondaryButton}
                    disabled={markOne.isPending}
                    onClick={() => markOne.mutate(notification.id)}
                    type="button"
                  >
                    {messages.NOTIFICATIONS_MARK_ONE}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
