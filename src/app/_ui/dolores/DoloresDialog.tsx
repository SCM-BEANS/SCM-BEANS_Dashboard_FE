"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";

export type DoloresDialogProps = {
  open: boolean;
  onRequestClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
};

export function DoloresDialog({
  open,
  onRequestClose,
  eyebrow,
  title,
  description,
  children,
  actions,
  closeOnEscape = true,
  initialFocusRef,
}: DoloresDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, initialFocusRef]);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-3rem)] max-w-[580px] overflow-y-auto rounded-[20px] border-0 bg-white p-8 text-[#302927] shadow-xl backdrop:bg-[#302927]/25"
      aria-labelledby={titleId}
      aria-describedby={description != null ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (closeOnEscape) onRequestClose();
      }}
    >
      {eyebrow != null && <p className="text-[11px] font-medium leading-4 text-[#706561]">{eyebrow}</p>}
      <h2 id={titleId} className="mt-3 text-xl font-semibold leading-7 !text-[#302927]">{title}</h2>
      {description != null && <div id={descriptionId} className="mt-3 text-[13px] leading-5 !text-black">{description}</div>}
      {children}
      {actions != null && <div className="mt-6 grid gap-3 [&_a]:w-full [&_button]:w-full">{actions}</div>}
    </dialog>
  );
}
