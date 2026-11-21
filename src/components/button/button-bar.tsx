import Link from "next/link";
import {
  forwardRef,
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { UI_MESSAGES } from "@/text/ui-messages";
import styles from "./button-bar.module.css";

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  rollingLabel?: boolean;
};

type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
    holdToConfirm?: never;
  };

type NativeButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
    holdToConfirm?: boolean;
  };

export type ButtonBarProps = LinkButtonProps | NativeButtonProps;

const HOLD_TO_CONFIRM_MS = 1200;

export function advanceHoldProgress(progress: number, elapsed: number, holding: boolean) {
  return holding
    ? Math.min(1, progress + elapsed / HOLD_TO_CONFIRM_MS)
    : Math.max(0, progress - elapsed / (HOLD_TO_CONFIRM_MS / 2.4));
}

const HoldToConfirmButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function HoldToConfirmButton({ children, className, onClick, onPointerDown, onPointerUp, onPointerCancel, onLostPointerCapture, onKeyDown, onKeyUp, onBlur, onContextMenu, disabled, "aria-describedby": ariaDescribedBy, "aria-description": ariaDescription, ...props }, forwardedRef) {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const descriptionId = useId();
    const progress = useRef(0);
    const frame = useRef(0);
    const lastFrame = useRef(0);
    const holding = useRef(false);
    const allowClick = useRef(false);

    const setButtonRef = useCallback((node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) Object.assign(forwardedRef, { current: node });
    }, [forwardedRef]);

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function setProgress(value: number) {
      progress.current = value;
    }

    function complete() {
      holding.current = false;
      frame.current = 0;
      lastFrame.current = 0;
      allowClick.current = true;
      buttonRef.current?.click();
      allowClick.current = false;
      setProgress(0);
    }

    function tick(now: number) {
      if (!buttonRef.current?.isConnected) return;
      const elapsed = now - (lastFrame.current || now);
      lastFrame.current = now;
      setProgress(advanceHoldProgress(progress.current, elapsed, holding.current));

      if (progress.current >= 1 && holding.current) {
        complete();
        return;
      }
      if (holding.current || progress.current > 0) frame.current = requestAnimationFrame(tick);
      else { frame.current = 0; lastFrame.current = 0; }
    }

    function start() {
      if (disabled || holding.current) return;
      holding.current = true;
      if (!frame.current) { lastFrame.current = 0; frame.current = requestAnimationFrame(tick); }
    }

    function stop() {
      holding.current = false;
      if (!frame.current && progress.current > 0) frame.current = requestAnimationFrame(tick);
    }

    return (
      <button
        {...props}
        ref={setButtonRef}
        className={[className, styles.holdToConfirm].filter(Boolean).join(" ")}
        disabled={disabled}
        aria-describedby={[ariaDescribedBy, descriptionId].filter(Boolean).join(" ")}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (event.defaultPrevented || event.button !== 0) return;
          try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer may have ended before capture. */ }
          start();
        }}
        onPointerUp={(event) => { onPointerUp?.(event); stop(); }}
        onPointerCancel={(event) => { onPointerCancel?.(event); stop(); }}
        onLostPointerCapture={(event) => { onLostPointerCapture?.(event); stop(); }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || (event.key !== " " && event.key !== "Enter")) return;
          event.preventDefault();
          if (!event.repeat) start();
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          if (event.key === " " || event.key === "Enter") { event.preventDefault(); stop(); }
        }}
        onBlur={(event) => { onBlur?.(event); stop(); }}
        onContextMenu={(event) => { onContextMenu?.(event); event.preventDefault(); }}
        onClick={(event) => {
          if (!allowClick.current) { event.preventDefault(); event.stopPropagation(); return; }
          onClick?.(event);
        }}
      >
        {children}
        <span className={styles.holdHint} data-ui-hold-hint aria-hidden="true">{UI_MESSAGES.HOLD_TO_CONFIRM_HINT}</span>
        <span id={descriptionId} className={styles.visuallyHidden}>{ariaDescription ?? UI_MESSAGES.HOLD_TO_CONFIRM_DESCRIPTION}</span>
      </button>
    );
  },
);

export const ButtonBar = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ButtonBarProps
>(function ButtonBar(props, ref) {
  const { variant = "secondary", rollingLabel = false, holdToConfirm = false, children, ...rest } = props;
  const className = [styles.button, props.className].filter(Boolean).join(" ");
  const accessibleLabel = props["aria-label"] ?? (rollingLabel && typeof children === "string" ? children : undefined);

  if (props.href) {
    const { href, ...linkProps } = rest as LinkButtonProps;
    return (
      <Link
        {...linkProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        aria-label={accessibleLabel}
        data-ui-button
        data-ui-button-variant={variant}
      >
        {children}
      </Link>
    );
  }

  if (holdToConfirm) {
    return <HoldToConfirmButton {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} ref={ref as Ref<HTMLButtonElement>} className={className} type={(props as NativeButtonProps).type ?? "button"} aria-label={accessibleLabel} data-ui-button data-ui-button-variant={variant}>{children}</HoldToConfirmButton>;
  }

  return (
    <button
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as Ref<HTMLButtonElement>}
      className={className}
      type={(props as NativeButtonProps).type ?? "button"}
      aria-label={accessibleLabel}
      data-ui-button
      data-ui-button-variant={variant}
    >
      {children}
    </button>
  );
});

// Lucian UX/UI Prompt #004 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#004
export function ProgressDownloadButton({
  children,
  filename,
  download,
  onError,
}: {
  children: string;
  filename: string;
  download: (signal: AbortSignal, onProgress: (loaded: number, total?: number) => void) => Promise<Blob>;
  onError?: (error: unknown) => void;
}) {
  const [state, setState] = useState<"idle" | "run">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => {
    controller.current?.abort();
  }, []);

  const startDownload = async () => {
    const activeController = new AbortController();
    controller.current = activeController;
    setState("run");
    setProgress(null);
    setAnnouncement("Đang tải tài liệu");

    try {
      const blob = await download(activeController.signal, (loaded, total) => {
        if (!activeController.signal.aborted) {
          setProgress(total && total > 0 ? Math.min(1, loaded / total) : null);
        }
      });
      if (activeController.signal.aborted) return;

      const safeFilename = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "contract-document";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeFilename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress(1);
      setAnnouncement("Đã tải xong tài liệu");
    } catch (error) {
      if (!activeController.signal.aborted) {
        onError?.(error);
        setAnnouncement("Không tải được tài liệu");
        setProgress(null);
      }
    } finally {
      if (controller.current === activeController) {
        controller.current = null;
        setState("idle");
        setProgress(null);
      }
    }
  };

  const handleClick = () => {
    if (controller.current) {
      controller.current?.abort();
      controller.current = null;
      setState("idle");
      setProgress(null);
      setAnnouncement("Đã hủy tải xuống");
      return;
    }
    void startDownload();
  };

  const label = state === "run" ? (progress == null ? "Đang tải · Hủy" : `Đang tải ${Math.round(progress * 100)}% · Hủy`) : children;
  const accessibleLabel = state === "run" ? `Hủy tải xuống ${filename}` : `${children} ${filename}`;

  return (
    <>
      <ButtonBar type="button" aria-label={accessibleLabel} aria-busy={state === "run"} onClick={handleClick}>{label}</ButtonBar>
      <span className={styles.visuallyHidden} aria-live="polite">{announcement}</span>
    </>
  );
}
