import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Bell, X } from "lucide-react";
import Link from "next/link";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { notificationsApi } from "@/apis/notifications.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { NOTIFICATION_INBOX_MESSAGES as messages } from "@/text/notification-inbox-messages";
import styles from "./notification-inbox.module.css";

export type NotificationScope = "admin" | "moderator" | "customer" | "technician";

interface NotificationInboxProps {
  scope: NotificationScope;
  variant?: "inbox" | "bell";
  title?: string;
  description?: string;
  viewAllHref?: string;
  back?: BackButtonDestination | null;
  showOwnerId?: boolean;
  onRefreshExtra?: () => Promise<unknown>;
  children?: ReactNode;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function NotificationInbox({
  scope,
  variant = "inbox",
  title,
  description,
  viewAllHref,
  back = null,
  showOwnerId = false,
  onRefreshExtra,
  children,
}: NotificationInboxProps) {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const queryKey = ["notifications", scope] as const;
  const list = useQuery({
    queryKey: [...queryKey, unreadOnly],
    queryFn: ({ signal }) => notificationsApi.list(signal, unreadOnly ? true : undefined),
    enabled: variant === "inbox" || bellOpen,
    retry: false,
  });
  const unreadCount = useQuery({
    queryKey: [...queryKey, "unread-count"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    retry: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    retry: false,
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    retry: false,
    onSuccess: refresh,
  });

  if (variant === "bell") {
    const unreadTotal = unreadCount.data?.unreadCount ?? 0;
    return (
      <div className={styles.bellContainer}>
        <button
          className={styles.bellButton}
          type="button"
          aria-label={`${messages.LIST_TITLE}: ${unreadTotal} ${messages.UNREAD.toLocaleLowerCase()}`}
          aria-expanded={bellOpen}
          aria-controls={`notification-popover-${scope}`}
          onClick={() => setBellOpen((open) => !open)}
        >
          <Bell aria-hidden="true" size={20} />
          {unreadTotal > 0 && (
            <span className={styles.bellBadge} aria-hidden="true">{unreadTotal > 99 ? "99+" : unreadTotal}</span>
          )}
        </button>
        {bellOpen && (
          <section
            className={styles.popover}
            id={`notification-popover-${scope}`}
            aria-label={title ?? messages.LIST_TITLE}
          >
            <header className={styles.popoverHeader}>
              <h2>{title ?? messages.LIST_TITLE}</h2>
              <button
                className={styles.closeButton}
                type="button"
                aria-label={messages.CLOSE}
                onClick={() => setBellOpen(false)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            {unreadCount.isError && (
              <p className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
                {messages.COUNT_ERROR} {getApiErrorMessage(unreadCount.error)}
              </p>
            )}
            {(markOne.isError || markAll.isError) && (
              <p className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
                {messages.MARK_ERROR} {getApiErrorMessage(markOne.error ?? markAll.error, "mutation")}
              </p>
            )}
            {list.isPending && <p className={[styles.notice, styles.loadingNotice].join(" ")} role="status">{messages.LOADING}</p>}
            {list.isError && (
              <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
                <p>{messages.LOAD_ERROR} {getApiErrorMessage(list.error)}</p>
                <button className={styles.retryButton} type="button" onClick={() => void list.refetch()}>
                  {messages.RETRY}
                </button>
              </div>
            )}
            {!list.isPending && !list.isError && !list.data?.length && (
              <p className={[styles.notice, styles.emptyNotice].join(" ")} role="status">{messages.EMPTY}</p>
            )}
            {list.data?.length ? (
              <div className={styles.notificationList}>
                {list.data.slice(0, 5).map((notification) => (
                  <article className={styles.notificationCard} key={notification.id}>
                    <div className={styles.notificationMeta}>
                      <span className={notification.read ? styles.readBadge : styles.unreadBadge}>
                        {notification.read ? messages.READ : messages.UNREAD}
                      </span>
                      <span className={styles.notificationType}>{notification.type}</span>
                      <time dateTime={notification.createdAt ?? undefined}>{formatDate(notification.createdAt)}</time>
                    </div>
                    <h3>{notification.title}</h3>
                    <p>{notification.message}</p>
                    {!notification.read && (
                      <button
                        className={styles.button}
                        disabled={markOne.isPending}
                        onClick={() => markOne.mutate(notification.id)}
                        type="button"
                      >
                        {markOne.isPending && markOne.variables === notification.id ? messages.MARKING : messages.MARK_ONE}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : null}
            {viewAllHref && (
              <Link className={styles.viewAllLink} href={viewAllHref} onClick={() => setBellOpen(false)}>
                {messages.VIEW_ALL}
              </Link>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div className={styles.pageContent}>
      <BackButtonHeading
        back={back}
        title={title ?? messages.LIST_TITLE}
        titleId="notification-inbox-title"
        description={description ?? ""}
        className={styles.pageHeading}
      />

      <section className={styles.panel} aria-labelledby="notification-list-title">
        <h2 id="notification-list-title">{messages.LIST_TITLE}</h2>
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label={messages.FILTER_LABEL}>
            <button
              className={styles.button}
              aria-pressed={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
              type="button"
            >
              {messages.FILTER_ALL}
            </button>
            <button
              className={styles.button}
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(true)}
              type="button"
            >
              {messages.FILTER_UNREAD}
            </button>
          </div>
          <span className={styles.unreadCount} aria-live="polite">
            {messages.UNREAD_COUNT}: {unreadCount.data?.unreadCount ?? "—"}
          </span>
          <div className={styles.filters}>
            <button
              className={styles.button}
              disabled={list.isFetching || unreadCount.isFetching}
              onClick={() => void Promise.all([list.refetch(), unreadCount.refetch(), onRefreshExtra?.()])}
              type="button"
            >
              {messages.REFRESH}
            </button>
            <button
              className={styles.primaryButton}
              disabled={markAll.isPending || (unreadCount.isSuccess && unreadCount.data.unreadCount === 0)}
              onClick={() => markAll.mutate()}
              type="button"
            >
              {markAll.isPending ? messages.MARKING : messages.MARK_ALL}
            </button>
          </div>
        </div>

        {unreadCount.isError && (
          <p className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            {messages.COUNT_ERROR} {getApiErrorMessage(unreadCount.error)}
          </p>
        )}
        {(markOne.isError || markAll.isError) && (
          <p className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            {messages.MARK_ERROR} {getApiErrorMessage(markOne.error ?? markAll.error, "mutation")}
          </p>
        )}
        {markOne.isSuccess && (
          <p className={[styles.notice, styles.successNotice].join(" ")} role="status">{messages.MARKED_ONE}</p>
        )}
        {markAll.isSuccess && (
          <p className={[styles.notice, styles.successNotice].join(" ")} role="status">{messages.MARKED_ALL}</p>
        )}
        {list.isPending && (
          <p className={[styles.notice, styles.loadingNotice].join(" ")} role="status">{messages.LOADING}</p>
        )}
        {list.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{messages.LOAD_ERROR} {getApiErrorMessage(list.error)}</p>
            <button className={styles.retryButton} type="button" onClick={() => void list.refetch()}>
              {messages.RETRY}
            </button>
          </div>
        )}
        {!list.isPending && !list.isError && !list.data?.length && (
          <p className={[styles.notice, styles.emptyNotice].join(" ")} role="status">{messages.EMPTY}</p>
        )}

        {list.data?.length ? (
          <div className={styles.notificationList}>
            {list.data.map((notification) => (
              <article className={styles.notificationCard} key={notification.id}>
                <div className={styles.notificationMeta}>
                  <span className={notification.read ? styles.readBadge : styles.unreadBadge}>
                    {notification.read ? messages.READ : messages.UNREAD}
                  </span>
                  <span className={styles.notificationType}>{notification.type}</span>
                  {showOwnerId && notification.ownerId && (
                    <span className={styles.ownerId}>{messages.OWNER_ID}: {notification.ownerId}</span>
                  )}
                  <time dateTime={notification.createdAt ?? undefined}>{formatDate(notification.createdAt)}</time>
                </div>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                {!notification.read && (
                  <button
                    className={styles.button}
                    disabled={markOne.isPending}
                    onClick={() => markOne.mutate(notification.id)}
                    type="button"
                  >
                    {markOne.isPending && markOne.variables === notification.id ? messages.MARKING : messages.MARK_ONE}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {children ? <div className={styles.extraContent}>{children}</div> : null}
    </div>
  );
}

