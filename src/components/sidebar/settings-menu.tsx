import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SidebarLogoutProps } from "./sidebar";
import styles from "./settings-menu.module.css";

// "icon" = square button in the top bar (menu opens down); "wide" = sidebar footer button (menu opens up).
export function SettingsMenu({
  settingsHref,
  logout,
  variant,
}: {
  settingsHref: string;
  logout: SidebarLogoutProps;
  variant: "icon" | "wide";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`${styles.container} ${variant === "wide" ? styles.wideContainer : ""}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <button
        className={variant === "wide" ? styles.wideButton : styles.iconButton}
        type="button"
        aria-label="Cài đặt"
        title="Cài đặt"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings aria-hidden="true" size={variant === "wide" ? 18 : 20} />
        {variant === "wide" && <span>Cài đặt</span>}
      </button>
      {open && (
        <div className={`${styles.menu} ${variant === "wide" ? styles.menuUp : styles.menuDown}`} role="menu">
          <Link className={styles.menuItem} role="menuitem" href={settingsHref} onClick={() => setOpen(false)}>
            <User aria-hidden="true" size={16} />
            Hồ sơ
          </Link>
          <button className={styles.menuItem} role="menuitem" type="button" disabled={logout.pending} onClick={() => void logout.onLogout()}>
            <LogOut aria-hidden="true" size={16} />
            {logout.pending ? logout.pendingLabel : logout.label}
          </button>
        </div>
      )}
    </div>
  );
}
