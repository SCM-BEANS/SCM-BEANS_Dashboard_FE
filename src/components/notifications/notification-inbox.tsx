import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, Search, X } from "lucide-react";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { PageActions } from "@/components/action-bar/page-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import type { SidebarLogoutProps } from "@/components/sidebar/sidebar";
import { notificationsApi } from "@/apis/notifications.api";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { formatNotificationDate as formatDate, getNotificationPresentation, NOTIFICATION_INBOX_MESSAGES as messages } from "@/text/notification-inbox-messages";
import { getNotificationRecordHref, useMarkNotificationAsRead } from "./notification-runtime";
import styles from "./notification-inbox.module.css";
import { NotificationBell } from "./notification-bell";
import { NotificationTypeIcon } from "./notification-type-icon";
import management from "./notification-management.module.css";

export type NotificationScope = "admin" | "moderator" | "customer" | "technician";

export interface NotificationInboxProps {
  scope: NotificationScope;
  variant?: "inbox" | "bell" | "management";
  initialSection?: "notifications" | "alerts";
  title?: string;
  description?: string;
  viewAllHref?: string;
  settingsHref?: string;
  logout?: SidebarLogoutProps;
  back?: BackButtonDestination | null;
  showOwnerId?: boolean;
  onRefreshExtra?: () => Promise<unknown>;
  children?: ReactNode;
}

export { formatNotificationDate as formatDate } from "@/text/notification-inbox-messages";

function notificationDay(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Chưa có thời gian";
  const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  const now = new Date();
  const day = calendar.format(new Date(value));
  if (day === calendar.format(now)) return "Hôm nay";
  if (day === calendar.format(new Date(now.getTime() - 86_400_000))) return "Hôm qua";
  return "Trước đó";
}

export function NotificationInbox(props: NotificationInboxProps) {
  return props.variant === "bell" ? <NotificationBell {...props} /> : <NotificationInboxContent {...props} />;
}

function NotificationInboxContent({
  scope,
  variant = "inbox",
  initialSection = "notifications",
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
  const [section, setSection] = useState(initialSection);
  const [draft, setDraft] = useState({ search: "", type: "", read: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null | undefined>();
  const detailRef = useRef<HTMLElement>(null);
  const roleScope = scope === "customer" ? "OWNER" : scope.toUpperCase();
  const queryKey = ["notifications", scope, authScopedQuerySubject(roleScope)] as const;
  const list = useQuery({
    queryKey: [...queryKey, unreadOnly],
    queryFn: ({ signal }) => notificationsApi.list(signal, unreadOnly ? true : undefined),
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
  const markOne = useMarkNotificationAsRead(scope);
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    retry: false,
    onSuccess: refresh,
  });
  const notifications = list.data?.map((notification) => ({
    ...notification,
    ...getNotificationPresentation(notification),
    recordHref: getNotificationRecordHref(scope, notification),
  }));

  if (variant === "management") {
    const filtered = (notifications ?? []).filter((item) => (!filters.type || item.typeLabel === filters.type)
      && (!filters.read || item.read === (filters.read === "read"))
      && (!filters.search || `${item.title} ${item.message}`.toLocaleLowerCase("vi-VN").includes(filters.search.toLocaleLowerCase("vi-VN"))))
      .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
    const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 10) - 1));
    const rows = filtered.slice(currentPage * 10, currentPage * 10 + 10);
    const selected = list.isSuccess && selectedId !== null ? rows.find((item) => item.id === selectedId) ?? rows[0] : undefined;
    const selectNotification = (notification: { id: string; read: boolean }, focusDetail = false) => {
      setSelectedId(notification.id);
      if (!notification.read && !markOne.isPending) markOne.mutate(notification.id);
      if (focusDetail || window.matchMedia("(max-width: 1100px)").matches) requestAnimationFrame(() => { detailRef.current?.focus(); detailRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); });
    };
    return <div className={management.screen}>
      <header className={management.heading}>
        <BackButtonHeading back={back} title={title ?? "Thông báo"} titleId="notification-inbox-title" description={description ?? "Theo dõi thông báo và cảnh báo máy trong hệ thống."} />
        <ButtonBar disabled={list.isFetching || unreadCount.isFetching} onClick={() => void Promise.all([list.refetch(), unreadCount.refetch(), onRefreshExtra?.()])}>{list.isFetching || unreadCount.isFetching ? "Đang làm mới…" : messages.REFRESH}</ButtonBar>
      </header>
      {children ? <div className={management.tabs} role="group" aria-label="Phạm vi thông báo">
        <button type="button" aria-pressed={section === "notifications"} onClick={() => setSection("notifications")}>Thông báo</button>
        <button type="button" aria-pressed={section === "alerts"} onClick={() => setSection("alerts")}>Cảnh báo máy</button>
      </div> : null}
      {section === "notifications" ? <div className={management.workspace} data-detail={Boolean(selected)}><section className={management.feed} aria-labelledby="notification-list-title">
        <div className={management.panelHeading}>
          <div><h2 id="notification-list-title">Danh sách thông báo</h2><p aria-live="polite">{unreadCount.isSuccess ? `${unreadCount.data.unreadCount} chưa đọc` : unreadCount.isError ? "Chưa tải được số thông báo chưa đọc" : "Đang tải số thông báo chưa đọc…"}{list.isSuccess ? ` · ${filtered.length} thông báo trong danh sách` : ""}</p></div>
          <button className={management.readAll} disabled={markAll.isPending || markOne.isPending || !unreadCount.isSuccess || unreadCount.data.unreadCount === 0} onClick={() => markAll.mutate()}>{markAll.isPending ? messages.MARKING : messages.MARK_ALL}</button>
        </div>
        <form className={management.feedFilters} onSubmit={(event) => { event.preventDefault(); setFilters((value) => ({ ...value, search: draft.search.trim() })); setPage(0); setSelectedId(undefined); }}>
          <label className={management.search}><Search size={18} aria-hidden="true" /><input aria-label="Tìm thông báo" placeholder="Tìm thông báo" value={draft.search} onChange={(event) => setDraft((value) => ({ ...value, search: event.target.value }))} /><button type="submit" aria-label="Tìm kiếm"><Search size={18} aria-hidden="true" /></button></label>
          <select aria-label="Loại thông báo" value={filters.type} onChange={(event) => { setFilters((value) => ({ ...value, type: event.target.value })); setPage(0); setSelectedId(undefined); }}><option value="">Tất cả loại</option>{Array.from(new Set(notifications?.map((item) => item.typeLabel) ?? [])).map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <div className={management.readFilters} role="group" aria-label="Trạng thái thông báo">{[{ value: "", label: "Tất cả" }, { value: "unread", label: messages.UNREAD }, { value: "read", label: messages.READ }].map((option) => <button key={option.value} type="button" aria-pressed={filters.read === option.value} onClick={() => { setFilters((value) => ({ ...value, read: option.value })); setPage(0); setSelectedId(undefined); }}>{option.label}</button>)}</div>
        </form>
        {unreadCount.isError ? <p className={management.error} role="alert">{messages.COUNT_ERROR} {getApiErrorMessage(unreadCount.error)}</p> : null}
        {markOne.isError || markAll.isError ? <p className={management.error} role="alert">{messages.MARK_ERROR} {getApiErrorMessage(markOne.error ?? markAll.error, "mutation")}</p> : null}
        {markOne.isSuccess || markAll.isSuccess ? <p className={management.feedback} role="status">{markAll.isSuccess ? messages.MARKED_ALL : messages.MARKED_ONE}</p> : null}
        {list.isPending ? <p className={management.empty} role="status">{messages.LOADING}</p> : list.isError ? <div className={management.error} role="alert"><p>{messages.LOAD_ERROR} {getApiErrorMessage(list.error)}</p><ButtonBar onClick={() => void list.refetch()}>{messages.RETRY}</ButtonBar></div> : !filtered.length ? <p className={management.empty}>Không có thông báo phù hợp với bộ lọc.</p> : <div className={management.list}>
          {rows.map((notification, index) => <Fragment key={notification.id}>
            {(index === 0 || notificationDay(notification.createdAt) !== notificationDay(rows[index - 1].createdAt)) ? <h3 className={management.dayHeading}>{notificationDay(notification.createdAt)}</h3> : null}
            <article className={management.item} data-selected={selected?.id === notification.id}>
              <button id={`notification-open-${notification.id}`} type="button" className={management.openNotification} aria-pressed={selected?.id === notification.id} aria-controls={selected ? "notification-detail" : undefined} onClick={() => selectNotification(notification)}>
                <NotificationTypeIcon label={notification.typeLabel} /><span className={management.rowContent}><strong>{notification.title}</strong><span className={management.preview}>{notification.message}</span><time dateTime={notification.createdAt ?? undefined}>{formatDate(notification.createdAt)}</time></span>
              </button>
              {!notification.read ? <span className={management.unreadDot} role="img" aria-label="Chưa đọc" /> : null}
              <details className={management.rowMenu} onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.open = false; }}>
                <summary aria-label={`Thao tác thông báo: ${notification.title}`}><MoreHorizontal size={20} aria-hidden="true" /></summary>
                <div className={management.menuContent}><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); selectNotification(notification, true); }}>Xem chi tiết</button></div>
              </details>
            </article>
          </Fragment>)}
        </div>}
        {list.isSuccess && filtered.length > 0 ? <nav className={management.pagination} aria-label="Phân trang thông báo"><span className={management.pageSize}>10 thông báo / trang</span><span>Trang {currentPage + 1} / {Math.max(1, Math.ceil(filtered.length / 10))}</span><ButtonBar disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelectedId(undefined); }}>Trang trước</ButtonBar><ButtonBar disabled={(currentPage + 1) * 10 >= filtered.length} onClick={() => { setPage(currentPage + 1); setSelectedId(undefined); }}>Trang sau</ButtonBar></nav> : null}
      </section>{selected ? <aside id="notification-detail" ref={detailRef} tabIndex={-1} className={management.detailPane} aria-labelledby="notification-detail-title">
        <header><h2 id="notification-detail-title">Chi tiết thông báo</h2><button className={management.closeDetail} aria-label="Đóng chi tiết thông báo" onClick={() => { document.getElementById(`notification-open-${selected.id}`)?.focus(); setSelectedId(null); }}><X size={20} aria-hidden="true" /></button></header>
        <div className={management.detailMeta}><span className={management.readState} data-unread={!selected.read}>{selected.read ? messages.READ : messages.UNREAD}</span><time dateTime={selected.createdAt ?? undefined}>{formatDate(selected.createdAt)}</time></div>
        <h3>{selected.title}</h3>
        <section className={management.detailContent} aria-label="Nội dung thông báo"><h4>Nội dung</h4><p className={management.detailBody}>{selected.message}</p></section>
        <dl className={management.detailFacts}><div><dt>Loại thông báo</dt><dd>{selected.typeLabel}</dd></div>{showOwnerId && selected.ownerId ? <div><dt>{messages.OWNER_ID}</dt><dd><TruncatedId value={selected.ownerId} /></dd></div> : null}</dl>
        {selected.recordHref ? <footer className={management.detailActions}><ButtonBar href={selected.recordHref} rollingLabel>Mở hồ sơ</ButtonBar></footer> : null}
      </aside> : null}</div> : children}
    </div>;
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
            {notifications?.map((notification) => (
              <article className={[styles.notificationCard, notification.read ? "" : styles.unreadCard].join(" ")} key={notification.id}>
                <div className={styles.notificationMeta}>
                  <span className={notification.read ? styles.readBadge : styles.unreadBadge}>
                    {notification.read ? messages.READ : messages.UNREAD}
                  </span>
                  <span className={styles.notificationType}>{notification.typeLabel}</span>
                  {showOwnerId && notification.ownerId && (
                    <span className={styles.ownerId}>{messages.OWNER_ID}: {notification.ownerId}</span>
                  )}
                  <time dateTime={notification.createdAt ?? undefined}>{formatDate(notification.createdAt)}</time>
                </div>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
                {notification.recordHref ? <ButtonBar href={notification.recordHref} rollingLabel>Mở hồ sơ</ButtonBar> : null}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <PageActions actions={[{ id: "notifications-read-all", label: messages.MARK_ALL, variant: "secondary", pending: markAll.isPending, pendingLabel: messages.MARKING, disabled: unreadCount.isSuccess && unreadCount.data.unreadCount === 0, disabledReason: "Không có thông báo chưa đọc.", onClick: () => markAll.mutate() }]} />
      {children ? <div className={styles.extraContent}>{children}</div> : null}
    </div>
  );
}

