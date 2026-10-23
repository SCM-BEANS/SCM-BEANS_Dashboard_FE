import type { ReactNode } from "react";
import styles from "./admin-action-bar.module.css";

interface AdminActionBarProps {
  children: ReactNode;
  label?: string;
}

export function AdminActionBar({
  children,
  label = "Thao tác trang",
}: AdminActionBarProps) {
  return (
    <footer className={styles.dock} aria-label={label}>
      <div className={styles.actions}>{children}</div>
    </footer>
  );
}
