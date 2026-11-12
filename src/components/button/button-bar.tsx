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
  type CSSProperties,
} from "react";
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
      buttonRef.current?.style.setProperty("--hold-progress", `${value * 100}%`);
    }

    function complete() {
      holding.current = false;
      frame.current = 0;
      lastFrame.current = 0;
      if (buttonRef.current) buttonRef.current.dataset.holding = "false";
      allowClick.current = true;
      buttonRef.current?.click();
      allowClick.current = false;
      setProgress(0);
      buttonRef.current?.style.setProperty("--hold-shake", "paused");
    }

    function tick(now: number) {
      if (!buttonRef.current?.isConnected) return;
      const elapsed = now - (lastFrame.current || now);
      lastFrame.current = now;
      setProgress(advanceHoldProgress(progress.current, elapsed, holding.current));
      buttonRef.current.style.setProperty("--hold-shake", holding.current && progress.current > 0.55 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "running" : "paused");

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
      if (buttonRef.current) buttonRef.current.dataset.holding = "true";
      if (!frame.current) { lastFrame.current = 0; frame.current = requestAnimationFrame(tick); }
    }

    function stop() {
      holding.current = false;
      if (buttonRef.current) buttonRef.current.dataset.holding = "false";
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
        <span className={styles.holdContent}>{children}</span>
        <span className={styles.holdFill} aria-hidden="true">{children}</span>
        <span id={descriptionId} className={styles.visuallyHidden}>{ariaDescription ?? "Nhấn giữ 1,2 giây để xác nhận."}</span>
      </button>
    );
  },
);

export const ButtonBar = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ButtonBarProps
>(function ButtonBar(props, ref) {
  const { variant = "secondary", rollingLabel = false, holdToConfirm = false, children, ...rest } = props;
  const rolls = rollingLabel && typeof children === "string";
  const className = [styles.button, styles[variant], rolls && styles.rollingButton, props.className].filter(Boolean).join(" ");
  // Lucian UX/UI Prompt #009 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#009
  const content = rolls ? <span className={styles.rollingWord} aria-hidden="true">{Array.from(children as string).map((letter, index) => <span key={index} className={styles.rollingLetter} data-letter={letter === " " ? "\u00a0" : letter} style={{ "--letter-index": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}</span> : children;
  const accessibleLabel = props["aria-label"] ?? (rolls ? children as string : undefined);

  if (props.href) {
    const { href, ...linkProps } = rest as LinkButtonProps;
    return (
      <Link
        {...linkProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        aria-label={accessibleLabel}
      >
        {content}
      </Link>
    );
  }

  if (holdToConfirm) {
    return <HoldToConfirmButton {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} ref={ref as Ref<HTMLButtonElement>} className={className} type={(props as NativeButtonProps).type ?? "button"} aria-label={accessibleLabel}>{content}</HoldToConfirmButton>;
  }

  return (
    <button
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      ref={ref as Ref<HTMLButtonElement>}
      className={className}
      type={(props as NativeButtonProps).type ?? "button"}
      aria-label={accessibleLabel}
    >
      {content}
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
  const [state, setState] = useState<"idle" | "run" | "fold" | "done">("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const controller = useRef<AbortController | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => {
    controller.current?.abort();
    timers.current.forEach(window.clearTimeout);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

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

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setProgress(1);
      setState("fold");
      setAnnouncement("Đã tải xong tài liệu");
      timers.current.push(window.setTimeout(() => {
        setState("done");
        timers.current.push(window.setTimeout(() => {
          setState("idle");
          setProgress(null);
          setAnnouncement("");
          timers.current = [];
        }, reducedMotion ? 1600 : 3400));
      }, reducedMotion ? 80 : 650));
    } catch (error) {
      if (!activeController.signal.aborted) {
        onError?.(error);
        setAnnouncement("Không tải được tài liệu");
        setState("idle");
        setProgress(null);
      }
    } finally {
      if (controller.current === activeController) controller.current = null;
    }
  };

  const handleClick = () => {
    if (controller.current) {
      controller.current?.abort();
      controller.current = null;
      clearTimers();
      setState("idle");
      setProgress(null);
      setAnnouncement("Đã hủy tải xuống");
      return;
    }
    if (state === "fold") return;
    if (state === "done") {
      clearTimers();
      setState("idle");
      setProgress(null);
      setAnnouncement("");
      return;
    }
    clearTimers();
    void startDownload();
  };

  const label = state === "run" ? (progress == null ? "Đang tải" : `${Math.round(progress * 100)}%`) : children;
  const accessibleLabel = state === "run" ? `Hủy tải xuống ${filename}` : `${state === "done" || state === "fold" ? "Đã tải xong" : children} ${filename}`;

  return (
    <span className={styles.progressDownload} data-state={state} data-progress-known={progress !== null} style={{ "--download-progress": progress ?? 0 } as CSSProperties}>
      <button
        className={styles.progressDownloadButton}
        type="button"
        aria-label={accessibleLabel}
        aria-busy={state === "run"}
        onClick={handleClick}
      >
        <span className={styles.progressDownloadTrack} aria-hidden="true"><span className={styles.progressDownloadBar} /></span>
        <span className={styles.progressDownloadIdle} aria-hidden="true">
          <span className={styles.progressDownloadIcon}><svg viewBox="0 0 24 24"><g className={styles.progressDownloadArrow}><path d="M12 4.5v11M7 11l5 5 5-5" /></g><path d="M5 19.5h14" /></svg></span>
          <b>{children}</b>
        </span>
        <span className={styles.progressDownloadRun} aria-hidden="true"><b>{label}</b><small>Nhấn để hủy</small></span>
        <span className={styles.progressDownloadDone} aria-hidden="true"><i><svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.4" /></svg></i><span>Đã tải xong</span></span>
      </button>
      <span className={styles.progressDownloadLive} aria-live="polite">{announcement}</span>
    </span>
  );
}
