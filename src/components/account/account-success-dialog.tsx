import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
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
  title = T.DIALOG.SUCCESS,
  summary,
  actionLabel = T.DIALOG.CLOSE,
}: {
  credential: AccountCredential;
  onClose: () => void;
  title?: string;
  summary?: string;
  actionLabel?: string;
}) {
  return (
    <NotificationDialog
      variant="success"
      title={title}
      description={(
        <div className={styles.successContent}>
          {summary && <p className={styles.summary}>{summary}</p>}
          <div className={styles.credential}>
            <strong>{T.DIALOG.PASSWORD_ONCE}</strong>
            <code>{credential.password}</code>
            <p>
              {T.DIALOG.PASSWORD_EXPIRY}: {credential.expiresAt
                ? formatDate(credential.expiresAt)
                : T.DIALOG.PASSWORD_EXPIRY_UNAVAILABLE}
            </p>
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
        </div>
      )}
      primaryAction={{ label: actionLabel, onClick: onClose }}
      onClose={onClose}
    />
  );
}
