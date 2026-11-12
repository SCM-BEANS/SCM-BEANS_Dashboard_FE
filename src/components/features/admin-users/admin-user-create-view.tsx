import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { ButtonBar } from "@/components/button/button-bar";
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
import styles from "@/pages/admin/admin-shell.module.css";

const roleDescriptions = {
  owner: "Quản lý máy, hợp đồng và thanh toán trong phạm vi của mình.",
  moderator: "Theo dõi và điều phối công việc trong phạm vi được phân quyền.",
  technician: "Tiếp nhận và thực hiện công việc được giao.",
};

export function AdminUserCreateView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState<AccountCreateValue>({ name: "", email: "", role: "" });
  const [createError, setCreateError] = useState("");
  const [createCredential, setCreateCredential] = useState<AccountCredential | null>(null);
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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
      <div className={styles.userCreateLayout}>
      <AccountCreateForm
        id="admin-user-create-form"
        title="Thông tin tài khoản"
        value={createForm}
        roleOptions={createRoleOptions}
        onChange={updateCreateField}
        onSubmit={requestCreateAccount}
        error={createError}
        disabled={createUser.isPending || createConfirmOpen || createRetryBlocked}
      >
        <p className={styles.userFormNote}>Mật khẩu tạm chỉ hiển thị một lần sau khi tạo thành công. Hãy lưu lại để bàn giao tài khoản.</p>
        <div className={styles.userInlineActions}>
          <ButtonBar disabled={createUser.isPending} onClick={() => Object.values(createForm).some(Boolean) ? setCancelOpen(true) : void router.push(PATH_ADMIN.USERS)}>Hủy tạo</ButtonBar>
          <ButtonBar variant="primary" type="submit" disabled={createUser.isPending || createConfirmOpen || createRetryBlocked || !AdminUserCreateSchema.safeParse(createForm).success}>{createUser.isPending ? "Đang tạo…" : T.LIST.CREATE}</ButtonBar>
        </div>
      </AccountCreateForm>
      <aside className={`${styles.panel} ${styles.userContext}`} aria-label="Hướng dẫn chọn vai trò">
        <h2>Vai trò và quyền truy cập</h2>
        {createForm.role ? <><strong>{ADMIN_USER_ROLE_LABELS[createForm.role]}</strong><p>{roleDescriptions[createForm.role]}</p></> : <p>Chọn vai trò để xem phạm vi sử dụng của tài khoản.</p>}
        <p className={styles.userFormNote}>Thông tin đăng nhập sẽ được hiển thị sau khi tạo tài khoản.</p>
      </aside>
      </div>

      {cancelOpen && <NotificationDialog variant="confirm" title="Hủy tạo tài khoản?" description="Thông tin chưa lưu sẽ bị mất." primaryAction={{ label: "Hủy tạo", onClick: () => void router.push(PATH_ADMIN.USERS) }} secondaryAction={{ label: "Tiếp tục nhập", onClick: () => setCancelOpen(false) }} onClose={() => setCancelOpen(false)} />}

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
          summary={`${createForm.name.trim()} · ${createForm.email.trim()} · ${ADMIN_USER_ROLE_LABELS[createForm.role as AdminUserRole]}`}
          actionLabel={createUser.data?.role === "owner" ? "Mở hồ sơ khách hàng" : T.FORM.BACK}
          onClose={() => {
            const createdUser = createUser.data;
            setCreateCredential(null);
            setCreateForm({ name: "", email: "", role: "" });
            void router.push(createdUser?.role === "owner"
              ? PATH_ADMIN.USER_DETAIL(createdUser.id)
              : PATH_ADMIN.USERS);
          }}
        />
      )}
    </>
  );
}
