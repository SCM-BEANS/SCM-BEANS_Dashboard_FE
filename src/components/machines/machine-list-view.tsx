import type { ReactNode } from "react";
import styles from "./machines.module.css";

type MachineListViewProps = {
  children: ReactNode;
  summary?: ReactNode;
  controls?: ReactNode;
  labelledBy?: string;
  label?: string;
  className?: string;
};

export function MachineListView({ children, summary, controls, labelledBy, label, className }: MachineListViewProps) {
  const classNames = [styles.machineListView, className].filter(Boolean).join(" ");

  return (
    <section className={classNames} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}>
      {summary ? <div className={styles.machineListSummary}>{summary}</div> : null}
      {controls ? <div className={styles.machineListControls}>{controls}</div> : null}
      <div className={styles.machineListResults}>{children}</div>
    </section>
  );
}
