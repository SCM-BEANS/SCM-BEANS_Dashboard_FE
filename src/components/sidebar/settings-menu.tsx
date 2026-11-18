import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SidebarLogoutProps } from "./sidebar";
import styles from "./settings-menu.module.css";

export function SettingsMenu({
  settingsHref,
  logout,
}: {
  settingsHref: string;
  logout: SidebarLogoutProps;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={styles.container}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <button
        className={`${styles.iconButton} ta:flex ta:min-h-11 ta:items-center ta:gap-3 ta:rounded-lg ta:border ta:border-gray-200 ta:bg-white ta:px-3 ta:text-sm ta:font-medium ta:text-gray-700 ta:hover:bg-gray-100 ta:focus-visible:shadow-focus-ring`}
        type="button"
        aria-label="Cài đặt"
        title="Cài đặt"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <User aria-hidden="true" size={20} />
        <span className={styles.desktopLabel}>Cài đặt</span>
        <ChevronDown className={styles.desktopLabel} aria-hidden="true" size={16} />
      </button>
      {open && (
        <div className={`${styles.menu} ta:grid ta:gap-1 ta:rounded-xl ta:border ta:border-gray-200 ta:bg-white ta:p-2 ta:shadow-theme-lg`} role="menu">
          <Link className={`${styles.menuItem} ta:flex ta:min-h-11 ta:items-center ta:gap-3 ta:rounded-lg ta:px-3 ta:text-sm ta:font-medium ta:text-gray-700 ta:hover:bg-gray-100 ta:focus-visible:shadow-focus-ring`} role="menuitem" href={settingsHref} onClick={() => setOpen(false)}>
            <User aria-hidden="true" size={16} />
            Hồ sơ
          </Link>
          <button className={`${styles.menuItem} ta:flex ta:min-h-11 ta:items-center ta:gap-3 ta:rounded-lg ta:px-3 ta:text-sm ta:font-medium ta:text-gray-700 ta:hover:bg-gray-100 ta:focus-visible:shadow-focus-ring`} role="menuitem" type="button" disabled={logout.pending} onClick={() => void logout.onLogout()}>
            <LogOut aria-hidden="true" size={16} />
            {logout.pending ? logout.pendingLabel : logout.label}
          </button>
        </div>
      )}
    </div>
  );
}
