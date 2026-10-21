"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useCallback, useContext, useState } from "react";
import { DoloresShellFocusContext } from "@/app/_shell/dolores/DoloresShell";

type AdminMachineFocusViewProps = {
  information: ReactNode;
  model: ReactNode;
};

export function AdminMachineFocusView({
  information,
  model,
}: AdminMachineFocusViewProps) {
  const [isFocused, setIsFocused] = useState(false);
  const shellFocus = useContext(DoloresShellFocusContext);

  const openFocusView = useCallback(() => {
    setIsFocused(true);
    shellFocus?.setFocusLabel("Mô hình máy");
  }, [shellFocus]);
  const closeFocusView = useCallback(() => {
    setIsFocused(false);
    shellFocus?.setFocusLabel(null);
  }, [shellFocus]);
  const handleModelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFocusView();
      }
    },
    [openFocusView],
  );

  const modelSlot = (
    <div
      aria-label={isFocused ? undefined : "Mở mô hình máy ở tab chính"}
      className={isFocused ? "min-w-0" : "min-w-0 cursor-pointer"}
      onClick={isFocused ? undefined : openFocusView}
      onKeyDown={isFocused ? undefined : handleModelKeyDown}
      role={isFocused ? undefined : "button"}
      tabIndex={isFocused ? undefined : 0}
    >
      {model}
    </div>
  );

  if (!isFocused) {
    return (
      <div
        className="grid gap-4 xl:grid-cols-2"
        style={
          {
            "--admin-machine-viewer-height": "min(62vh, 700px)",
          } as CSSProperties
        }
      >
        <div className="min-w-0">{information}</div>
        {modelSlot}
      </div>
    );
  }

  return (
    <div
      aria-label="Mô hình máy"
      aria-modal="true"
      className="fixed inset-x-0 bottom-[140px] top-16 z-50 overflow-y-auto bg-[#F8F6F3] p-4 md:p-6 lg:bottom-0 lg:left-[240px] lg:top-[72px]"
      role="dialog"
      style={
        {
          "--admin-machine-viewer-height": "calc(100dvh - 3rem)",
        } as CSSProperties
      }
    >
      <button
        aria-label="Đóng chế độ xem chính"
        className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white text-2xl leading-none text-[#302927] shadow-sm hover:bg-[#F7F5F3]"
        onClick={closeFocusView}
        type="button"
      >
        <span aria-hidden="true">×</span>
      </button>
      <div className="mx-auto min-h-full w-full max-w-[1600px]">{modelSlot}</div>
    </div>
  );
}
