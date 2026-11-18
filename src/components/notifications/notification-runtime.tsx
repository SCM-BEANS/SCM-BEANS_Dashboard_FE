import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { notificationsApi } from "@/apis/notifications.api";
import type { Notification } from "@/schema/notifications.schema";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR, PATH_TECHNICIAN } from "@/routes/path";
import { pollingInterval, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { formatNotificationDate, getNotificationPresentation } from "@/text/notification-inbox-messages";
import type { NotificationScope } from "./notification-inbox";
import { NotificationTypeIcon } from "./notification-type-icon";
import { playNotificationSound, prepareNotificationSound, useNotificationPreferences } from "./notification-preferences";
import styles from "./notification-center.module.css";

export function useMarkNotificationAsRead(scope: NotificationScope) {
  const client = useQueryClient();
  const subject = authScopedQuerySubject(scope === "customer" ? "OWNER" : scope.toUpperCase());
  const queryKey = ["notifications", scope, subject] as const;
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => client.invalidateQueries({ queryKey }),
    retry: false,
  });
}

export function getNotificationRecordHref(scope: NotificationScope, notification: Notification) {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  if (notification.type === "CONTRACT_EXPIRING") {
    const id = new RegExp(`Hợp đồng\\s+(${uuid})`, "i").exec(notification.message)?.[1];
    if (!id) return null;
    if (scope === "admin") return PATH_ADMIN.CONTRACT_DETAIL(id);
    if (scope === "moderator") return PATH_MODERATOR.CONTRACT_DETAIL(id);
    if (scope === "customer") return PATH_CUSTOMER.CONTRACT_DETAIL(id);
    return null;
  }
  if (notification.type === "REPAIR_COST_REVIEW") {
    const id = new RegExp(`Review ID:\\s*(${uuid})`, "i").exec(notification.message)?.[1];
    if (!id) return null;
    if (scope === "admin") return PATH_ADMIN.TECHNICAL_COST_REVIEW_DETAIL(id);
    if (scope === "moderator") return PATH_MODERATOR.TECHNICAL_COST_REVIEW_DETAIL(id);
    if (scope === "customer") return PATH_CUSTOMER.REPAIR_COST_REVIEW_DETAIL(id);
    return null;
  }
  if (notification.type === "MACHINE_GPS_SIGNAL_MISSING") {
    const id = new RegExp(`Machine\\s+(${uuid})`, "i").exec(notification.message)?.[1];
    if (!id) return null;
    if (scope === "admin") return PATH_ADMIN.MACHINE_DETAIL(id);
    if (scope === "moderator") return PATH_MODERATOR.MACHINE_DETAIL(id);
    if (scope === "customer") return PATH_CUSTOMER.MACHINE_DETAIL(id);
    return PATH_TECHNICIAN.MACHINE_CHECK_DETAIL(id);
  }
  return null;
}

function NotificationToast({ notification, dismiss }: { notification: Notification; dismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(3000);
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(dismiss, remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [paused, dismiss]);
  const presentation = getNotificationPresentation(notification);
  const type = notification.type.toUpperCase();
  const level = /SUCCESS|COMPLETED|RESOLVED/.test(type) ? "success" : /ERROR|CRITICAL|DANGER|FAILED/.test(type) ? "danger" : /WARNING|EXPIRING|MISSING|MAINTENANCE|REVIEW/.test(type) ? "warning" : "info";
  const Icon = level === "success" ? CheckCircle2 : level === "danger" ? XCircle : level === "warning" ? AlertTriangle : Info;
  return <article className={styles.toast} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}>
    <span className={styles.toastIcon} data-level={level}><Icon size={22} aria-hidden="true" /></span><div><time>{formatNotificationDate(notification.createdAt)}</time><strong>{presentation.title}</strong></div>
    <button type="button" aria-label={`Đóng thông báo nổi: ${presentation.title}`} onClick={dismiss}><X size={18} aria-hidden="true" /></button>
  </article>;
}

export function NotificationRuntime({ scope }: { scope: NotificationScope }) {
  const subject = authScopedQuerySubject(scope === "customer" ? "OWNER" : scope.toUpperCase());
  const queryKey = ["notifications", scope, subject] as const;
  const client = useQueryClient();
  const visible = usePageVisibility();
  const { preferences, dnd } = useNotificationPreferences(subject);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const seen = useRef<Set<string> | null>(null);
  // The API exposes list/count reads; polling is shared with both responsive bell buttons.
  const list = useQuery({ queryKey: [...queryKey, false], queryFn: ({ signal }) => notificationsApi.list(signal), enabled: visible, refetchInterval: query => visible ? pollingInterval(query, 15_000) : false, staleTime: 15_000, retry: false });
  useQuery({ queryKey: [...queryKey, "unread-count"], queryFn: ({ signal }) => notificationsApi.unreadCount(signal), enabled: visible, refetchInterval: query => visible ? pollingInterval(query, 15_000) : false, retry: false });
  useEffect(() => { seen.current = null; setToasts([]); }, [subject]);
  useEffect(() => {
    if (!preferences.sound || dnd) return;
    const prepare = () => prepareNotificationSound();
    window.addEventListener("pointerdown", prepare, { once: true });
    window.addEventListener("keydown", prepare, { once: true });
    return () => { window.removeEventListener("pointerdown", prepare); window.removeEventListener("keydown", prepare); };
  }, [preferences.sound, dnd]);
  useEffect(() => {
    if (!list.data) return;
    if (!seen.current) { seen.current = new Set(list.data.map((item) => item.id)); return; }
    const fresh = list.data.filter((item) => !seen.current!.has(item.id));
    list.data.forEach((item) => seen.current!.add(item.id));
    if (!fresh.length) return;
    void client.invalidateQueries({ queryKey: ["notifications", scope, subject, "unread-count"] });
    if (dnd) return;
    const unread = fresh.filter((item) => !item.read);
    if (!unread.length) return;
    setToasts((items) => [...unread, ...items]);
    if (preferences.sound) playNotificationSound();
  }, [list.data, dnd, preferences.sound, client, scope, subject]);
  useEffect(() => { if (dnd) setToasts([]); }, [dnd]);
  if (!toasts.length || dnd) return null;
  return createPortal(<section className={`${styles.toastStack} dashboard-tailadmin-portal`} data-position={preferences.position} aria-label="Thông báo mới" aria-live="polite" aria-relevant="additions">
    {toasts.map((notification) => <NotificationToast key={notification.id} notification={notification} dismiss={() => setToasts((items) => items.filter((item) => item.id !== notification.id))} />)}
  </section>, document.body);
}
