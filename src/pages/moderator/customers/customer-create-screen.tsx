import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { adminUsersApi } from "@/apis/admin-users.api";
import { AccountCreateForm, type AccountCreateValue } from "@/components/account/account-create-form";
import { AccountSuccessDialog, type AccountCredential } from "@/components/account/account-success-dialog";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { AdminUserCreateSchema } from "@/schema/admin-users.schema";
import { PATH_MODERATOR } from "@/routes/path";
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

  function updateField(field: "name" | "email" | "role", nextValue: string) {
    setValue((current) => ({ ...current, [field]: field === "role" ? OWNER_ROLE : nextValue }));
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || credential) return;

    const parsed = AdminUserCreateSchema.safeParse({
      name: value.name,
      email: value.email,
      role: OWNER_ROLE,
    });
    if (!parsed.success) {
      setError(A.FORM.INVALID);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const result = await adminUsersApi.create(parsed.data);
      setCredential({
        password: result.temporary_password,
        expiresAt: result.temporary_password_expires_at,
        emailVerificationStarted: result.email_verification_started,
        onboardingEmailSent: result.onboarding_email_sent,
      });
      await Promise.all([
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
      <header className={styles.pageHeading}>
        <h1>{A.FORM.CREATE_TITLE}</h1>
        <p>{A.FORM.CREATE_DESCRIPTION}</p>
      </header>

      {credential ? (
        <AccountSuccessDialog
          credential={credential}
          onClose={() => {
            setCredential(null);
            void router.push(PATH_MODERATOR.CUSTOMERS);
          }}
        />
      ) : (
        <AccountCreateForm
          id="moderator-customer-create-form"
          title={A.FORM.DETAIL_TITLE}
          value={value}
          fixedRole={fixedOwnerRole}
          onChange={updateField}
          onSubmit={createAccount}
          error={error}
          disabled={busy}
        >
          <div className={styles.createActions}>
            <ButtonBar type="submit" disabled={busy}>
              {busy ? "\u0110ang t\u1ea1o\u2026" : A.LIST.CREATE}
            </ButtonBar>
            <ButtonBar href={PATH_MODERATOR.CUSTOMERS}>
              {A.FORM.CANCEL}
            </ButtonBar>
          </div>
        </AccountCreateForm>
      )}
    </div>
  );
}
