import type { HTMLAttributes, ReactNode } from "react";
import styles from "./panel.module.css";

export type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, description, actions, className, children, ...props }: PanelProps) {
  return (
    <section {...props} className={[styles.panel, className].filter(Boolean).join(" ")} data-ui-panel>
      {title || description || actions ? (
        <header className={styles.header}>
          <div className={styles.heading}>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}
