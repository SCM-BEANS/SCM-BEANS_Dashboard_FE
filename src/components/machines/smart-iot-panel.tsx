import { useId, type ReactNode } from "react";
import styles from "./machines.module.css";

export type SmartIotPanelState = "loading" | "empty" | "error" | "permission-denied";

type SmartIotPanelProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  state?: SmartIotPanelState;
  stateMessage?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export function SmartIotPanel({
  title,
  description,
  children,
  className,
  state,
  stateMessage,
  retryLabel = "Thử lại",
  onRetry,
}: SmartIotPanelProps) {
  const generatedId = useId();
  const headingId = `smart-iot-panel-${generatedId.replace(/:/g, "")}`;
  const classNames = [styles.smartIotPanel, className].filter(Boolean).join(" ");

  return (
    <section className={classNames} aria-labelledby={headingId}>
      <header className={styles.smartIotPanelHeader}>
        <h2 id={headingId}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {state && stateMessage ? (
        <div
          className={styles.smartIotPanelState}
          data-state={state}
          role={state === "error" ? "alert" : "status"}
        >
          <p>{stateMessage}</p>
          {state === "error" && onRetry ? (
            <button className={styles.smartIotRetryButton} type="button" onClick={onRetry}>
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      {children ? <div className={styles.smartIotPanelContent}>{children}</div> : null}
    </section>
  );
}
