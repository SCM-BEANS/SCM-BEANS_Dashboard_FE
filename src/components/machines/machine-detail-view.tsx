import type { ReactNode } from "react";
import styles from "./machines.module.css";

type MachineDetailViewProps = {
  children: ReactNode;
  summary: readonly { label: string; value: ReactNode }[];
  className?: string;
};

export function MachineDetailView({ children, summary, className }: MachineDetailViewProps) {
  const classNames = [styles.machineDetailView, className].filter(Boolean).join(" ");

  return (
    <div className={classNames}>
      <section className={styles.machineDetailSummary} aria-label="Tóm tắt máy">
        {summary.map((metric) => (
          <article className={styles.machineDetailMetric} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>
      <div className={styles.machineDetailSections}>{children}</div>
    </div>
  );
}
