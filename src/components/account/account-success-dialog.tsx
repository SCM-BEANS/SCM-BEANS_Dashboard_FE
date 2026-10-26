import { useEffect, useRef } from "react";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import styles from "./account-success-dialog.module.css";

export type AccountCredential = {
  password: string;
  expiresAt?: string | null;
  emailVerificationStarted?: boolean;
  onboardingEmailSent?: boolean;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

export function AccountSuccessDialog({
  credential,
  onClose,
}: {
  credential: AccountCredential;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, []);

  return (
    <div className={styles.backdrop}>
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-success-title"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
          if (!buttons?.length) return;
          if (event.shiftKey && document.activeElement === buttons[0]) {
            event.preventDefault();
            buttons[buttons.length - 1].focus();
          } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
            event.preventDefault();
            buttons[0].focus();
          }
        }}
      >
        <h2 id="account-success-title">{T.DIALOG.SUCCESS}</h2>
        <div className={styles.credential}>
          <strong>{T.DIALOG.PASSWORD_ONCE}</strong>
          <code>{credential.password}</code>
          <p>{T.DIALOG.PASSWORD_EXPIRY}: {credential.expiresAt ? formatDate(credential.expiresAt) : T.DIALOG.PASSWORD_EXPIRY_UNAVAILABLE}</p>
          {credential.emailVerificationStarted !== undefined ? (
            <p>{credential.emailVerificationStarted
              ? T.DIALOG.VERIFICATION_STARTED
              : T.DIALOG.VERIFICATION_NOT_STARTED}</p>
          ) : credential.onboardingEmailSent !== undefined ? (
            <p>{credential.onboardingEmailSent
              ? T.DIALOG.ONBOARDING_EMAIL_SENT
              : T.DIALOG.ONBOARDING_EMAIL_NOT_SENT}</p>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            {T.DIALOG.CLOSE}
          </button>
        </div>
      </div>
    </div>
  );
}