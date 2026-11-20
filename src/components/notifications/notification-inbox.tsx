import { SectionTabList } from "@/components/tabs/section-tab-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TextLinkButton } from "@/components/button/text-link-button";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { PageActions } from "@/components/action-bar/page-actions";
import { Panel } from "@/components/panel/panel";
import { Pagination } from "@/components/pagination/pagination";
import { TableFilters } from "@/components/table/table-filters";
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
  const currentInboxPage = Math.min(page, Math.max(0, Math.ceil((notifications?.length ?? 0) / 10) - 1));
  const inboxRows = (notifications ?? []).slice(currentInboxPage * 10, currentInboxPage * 10 + 10);

  if (variant === "management") {
    const filtered = (notifications ?? []).filter((item) => (!filters.type || item.typeLabel === filters.type)
      && (!filters.read || item.read === (filters.read === "read"))
      && (!filters.search || `${item.title} ${item.message}`.toLocaleLowerCase("vi-VN").includes(filters.search.toLocaleLowerCase("vi-VN"))))
      .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
    const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 10) - 1));
    const rows = filtered.slice(currentPage * 10, currentPage * 10 + 10);
    const selected = list.isSuccess && selectedId !== null ? rows.find((item) => item.id === selectedId) ?? rows[0] : undefined;
    const selectNotification = (notification: { id: string; read: boolean }) => {
      setSelectedId(notification.id);
      if (!notification.read && !markOne.isPending) markOne.mutate(notification.id);
      if (window.matchMedia("(max-width: 1100px)").matches) requestAnimationFrame(() => { detailRef.current?.focus(); detailRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); });
    };
    return <div className={management.screen}>
      <header className={management.heading}>
        <BackButtonHeading back={back} title={title ?? "Thông báo"} titleId="notification-inbox-title" description={description} />
        <ButtonBar disabled={list.isFetching || unreadCount.isFetching} onClick={() => void Promise.all([list.refetch(), unreadCount.refetch(), onRefreshExtra?.()])}>{list.isFetching || unreadCount.isFetching ? "Đang làm mới…" : messages.REFRESH}</ButtonBar>
      </header>
      {children ? <SectionTabList role="group" aria-label="Phạm vi thông báo">
        <button type="button" aria-pressed={section === "notifications"} onClick={() => setSection("notifications")}>Thông báo</button>
        <button type="button" aria-pressed={section === "alerts"} onClick={() => setSection("alerts")}>Cảnh báo máy</button>
      </SectionTabList> : null}
      {section === "notifications" ? <div className={management.workspace} data-detail={Boolean(selected)}><Panel className={management.feed} aria-labelledby="notification-list-title">
        <div className={management.panelHeading}>
          <div><h2 id="notification-list-title">Danh sách thông báo</h2><p aria-live="polite">{unreadCount.isSuccess ? `${unreadCount.data.unreadCount} chưa đọc` : unreadCount.isError ? "Chưa tải được số thông báo chưa đọc" : "Đang tải số thông báo chưa đọc…"}{list.isSuccess ? ` · ${filtered.length} thông báo trong danh sách` : ""}</p></div>
          <button className={management.readAll} disabled={markAll.isPending || markOne.isPending || !unreadCount.isSuccess || unreadCount.data.unreadCount === 0} onClick={() => markAll.mutate()}>{markAll.isPending ? messages.MARKING : messages.MARK_ALL}</button>
        </div>
        <TableFilters
          search={{ ariaLabel: messages.SEARCH_NOTIFICATIONS, placeholder: messages.SEARCH_NOTIFICATIONS_PLACEHOLDER, value: draft.search, onChange: (search) => setDraft((value) => ({ ...value, search })) }}
          selects={[{ id: "notification-type", ariaLabel: messages.FILTER_NOTIFICATION_TYPE, value: filters.type, options: [{ value: "", label: messages.FILTER_ALL_NOTIFICATION_TYPES }, ...Array.from(new Set(notifications?.map((item) => item.typeLabel) ?? [])).map((value) => ({ value, label: value }))], onChange: (type) => { setFilters((value) => ({ ...value, type })); setPage(0); setSelectedId(undefined); } }]}
          toggleGroup={{ ariaLabel: messages.FILTER_READ_STATE, value: filters.read, options: [{ value: "", label: messages.FILTER_ALL }, { value: "unread", label: messages.UNREAD }, { value: "read", label: messages.READ }], onChange: (read) => { setFilters((value) => ({ ...value, read })); setPage(0); setSelectedId(undefined); } }}
          submitLabel="Tìm kiếm"
          onSubmit={() => { setFilters((value) => ({ ...value, search: draft.search.trim() })); setPage(0); setSelectedId(undefined); }}
        />
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
            </article>
          </Fragment>)}
        </div>}
        {list.isSuccess && filtered.length > 0 ? <Pagination
          page={currentPage}
          hasNext={(currentPage + 1) * 10 < filtered.length}
          ariaLabel={messages.PAGINATE_NOTIFICATIONS}
          onPageChange={(nextPage) => { setPage(nextPage); setSelectedId(undefined); }}
          previousLabel={messages.PREVIOUS_PAGE}
          nextLabel={messages.NEXT_PAGE}
          totalPages={Math.max(1, Math.ceil(filtered.length / 10))}
          hideWhenSinglePage={false}
        ><span className={management.pageSize}>{messages.NOTIFICATIONS_PER_PAGE}</span></Pagination> : null}
      </Panel>{selected ? <aside id="notification-detail" ref={detailRef} tabIndex={-1} className={management.detailPane} aria-labelledby="notification-detail-title">
        <header><h2 id="notification-detail-title">Chi tiết thông báo</h2><button className={management.closeDetail} aria-label="Đóng chi tiết thông báo" onClick={() => { document.getElementById(`notification-open-${selected.id}`)?.focus(); setSelectedId(null); }}><X size={20} aria-hidden="true" /></button></header>
        <div className={management.detailMeta}><span className={management.readState} data-unread={!selected.read}>{selected.read ? messages.READ : messages.UNREAD}</span><time dateTime={selected.createdAt ?? undefined}>{formatDate(selected.createdAt)}</time></div>
        <h3>{selected.recordHref ? <TextLinkButton href={selected.recordHref}>{selected.title}</TextLinkButton> : selected.title}</h3>
        <section className={management.detailContent} aria-label="Nội dung thông báo"><h4>Nội dung</h4><p className={management.detailBody}>{selected.message}</p></section>
        <dl className={management.detailFacts}><div><dt>Loại thông báo</dt><dd>{selected.typeLabel}</dd></div>{showOwnerId && selected.ownerId ? <div><dt>{messages.OWNER_ID}</dt><dd><TruncatedId value={selected.ownerId} /></dd></div> : null}</dl>
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

      <Panel className={styles.notificationPanel} aria-labelledby="notification-list-title">
        <h2 id="notification-list-title">{messages.LIST_TITLE}</h2>
        <TableFilters className={styles.toolbar} showSubmit={false} toggleGroup={{
          ariaLabel: messages.FILTER_LABEL,
          value: unreadOnly ? "unread" : "all",
          options: [{ value: "all", label: messages.FILTER_ALL }, { value: "unread", label: messages.FILTER_UNREAD }],
          onChange: (value) => { setUnreadOnly(value === "unread"); setPage(0); },
        }}>
          <span className={styles.unreadCount} aria-live="polite">
            {messages.UNREAD_COUNT}: {unreadCount.data?.unreadCount ?? "—"}
          </span>
          <ButtonBar
            type="button"
            disabled={list.isFetching || unreadCount.isFetching}
            onClick={() => void Promise.all([list.refetch(), unreadCount.refetch(), onRefreshExtra?.()])}
          >
            {messages.REFRESH}
          </ButtonBar>
        </TableFilters>

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
            {inboxRows.map((notification) => (
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
                <h3>{notification.recordHref ? <TextLinkButton href={notification.recordHref}>{notification.title}</TextLinkButton> : notification.title}</h3>
                <p>{notification.message}</p>
              </article>
            ))}
          </div>
        ) : null}
        {list.data?.length ? <Pagination page={currentInboxPage} hasNext={(currentInboxPage + 1) * 10 < list.data.length} ariaLabel={messages.PAGINATE_NOTIFICATIONS} onPageChange={setPage} previousLabel={messages.PREVIOUS_PAGE} nextLabel={messages.NEXT_PAGE} totalPages={Math.max(1, Math.ceil(list.data.length / 10))} hideWhenSinglePage={false}><span>{messages.NOTIFICATIONS_PER_PAGE}</span></Pagination> : null}
      </Panel>

      <PageActions actions={[{ id: "notifications-read-all", label: messages.MARK_ALL, variant: "secondary", pending: markAll.isPending, pendingLabel: messages.MARKING, disabled: unreadCount.isSuccess && unreadCount.data.unreadCount === 0, disabledReason: "Không có thông báo chưa đọc.", onClick: () => markAll.mutate() }]} />
      {children ? <div className={styles.extraContent}>{children}</div> : null}
    </div>
  );
}
