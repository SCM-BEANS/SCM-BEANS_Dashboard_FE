import type { ReactNode } from "react";
import styles from "./action-bar.module.css";

interface ActionBarProps {
  children: ReactNode;
  label?: string;
}

export function ActionBar({
  children,
  label = "Thao tác trang",
}: ActionBarProps) {
  return (
    <footer className={styles.dock} aria-label={label}>
      <div className={styles.actions}>{children}</div>
    </footer>
  );
}
