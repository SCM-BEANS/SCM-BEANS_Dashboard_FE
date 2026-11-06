import { useState } from "react";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import styles from "./reason-dialog.module.css";

export function ReasonDialog({
  title,
  description,
  label = "Lý do",
  pending = false,
  error,
  confirmLabel = "Xác nhận",
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  label?: string;
  pending?: boolean;
  error?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState("");

  const submit = () => {
    const value = reason.trim();
    if (!value) {
      setValidationError("Vui lòng nhập lý do trước khi xác nhận.");
      return;
    }
    setValidationError("");
    onConfirm(value);
  };

  return (
    <NotificationDialog
      variant="confirm"
      title={title}
      description={description}
      onClose={onClose}
      primaryAction={{
        label: confirmLabel,
        pending,
        pendingLabel: "Đang lưu…",
        disabled: !reason.trim(),
        onClick: submit,
      }}
      secondaryAction={{ label: "Hủy", disabled: pending, onClick: onClose }}
    >
      <div className={styles.field}>
        <label htmlFor="reason-dialog-input">{label}</label>
        <textarea
          id="reason-dialog-input"
          value={reason}
          maxLength={1000}
          rows={4}
          aria-invalid={Boolean(validationError || error)}
          aria-describedby={validationError || error ? "reason-dialog-error" : undefined}
          onChange={(event) => {
            setReason(event.target.value);
            setValidationError("");
          }}
        />
        <span className={styles.counter}>{reason.length}/1000</span>
        {(validationError || error) && <p className={styles.error} id="reason-dialog-error" role="alert">{validationError || error}</p>}
      </div>
    </NotificationDialog>
  );
}
