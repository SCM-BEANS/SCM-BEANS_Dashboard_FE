import { useEffect, useRef, useState } from "react";
import styles from "./image-preview.module.css";

export type ImagePreviewStatus = "idle" | "loading" | "error";

export function ImagePreview({
  src,
  alt,
  width = 128,
  height = 84,
  status = "idle",
}: {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  status?: ImagePreviewStatus;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && src && !dialog.open) dialog.showModal();
    else if ((!isOpen || !src) && dialog.open) dialog.close();
  }, [isOpen, src]);

  return (
    <div className={styles.preview} style={{ width, height }}>
      {src ? (
        <button
          className={styles.previewButton}
          type="button"
          aria-haspopup="dialog"
          aria-label={`Xem ảnh ${alt} kích thước lớn`}
          onClick={() => setIsOpen(true)}
        >
          <img src={src} alt="" width={width} height={height} decoding="async" />
        </button>
      ) : status === "error" ? "Không thể xem trước ảnh"
        : status === "loading" ? <span role="status">Đang tải ảnh…</span>
          : null}
      <dialog
        ref={dialogRef}
        className={styles.lightbox}
        aria-label={`Ảnh ${alt}`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <button
          className={styles.closeButton}
          type="button"
          aria-label="Đóng ảnh"
          onClick={() => dialogRef.current?.close()}
        >
          <span aria-hidden="true">×</span>
        </button>
        {src ? <img className={styles.lightboxImage} src={src} alt={alt} /> : null}
      </dialog>
    </div>
  );
}
