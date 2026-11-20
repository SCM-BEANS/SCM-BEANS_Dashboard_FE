import { SectionTabList } from "@/components/tabs/section-tab-list";
import { useEffect, useId, useRef, useState } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Settings, X } from "lucide-react";
import Link from "next/link";
import { notificationsApi } from "@/apis/notifications.api";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { SettingsMenu } from "@/components/sidebar/settings-menu";
import { formatNotificationDate, getNotificationPresentation } from "@/text/notification-inbox-messages";
import { getNotificationRecordHref, useMarkNotificationAsRead } from "./notification-runtime";
import type { NotificationInboxProps } from "./notification-inbox";
import { NotificationTypeIcon } from "./notification-type-icon";
import { NOTIFICATION_POSITIONS, prepareNotificationSound, useNotificationPreferences } from "./notification-preferences";
import bellStyles from "./notification-inbox.module.css";
import styles from "./notification-center.module.css";

export function NotificationBell({ scope, viewAllHref, settingsHref, logout }: NotificationInboxProps) {
  const subject = authScopedQuerySubject(scope === "customer" ? "OWNER" : scope.toUpperCase());
  const queryKey = ["notifications", scope, subject] as const;
  const client = useQueryClient();
  const { preferences, update, dnd } = useNotificationPreferences(subject);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");
  const [customDnd, setCustomDnd] = useState(false);
  const [timeError, setTimeError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  const list = useQuery({ queryKey: [...queryKey, false], queryFn: ({ signal }) => notificationsApi.list(signal), enabled: open, retry: false });
  const count = useQuery({ queryKey: [...queryKey, "unread-count"], queryFn: ({ signal }) => notificationsApi.unreadCount(signal), retry: false });
  const refresh = () => client.invalidateQueries({ queryKey });
  const markOne = useMarkNotificationAsRead(scope);
  const markAll = useMutation({
    mutationFn: async (ids: string[]) => {
      let failed = 0;
      // The read-all endpoint has no category filter; individual writes preserve the selected scope.
      for (let index = 0; index < ids.length; index += 5) {
        const results = await Promise.allSettled(ids.slice(index, index + 5).map((notificationId) => notificationsApi.markAsRead(notificationId)));
        failed += results.filter((result) => result.status === "rejected").length;
      }
      if (failed) throw new Error(`Chưa đánh dấu được ${failed} thông báo. Vui lòng thử lại.`);
    }, onSettled: refresh, retry: false,
  });
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, [open]);
  const close = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => dialog.current?.close(), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180);
  };
  const rows = (list.data ?? []).map((item) => ({ ...item, ...getNotificationPresentation(item), recordHref: getNotificationRecordHref(scope, item) }))
    .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
  const filtered = rows.filter((item) => !category || item.typeLabel === category);
  const unread = filtered.filter((item) => !item.read);
  const busy = markOne.isPending || markAll.isPending;
  const unreadTotal = count.data?.unreadCount ?? 0;
  const dndLabel = dnd ? `Tạm tắt đến ${formatNotificationDate(new Date(preferences.dndUntil).toISOString())}` : "Không làm phiền";
  return <div className={bellStyles.bellContainer}>
    <div className={bellStyles.bellActions}>
      <button ref={trigger} className={bellStyles.bellButton} type="button" aria-label={`Danh sách thông báo: ${count.isSuccess ? `${unreadTotal} chưa đọc` : "chưa tải được số chưa đọc"}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} title={dnd ? dndLabel : "Thông báo"} onClick={() => setOpen(true)}>
        {dnd ? <BellOff size={20} aria-hidden="true" /> : <Bell size={20} aria-hidden="true" />}
        {unreadTotal > 0 ? <span className={bellStyles.bellBadge} aria-hidden="true">{unreadTotal > 99 ? "99+" : unreadTotal}</span> : null}
      </button>
      {settingsHref && logout ? <SettingsMenu settingsHref={settingsHref} logout={logout} variant="icon" /> : settingsHref ? <Link className={bellStyles.settingsButton} href={settingsHref} aria-label="Cài đặt hồ sơ"><Settings size={20} aria-hidden="true" /></Link> : null}
    </div>
    {open ? createPortal(<dialog data-ui-dashboard ref={dialog} id={id} className={styles.drawer} data-closing={closing} aria-labelledby={`${id}-title`} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { setOpen(false); setClosing(false); trigger.current?.focus(); }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
      <header className={styles.header}><div><h2 id={`${id}-title`}>Thông báo</h2><p>{count.isSuccess ? `${unreadTotal} chưa đọc` : "Chưa tải được số chưa đọc"}</p></div><button type="button" className={styles.iconButton} aria-label="Đóng bảng thông báo" onClick={close} autoFocus><X size={21} aria-hidden="true" /></button></header>
      <div className={styles.toolbar}><button type="button" disabled={busy || !list.isSuccess || !unread.length} onClick={() => markAll.mutate(unread.map((item) => item.id))}><CheckCheck size={16} aria-hidden="true" />{markAll.isPending ? "Đang đánh dấu…" : "Đánh dấu tất cả đã đọc"}</button><button className={styles.iconButton} type="button" aria-label="Cài đặt thông báo" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings size={18} aria-hidden="true" /></button></div>
      <div className={styles.dndControl}><BellOff size={16} aria-hidden="true" /><select aria-label="Không làm phiền" value={customDnd ? "custom" : dnd ? "active" : "off"} onChange={(event) => {
        const value = event.target.value; setTimeError(""); setCustomDnd(value === "custom");
        if (value === "custom") return;
        if (value === "off") update({ dndUntil: 0 });
        else if (value === "tomorrow") { const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(8, 0, 0, 0); update({ dndUntil: tomorrow.getTime() }); }
        else update({ dndUntil: Date.now() + Number(value) * 3_600_000 });
      }}><option value="off">Không làm phiền: Tắt</option>{dnd ? <option value="active">{dndLabel}</option> : null}<option value="1">Trong 1 giờ</option><option value="2">Trong 2 giờ</option><option value="4">Trong 4 giờ</option><option value="tomorrow">Đến 08:00 ngày mai</option><option value="custom">Chọn thời gian…</option></select></div>
      {customDnd ? <form className={styles.customTime} onSubmit={(event) => { event.preventDefault(); const until = new Date(customTime).getTime(); if (!Number.isFinite(until) || until <= Date.now()) { setTimeError("Chọn thời gian sau thời điểm hiện tại."); return; } update({ dndUntil: until }); setCustomDnd(false); }}><label>Tạm tắt đến<input type="datetime-local" required value={customTime} onChange={(event) => setCustomTime(event.target.value)} /></label><button type="submit">Áp dụng</button>{timeError ? <p role="alert">{timeError}</p> : null}</form> : null}
      {settings ? <section className={styles.preferences} aria-label="Cài đặt thông báo"><label><input type="checkbox" checked={preferences.sound} onChange={(event) => { if (event.target.checked) prepareNotificationSound(); update({ sound: event.target.checked }); }} />Âm thanh thông báo</label><label>Vị trí thông báo nổi<select aria-label="Vị trí thông báo nổi" value={preferences.position} onChange={(event) => update({ position: event.target.value as keyof typeof NOTIFICATION_POSITIONS })}>{Object.entries(NOTIFICATION_POSITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p>Cài đặt được lưu trên trình duyệt này. Không làm phiền chỉ tạm tắt thông báo nổi và âm thanh.</p></section> : null}
      <SectionTabList role="group" aria-label="Loại thông báo">{["", ...Array.from(new Set(rows.map((item) => item.typeLabel)))].map((value) => <button type="button" key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setExpanded(null); }}>{value || "Tất cả"}</button>)}</SectionTabList>
      <div className={styles.feed}>
        {count.isError ? <p className={styles.error} role="alert">Chưa tải được số chưa đọc. <button type="button" onClick={() => void count.refetch()}>Thử lại</button></p> : null}
        {markOne.isError || markAll.isError ? <p className={styles.error} role="alert">Chưa cập nhật được trạng thái. {markAll.isError ? markAll.error.message : getApiErrorMessage(markOne.error)}</p> : null}
        {list.isPending ? <p className={styles.empty} role="status">Đang tải thông báo…</p> : list.isError ? <div className={styles.empty} role="alert"><p>Chưa tải được thông báo.</p><button type="button" onClick={() => void list.refetch()}>Thử lại</button></div> : !filtered.length ? <div className={styles.empty}><Bell size={32} aria-hidden="true" /><strong>Không có thông báo</strong><p>Bạn đã xem hết thông báo trong mục này.</p></div> : filtered.map((item) => <article key={item.id} className={styles.feedItem} data-expanded={expanded === item.id}>
          <button className={styles.openItem} type="button" aria-expanded={expanded === item.id} onClick={() => { setExpanded(expanded === item.id ? null : item.id); if (!item.read && !busy) markOne.mutate(item.id); }}><NotificationTypeIcon label={item.typeLabel} /><span className={styles.itemBody}><span className={styles.itemMeta}><span>{item.typeLabel}</span><time dateTime={item.createdAt ?? undefined}>{formatNotificationDate(item.createdAt)}</time></span><strong>{item.title}</strong><span className={styles.message}>{item.message}</span></span><span className={styles.readDot} data-unread={!item.read} role="img" aria-label={item.read ? "Đã đọc" : "Chưa đọc"} /></button>
          {expanded === item.id && item.recordHref ? <TextLinkButton href={item.recordHref}>{item.title}</TextLinkButton> : null}
        </article>)}
        {list.isSuccess && filtered.length ? <p className={styles.end}>Đã hiển thị {filtered.length} thông báo</p> : null}
      </div>
      {viewAllHref ? <footer className={styles.footer}><Link href={viewAllHref} onClick={() => dialog.current?.close()}>Xem tất cả thông báo</Link></footer> : null}
    </dialog>, document.body) : null}
  </div>;
}
