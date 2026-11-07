import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { AccountCreateForm, type AccountCreateField, type AccountCreateValue } from "@/components/account/account-create-form";
import { AccountSuccessDialog, type AccountCredential } from "@/components/account/account-success-dialog";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import {
  AccountCreatedResponseValidationError,
  getApiErrorMessage,
  isUncertainApiMutation,
} from "@/lib/api-errors";
import {
  AdminUserCreateSchema,
  AdminUserRoleSchema,
  type AdminUserCreate,
  type AdminUserRole,
} from "@/schema/admin-users.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import { ADMIN_USER_ROLE_LABELS } from "./admin-user-utils";

export function AdminUserCreateView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState<AccountCreateValue>({ name: "", email: "", role: "" });
  const [createError, setCreateError] = useState("");
  const [createCredential, setCreateCredential] = useState<AccountCredential | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  const createUser = useMutation({
    mutationFn: (input: AdminUserCreate) => adminUsersApi.create(input),
    onSuccess: async (result) => {
      setCreateCredential({
        password: result.temporary_password,
        expiresAt: result.temporary_password_expires_at,
        emailVerificationStarted: result.email_verification_started,
        onboardingEmailSent: result.onboarding_email_sent,
      });
      setCreateConfirmOpen(false);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] }),
      ]);
    },
    onError: (error: unknown) => {
      setCreateError(getApiErrorMessage(error, "mutation"));
      setCreateConfirmOpen(false);
      if (error instanceof AccountCreatedResponseValidationError || isUncertainApiMutation(error)) {
        void queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      }
    },
  });

  function updateCreateField(field: AccountCreateField, value: string) {
    if (field === "role") {
      const parsedRole = AdminUserRoleSchema.safeParse(value);
      setCreateForm((current) => ({ ...current, role: parsedRole.success ? parsedRole.data : "" }));
    } else {
      setCreateForm((current) => ({ ...current, [field]: value }));
    }
    setCreateError("");
    if (createUser.isError) createUser.reset();
  }

  function requestCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createUser.isPending || createCredential || createConfirmOpen) return;

    const parsed = AdminUserCreateSchema.safeParse({
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    });
    if (!parsed.success) {
      setCreateError(T.FORM.INVALID);
      return;
    }

    setCreateError("");
    createUser.reset();
    setCreateConfirmOpen(true);
  }

  function confirmCreateAccount() {
    if (createUser.isPending || createCredential) return;
    const parsed = AdminUserCreateSchema.safeParse({
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    });
    if (!parsed.success) {
      setCreateError(T.FORM.INVALID);
      setCreateConfirmOpen(false);
      return;
    }
    setCreateError("");
    createUser.mutate(parsed.data);
  }

  const createRetryBlocked = createUser.isError && (
    createUser.error instanceof AccountCreatedResponseValidationError ||
    isUncertainApiMutation(createUser.error)
  );
  const createRoleOptions = (Object.keys(ADMIN_USER_ROLE_LABELS) as AdminUserRole[]).map((role) => ({
    value: role,
    label: ADMIN_USER_ROLE_LABELS[role],
  }));

  return (
    <>
      <AccountCreateForm
        id="admin-user-create-form"
        title={T.FORM.CREATE_TITLE}
        value={createForm}
        roleOptions={createRoleOptions}
        onChange={updateCreateField}
        onSubmit={requestCreateAccount}
        error={createError}
        disabled={createUser.isPending || createConfirmOpen || createRetryBlocked}
      />

      <PageActions actions={[
        { id: "user-cancel", label: T.FORM.CANCEL, variant: "secondary", priority: 100, onClick: () => void router.push(PATH_ADMIN.USERS), confirm: Object.values(createForm).some(Boolean) ? { title: "Hủy tạo người dùng?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined },
        { id: "user-create", label: "Tạo người dùng", variant: "primary", priority: 100, type: "submit", form: "admin-user-create-form", disabled: createUser.isPending || createConfirmOpen || createRetryBlocked || !AdminUserCreateSchema.safeParse(createForm).success, disabledReason: createRetryBlocked ? "Không thể thử lại thao tác này." : createConfirmOpen ? "Đang chờ xác nhận." : "Điền thông tin người dùng hợp lệ.", pending: createUser.isPending, pendingLabel: "Đang tạo…" },
      ]} />

      {createConfirmOpen && (
        <NotificationDialog
          variant="confirm"
          title={T.DIALOG.CONFIRM}
          description={T.DIALOG.CREATE}
          primaryAction={{
            label: T.DIALOG.PROCEED,
            pending: createUser.isPending,
            pendingLabel: "Đang tạo…",
            onClick: confirmCreateAccount,
          }}
          secondaryAction={{ label: T.FORM.CANCEL, disabled: createUser.isPending, onClick: () => setCreateConfirmOpen(false) }}
          onClose={() => { if (!createUser.isPending) setCreateConfirmOpen(false); }}
          closeOnEscape={!createUser.isPending}
        >
          <p>{createForm.name.trim()} · {createForm.email.trim()} · {ADMIN_USER_ROLE_LABELS[createForm.role as AdminUserRole] ?? T.FORM.SELECT_ROLE}</p>
        </NotificationDialog>
      )}

      {createCredential && (
        <AccountSuccessDialog
          credential={createCredential}
          title={T.DIALOG.SUCCESS}
          summary={`${createForm.name.trim()} · ${createForm.email.trim()} · ${ADMIN_USER_ROLE_LABELS[createForm.role as AdminUserRole]}${createUser.data?.role === "owner" ? ` · UUID IDaaS: ${createUser.data.id}` : ""}`}
          actionLabel={createUser.data?.role === "owner" ? "Tiếp tục xác minh hồ sơ" : T.FORM.BACK}
          onClose={() => {
            const createdUser = createUser.data;
            setCreateCredential(null);
            setCreateForm({ name: "", email: "", role: "" });
            void router.push(createdUser?.role === "owner"
              ? { pathname: PATH_ADMIN.USERS, query: { view: "detail", id: createdUser.id } }
              : PATH_ADMIN.USERS);
          }}
        />
      )}
    </>
  );
}
