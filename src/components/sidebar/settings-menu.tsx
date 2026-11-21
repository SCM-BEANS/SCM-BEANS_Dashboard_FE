import { ButtonBar } from "@/components/button/button-bar";
import { LogOut, Settings, User } from "lucide-react";
import { useState } from "react";
import type { SidebarLogoutProps } from "./sidebar";
import styles from "./settings-menu.module.css";

// "icon" = square button in the top bar (menu opens down); "wide" = sidebar footer button (menu opens up).
export function SettingsMenu({
  settingsHref,
  logout,
  variant,
  compact = false,
}: {
  settingsHref: string;
  logout: SidebarLogoutProps;
  variant: "icon" | "wide";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`${styles.container} ${variant === "wide" ? styles.wideContainer : ""}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <ButtonBar
        data-ui-text-link data-ui-navigation data-ui-control-size={variant === "icon" || compact ? "icon" : undefined}
        className={variant === "wide" && !compact ? styles.wideButton : styles.iconButton}
        type="button"
        aria-label="Cài đặt"
        title="Cài đặt"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Settings aria-hidden="true" size={variant === "wide" ? 18 : 20} />
        {variant === "wide" && !compact && <span>Cài đặt</span>}
      </ButtonBar>
      {open && (
        <div className={`${styles.menu} ${variant === "wide" ? styles.menuUp : styles.menuDown} ${compact ? styles.compactMenu : ""}`} role="menu">
          <ButtonBar data-ui-text-link data-ui-navigation className={styles.menuItem} role="menuitem" href={settingsHref} onClick={() => setOpen(false)}>
            <User aria-hidden="true" size={16} />
            Hồ sơ
          </ButtonBar>
          <ButtonBar data-ui-text-link data-ui-navigation className={styles.menuItem} role="menuitem" type="button" disabled={logout.pending} onClick={() => void logout.onLogout()}>
            <LogOut aria-hidden="true" size={16} />
            {logout.pending ? logout.pendingLabel : logout.label}
          </ButtonBar>
        </div>
      )}
    </div>
  );
}
