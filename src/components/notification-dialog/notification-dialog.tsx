import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

import styles from "./notification-dialog.module.css";

export type NotificationDialogAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  pendingLabel?: string;
};

type NotificationDialogBaseProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  primaryAction: NotificationDialogAction;
  onClose: () => void;
  closeOnEscape?: boolean;
};

export type NotificationDialogProps =
  | (NotificationDialogBaseProps & {
      variant: "confirm";
      secondaryAction: NotificationDialogAction;
    })
  | (NotificationDialogBaseProps & {
      variant: "success" | "error";
      secondaryAction?: never;
    });

const DEFAULT_EYEBROWS = {
  confirm: "Kiểm tra trước khi tiếp tục",
  success: "Đã hoàn tất",
  error: "Thao tác chưa hoàn tất",
} as const;

export function NotificationDialog(props: NotificationDialogProps) {
  const { variant, eyebrow, title, description, children, primaryAction, onClose, closeOnEscape = true } = props;
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null;

  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;

    dialog?.focus({ preventScroll: true });

    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (closeOnEscape) closeRef.current();
      return;
    }

    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
    );
    const targets = Array.from(focusable ?? []).filter((element) => element.getClientRects().length > 0);
    const first = targets[0];
    const last = targets[targets.length - 1];

    if (!first || !last) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }

  const primaryLabel = primaryAction.pending
    ? primaryAction.pendingLabel ?? primaryAction.label
    : primaryAction.label;

  return (
    <div className={styles.backdrop}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role={variant === "confirm" || variant === "error" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hasDescription ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <p className={styles.eyebrow}>
          {variant === "success" && <span className={styles.successMark} aria-hidden="true">{"\u2713"}</span>}
          {eyebrow ?? DEFAULT_EYEBROWS[variant]}
        </p>
        <h2 className={styles.title} id={titleId}>{title}</h2>
        {hasDescription && <div className={styles.description} id={descriptionId}>{description}</div>}
        {children}

        <div className={styles.actions}>
          <button
            className={styles.primaryButton}
            type="button"
            data-dialog-primary
            disabled={primaryAction.disabled || primaryAction.pending}
            aria-busy={primaryAction.pending || undefined}
            onClick={primaryAction.onClick}
          >
            {primaryLabel}
          </button>
          {variant === "confirm" && (
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={props.secondaryAction.disabled || props.secondaryAction.pending}
              onClick={props.secondaryAction.onClick}
            >
              {props.secondaryAction.pending
                ? props.secondaryAction.pendingLabel ?? props.secondaryAction.label
                : props.secondaryAction.label}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
