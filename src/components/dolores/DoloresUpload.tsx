"use client";

import { useRef } from "react";
import styles from "./DoloresShell.module.css";

export function DoloresUpload({ label, value, invalid = false, onChange }: { label: string; value: string; invalid?: boolean; onChange: (file: File | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <input ref={input} className="sr-only" type="file" aria-label={label} aria-invalid={invalid} tabIndex={-1} onChange={event => onChange(event.target.files?.[0])} />
    <button className={styles.upload} type="button" aria-label={label} data-invalid={invalid} onClick={() => input.current?.click()}>
      <span>{value ? `${value} · Đã chọn` : "Chọn ảnh / tài liệu"}</span>

    </button>
  </>;
}
