import type { ReactNode } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { Panel } from "@/components/panel/panel";
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
  return (
    <Panel title={title} description={description} className={className} aria-label={title}>
      {state && stateMessage ? (
        <div
          className={styles.smartIotPanelState}
          data-state={state}
          role={state === "error" ? "alert" : "status"}
        >
          <p>{stateMessage}</p>
          {state === "error" && onRetry ? (
            <ButtonBar type="button" onClick={onRetry}>
              {retryLabel}
            </ButtonBar>
          ) : null}
        </div>
      ) : null}
      {children ? <div className={styles.smartIotPanelContent}>{children}</div> : null}
    </Panel>
  );
}
