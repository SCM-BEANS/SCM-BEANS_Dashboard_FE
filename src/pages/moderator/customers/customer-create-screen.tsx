import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "@/apis/admin-users.api";
import { AccountCreateForm, type AccountCreateValue } from "@/components/account/account-create-form";
import { AccountSuccessDialog, type AccountCredential } from "@/components/account/account-success-dialog";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { AdminUserCreateSchema } from "@/schema/admin-users.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { ADMIN_USERS_MESSAGES as A } from "@/text/admin/admin-users-messages";
import { moderatorStyles as styles } from "../moderator-shell";


const OWNER_ROLE = "owner" as const;
const fixedOwnerRole = { value: OWNER_ROLE, label: A.COMMON.OWNER };
const emptyValue: AccountCreateValue = { name: "", email: "", role: OWNER_ROLE };

export function ModeratorCustomerCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [value, setValue] = useState<AccountCreateValue>(emptyValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState<AccountCredential | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function updateField(field: "name" | "email" | "role", nextValue: string) {
    setValue((current) => ({ ...current, [field]: field === "role" ? OWNER_ROLE : nextValue }));
  }

  function requestCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || credential || confirmOpen) return;

    const parsed = AdminUserCreateSchema.safeParse({
      name: value.name,
      email: value.email,
      role: OWNER_ROLE,
    });
    if (!parsed.success) {
      setError(A.FORM.INVALID);
      return;
    }

    setError("");
    setConfirmOpen(true);
  }

  async function confirmCreateAccount() {
    if (busy || credential) return;

    setBusy(true);
    setError("");
    try {
      const parsed = AdminUserCreateSchema.safeParse({
        name: value.name,
        email: value.email,
        role: OWNER_ROLE,
      });
      if (!parsed.success) {
        setError(A.FORM.INVALID);
        return;
      }

      const result = await adminUsersApi.create(parsed.data);
      setCredential({
        password: result.temporary_password,
        expiresAt: result.temporary_password_expires_at,
        emailVerificationStarted: result.email_verification_started,
        onboardingEmailSent: result.onboarding_email_sent,
      });
      setConfirmOpen(false);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "tenants"] }),
      ]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "mutation"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading title={A.FORM.CREATE_TITLE} description={A.FORM.CREATE_DESCRIPTION} />

      {credential ? (
        <AccountSuccessDialog
          credential={credential}
          title={"T\u1ea1o t\u00e0i kho\u1ea3n kh\u00e1ch h\u00e0ng th\u00e0nh c\u00f4ng"}
          summary={`${value.name.trim()} \u00b7 ${value.email.trim()} \u00b7 ${A.COMMON.OWNER}`}
          actionLabel="V\u1ec1 danh s\u00e1ch"
          onClose={() => {
            setCredential(null);
            void router.push(PATH_MODERATOR.CUSTOMERS);
          }}
        />
      ) : (
        <>
          <AccountCreateForm
            id="moderator-customer-create-form"
            title={A.FORM.DETAIL_TITLE}
            value={value}
            fixedRole={fixedOwnerRole}
            onChange={updateField}
            onSubmit={requestCreateAccount}
            error={confirmOpen ? "" : error}
            disabled={busy || confirmOpen}
          >
            <div className={styles.createActions}>
              <ButtonBar type="submit" disabled={busy || confirmOpen}>
                {busy ? "\u0110ang t\u1ea1o\u2026" : A.LIST.CREATE}
              </ButtonBar>
              <ButtonBar href={PATH_MODERATOR.CUSTOMERS}>
                {A.FORM.CANCEL}
              </ButtonBar>
            </div>
          </AccountCreateForm>
          {confirmOpen && (
            <NotificationDialog
              variant="confirm"
              title={"X\u00e1c nh\u1eadn t\u1ea1o t\u00e0i kho\u1ea3n kh\u00e1ch h\u00e0ng"}
              description={`${value.name.trim()} \u00b7 ${value.email.trim()} \u00b7 ${A.COMMON.OWNER}`}
              primaryAction={{
                label: A.DIALOG.PROCEED,
                pending: busy,
                pendingLabel: "\u0110ang t\u1ea1o\u2026",
                onClick: () => void confirmCreateAccount(),
              }}
              secondaryAction={{ label: A.FORM.CANCEL, onClick: () => setConfirmOpen(false), disabled: busy }}
              onClose={() => setConfirmOpen(false)}
              closeOnEscape={!busy}
            >
              {error && <p role="alert">{error}</p>}
            </NotificationDialog>
          )}
        </>
      )}
    </div>
  );
}
