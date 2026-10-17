"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./DoloresShell.module.css";

export function DoloresDialog({ children, labelledBy, onClose, className = styles.dialogOverlay, id }: { children: ReactNode; labelledBy: string; onClose?: () => void; className?: string; id?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = container.current;
    dialog?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);

  return <div ref={container} id={id} className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onKeyDown={(event) => {
    if (event.key === "Escape" && close.current) { event.stopPropagation(); close.current(); }
    if (event.key !== "Tab") return;
    const targets = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(element => element.getClientRects().length > 0);
    const first = targets[0];
    const last = targets[targets.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === container.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container.current)) { event.preventDefault(); first.focus(); }
  }}>{children}</div>;
}
