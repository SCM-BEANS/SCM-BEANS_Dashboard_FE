import Link from "next/link";
import {
  forwardRef,
  useEffect,
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
  };

type NativeButtonProps = SharedProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
  };

export type ButtonBarProps = LinkButtonProps | NativeButtonProps;

export const ButtonBar = forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  ButtonBarProps
>(function ButtonBar(props, ref) {
  const { variant = "secondary", rollingLabel = false, ...rest } = props;
  const rolls = rollingLabel && typeof props.children === "string";
  const className = [styles.button, styles[variant], rolls && styles.rollingButton, props.className].filter(Boolean).join(" ");
  // Lucian UX/UI Prompt #009 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#009
  const content = rolls ? <span className={styles.rollingWord} aria-hidden="true">{Array.from(props.children as string).map((letter, index) => <span key={index} className={styles.rollingLetter} data-letter={letter === " " ? "\u00a0" : letter} style={{ "--letter-index": index } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>)}</span> : props.children;
  const accessibleLabel = props["aria-label"] ?? (rolls ? props.children as string : undefined);

  if (props.href) {
    const { href, children, ...linkProps } = rest as LinkButtonProps;
    return (
      <Link
        {...linkProps}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        className={className}
        aria-label={accessibleLabel}
      >
        {rolls ? content : children}
      </Link>
    );
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
