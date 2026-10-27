import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import {
  SidebarLogoutButton,
  SidebarNavigation,
  type SidebarItem,
  type SidebarLogoutProps,
} from "@/components/sidebar/sidebar";
import styles from "./mobile-navigation.module.css";

export type MobileNavigationProps = {
  items: readonly SidebarItem[];
  pathname: string;
  rootHref: string;
  navigationLabel: string;
  drawerLabel: string;
  triggerLabel: string;
  closeLabel: string;
  logout: SidebarLogoutProps;
  footer?: ReactNode;
};

export function MobileNavigation({
  items,
  pathname,
  rootHref,
  navigationLabel,
  drawerLabel,
  triggerLabel,
  closeLabel,
  logout,
  footer,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const dialogId = `mobile-navigation-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const openRef = useRef(open);
  const wasOpenRef = useRef(false);
  const restoreFocusRef = useRef(true);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current && restoreFocusRef.current) triggerRef.current?.focus();
      wasOpenRef.current = false;
      restoreFocusRef.current = true;
      return;
    }

    wasOpenRef.current = true;
    closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeAtDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (!event.matches || !openRef.current) return;
      restoreFocusRef.current = false;
      openRef.current = false;
      setOpen(false);
    };

    desktopQuery.addEventListener("change", closeAtDesktop);
    if (desktopQuery.matches && openRef.current) closeAtDesktop(desktopQuery);

    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    const focusIsOutsideDialog = !dialogRef.current?.contains(activeElement);

    if (event.shiftKey && (activeElement === first || focusIsOutsideDialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (activeElement === last || focusIsOutsideDialog)) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        className={styles.trigger}
        type="button"
        ref={triggerRef}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        <Menu size={21} aria-hidden="true" />
      </button>
      {open && (
        <div
          className={styles.backdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className={styles.sheet}
            id={dialogId}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={drawerLabel}
            onKeyDown={handleDialogKeyDown}
          >
            <div className={styles.sheetHeader}>
              <strong>{drawerLabel}</strong>
              <button
                className={styles.closeButton}
                type="button"
                ref={closeRef}
                aria-label={closeLabel}
                onClick={() => setOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <SidebarNavigation
              items={items}
              pathname={pathname}
              rootHref={rootHref}
              navigationLabel={navigationLabel}
              className={styles.navigation}
              onNavigate={() => setOpen(false)}
            />
            {footer && <div className={styles.footer}>{footer}</div>}
            <SidebarLogoutButton
              {...logout}
              onLogout={() => {
                setOpen(false);
                return logout.onLogout();
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}
