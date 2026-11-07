import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/router";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import type { PageAction } from "./page-action.types";
import styles from "./page-actions.module.css";

export function PageActionsRenderer({ actions }: { actions: readonly PageAction[] }) {
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<PageAction | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const prefix = useId();
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pending = actions.some((action) => action.pending);
  const primary = actions.reduce<PageAction | undefined>((winner, action) => {
    if (action.variant !== "primary") return winner;
    return !winner || (action.priority ?? 0) >= (winner.priority ?? 0) ? action : winner;
  }, undefined);
  const others = actions
    .filter((action) => action !== primary)
    .map((action, index) => ({ action, index }))
    .sort((left, right) => (right.action.priority ?? 0) - (left.action.priority ?? 0) || left.index - right.index)
    .map(({ action }) => action);
  const visibleOthers = others.slice(0, mobile ? 0 : Math.max(0, 3 - (primary ? 1 : 0)));
  const overflow = others.slice(visibleOthers.length);
  const pendingReasonId = `${prefix}-pending-actions`;
  const closeMenu = () => { setOpen(false); triggerRef.current?.focus(); };
  const menuKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); closeMenu(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
  const runConfirmed = (action: PageAction) => {
    setConfirmation(null);
    if (action.onClick) action.onClick();
    else if (action.href) void router.push(action.href);
    else if (action.type === "submit" && action.form) (document.getElementById(action.form) as HTMLFormElement | null)?.requestSubmit();
  };
  const renderAction = (action: PageAction, inMenu = false) => {
    const disabled = !!action.disabled || pending;
    const disabledReason = action.disabledReason ?? (pending && !action.pending ? "Đang xử lý thao tác khác." : undefined);
    const reasonId = `${prefix}-${action.id}`;
    const common = {
      variant: action === primary ? "primary" as const : action.variant === "danger" ? "danger" as const : "secondary" as const,
      className: inMenu ? styles.menuItem : undefined,
      role: inMenu ? "menuitem" : undefined,
      "data-action-id": action.id,
      title: inMenu ? disabledReason : undefined,
      "aria-describedby": disabledReason && (inMenu || disabled) ? reasonId : action.describedBy,
      "aria-busy": action.pending || undefined,
    };
    const click = () => {
      if (action.confirm) setConfirmation(action);
      else if (action.onClick) action.onClick();
      else if (action.href) void router.push(action.href);
      if (inMenu) setOpen(false);
    };
    const label = action.pending && action.pendingLabel ? action.pendingLabel : action.label;
    const button = action.href && !disabled && !action.confirm
      ? <ButtonBar key={action.id} {...common} href={action.href} onClick={() => { if (inMenu) setOpen(false); }}>{label}</ButtonBar>
      : <ButtonBar key={action.id} {...common} type={action.confirm ? "button" : action.type ?? "button"} form={action.form} disabled={disabled} onClick={click}>{label}</ButtonBar>;
    if (inMenu) return button;
    return <span className={styles.action} key={action.id} tabIndex={disabled && disabledReason ? 0 : undefined}>
      {button}
      {disabled && disabledReason && <span id={reasonId} className={styles.reason}>{disabledReason}</span>}
    </span>;
  };
  if (!actions.length) return null;
  return <div className={styles.container} data-menu-open={open ? "true" : undefined}>
    <div className={styles.danger}>{visibleOthers.filter(a => a.variant === "danger").map(a => renderAction(a))}</div>
    <div className={styles.right}>
      {visibleOthers.filter(a => a.variant !== "danger").map(a => renderAction(a))}
      {overflow.length > 0 && <div className={styles.menu} ref={menuRef} onKeyDown={menuKey}>
        <ButtonBar ref={triggerRef} aria-haspopup="menu" aria-expanded={open} aria-describedby={pending ? pendingReasonId : undefined} disabled={pending} onClick={() => { setOpen(!open); if (!open) requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()); }} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => { const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'); items?.[event.key === "ArrowUp" ? items.length - 1 : 0]?.focus(); }); } }}>Thêm thao tác</ButtonBar>
        {pending && <span id={pendingReasonId} className={styles.pendingHint}>Đang xử lý thao tác khác.</span>}
        {open && <>
          <div className={styles.popup} role="menu" aria-label="Thêm thao tác">{overflow.map(a => renderAction(a, true))}</div>
          {overflow.filter(a => a.disabledReason || (pending && !a.pending)).map(a => <span id={`${prefix}-${a.id}`} className={styles.visuallyHidden} key={`${a.id}-reason`}>{a.disabledReason ?? "Đang xử lý thao tác khác."}</span>)}
        </>}
      </div>}
      {primary && renderAction(primary)}
    </div>
    {confirmation?.confirm && <NotificationDialog variant="confirm" title={confirmation.confirm.title} description={confirmation.confirm.description} onClose={() => setConfirmation(null)} primaryAction={{ label: confirmation.confirm.confirmLabel, onClick: () => runConfirmed(confirmation) }} secondaryAction={{ label: "Hủy", onClick: () => setConfirmation(null) }} />}
  </div>;
}
