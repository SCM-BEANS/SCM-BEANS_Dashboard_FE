import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { profilesApi } from "@/apis/profiles.api";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  AdminUserIdSchema,
  AdminUserUpdateSchema,
  type AdminUser,
  type AdminUserRole,
  type AdminUserUpdate,
} from "@/schema/admin-users.schema";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import { ADMIN_USER_ROLE_LABELS, formatAdminUserDate, getAdminUserRole } from "./admin-user-utils";
import styles from "@/pages/admin/admin-shell.module.css";

type UserForm = {
  name: string;
  email: string;
  role: AdminUserRole | "";
  tenantId: string;
};

export function AdminUserDetailView({
  userId,
  contractPage,
  onNavigate,
}: {
  userId: string;
  contractPage: number;
  onNavigate: (patch: Record<string, string | null>) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const validUserId = AdminUserIdSchema.safeParse(userId).success;
  const [form, setForm] = useState<UserForm>({ name: "", email: "", role: "", tenantId: "" });
  const [requestError, setRequestError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<AdminUserUpdate | null>(null);
  const [dialog, setDialog] = useState<"confirm" | "success" | "error" | null>(null);

  const detail = useQuery({
    queryKey: ["idaas", "admin-users", "detail", userId],
    queryFn: ({ signal }) => adminUsersApi.getById(userId, signal),
    enabled: router.isReady && validUserId,
  });
  const user = detail.data;
  const currentRole = user ? getAdminUserRole(user) : null;
  const doloresProfile = useQuery({
    queryKey: ["dolores", "profiles", "detail", userId],
    queryFn: ({ signal }) => profilesApi.getById(userId, signal),
    enabled: router.isReady && validUserId && currentRole === "owner",
    retry: false,
  });
  const ownerContracts = useQuery({
    queryKey: ["dolores", "profiles", "contracts", userId, contractPage, 20],
    queryFn: ({ signal }) => profilesApi.getContracts(userId, contractPage, 20, signal),
    enabled: router.isReady && validUserId && currentRole === "owner" && Boolean(doloresProfile.data),
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      role: getAdminUserRole(user) ?? "",
      tenantId: user.tenant_id ?? "",
    });
    setRequestError("");
  }, [user]);

  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserUpdate }) => adminUsersApi.update(id, input),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(["idaas", "admin-users", "detail", variables.id], result.user);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] }),
      ]);
      setPendingUpdate(null);
      setDialog("success");
    },
    onError: () => setDialog("error"),
  });

  function updateField(field: keyof UserForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setRequestError("");
  }

  function prepareUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !currentRole) return;

    const input: AdminUserUpdate = {};
    if (form.name.trim() !== user.name) input.name = form.name;
    if (form.email.trim() !== user.email) input.email = form.email;
    if (form.role && form.role !== currentRole) input.role = form.role;
    const nextTenantId = form.role === "owner" ? form.tenantId || null : null;
    if (nextTenantId !== (user.tenant_id ?? null)) input.tenant_id = nextTenantId;

    const parsed = AdminUserUpdateSchema.safeParse(input);
    if (!parsed.success) {
      setRequestError(Object.keys(input).length ? T.FORM.INVALID : T.FORM.NO_CHANGE);
      return;
    }
    setRequestError("");
    updateUser.reset();
    setPendingUpdate(parsed.data);
    setDialog("confirm");
  }

  function closeDialog() {
    if (updateUser.isPending) return;
    setDialog(null);
    setPendingUpdate(null);
  }

  const canEdit = Boolean(user && currentRole);
  const roleOptions = (Object.keys(ADMIN_USER_ROLE_LABELS) as AdminUserRole[]).map((role) => (
    <option key={role} value={role}>{ADMIN_USER_ROLE_LABELS[role]}</option>
  ));

  return (
    <>
      {!validUserId ? (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">{T.FORM.INVALID_ID}</div>
      ) : detail.isPending ? (
        <section className={styles.panel} role="status">{T.FORM.DETAIL_LOADING}</section>
      ) : detail.isError ? (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
          <p>{getApiErrorMessage(detail.error)}</p>
          <button className={styles.accountSecondaryButton} type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button>
        </div>
      ) : user ? (
        <>
          <form id="admin-user-edit-form" className={styles.panel} onSubmit={prepareUpdate}>
            <h2>{T.FORM.DETAIL_TITLE}</h2>
            {!currentRole && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">{T.FORM.UNSUPPORTED_ROLE}</div>}
            <div className={styles.accountFormGrid}>
              <label>
                {T.FORM.NAME}
                <input value={form.name} maxLength={50} disabled={!canEdit} onChange={(event) => updateField("name", event.target.value)} />
              </label>
              <label>
                {T.FORM.EMAIL}
                <input type="email" value={form.email} maxLength={255} disabled={!canEdit} onChange={(event) => updateField("email", event.target.value)} />
              </label>
              <label>
                {T.FORM.ROLE}
                <select value={form.role} disabled={!canEdit} onChange={(event) => updateField("role", event.target.value)}>
                  {roleOptions}
                </select>
              </label>
              <div><span>{T.FORM.STATUS}</span><strong>{user.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED}</strong></div>
              <div><span>{T.FORM.VERIFIED}</span><strong>{user.email_verified ? T.FORM.YES : T.FORM.NO}</strong></div>
              <div><span>{T.FORM.CREATED}</span><strong>{formatAdminUserDate(user.created_at)}</strong></div>
              <div><span>{T.FORM.UPDATED}</span><strong>{formatAdminUserDate(user.updated_at)}</strong></div>
            </div>
            {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
            {updateUser.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(updateUser.error, "mutation")}</p>}
          </form>
          {currentRole === "owner" && <section className={styles.panel} aria-labelledby="owner-profile-verification-title">
            <h2 id="owner-profile-verification-title">Xác minh hồ sơ Owner trong Dolores</h2>
            <p>Tra cứu bằng cùng UUID IDaaS được API tạo tài khoản trả về: <code>{user.id}</code>.</p>
            {doloresProfile.isPending && <p role="status">Đang tải hồ sơ Dolores…</p>}
            {doloresProfile.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
              <p>{getApiErrorMessage(doloresProfile.error)}</p>
              <p>Hồ sơ có thể chưa được đồng bộ từ IDaaS. Hãy thử lại sau; trình duyệt không gọi API đồng bộ nội bộ.</p>
              <button className={styles.accountSecondaryButton} type="button" disabled={doloresProfile.isFetching} onClick={() => void doloresProfile.refetch()}>{T.COMMON.RETRY}</button>
            </div>}
            {doloresProfile.data && <div className={styles.accountFormGrid}>
              <div><span>UUID IDaaS</span><strong>{doloresProfile.data.idaasUserId}</strong></div>
              <div><span>Email</span><strong>{doloresProfile.data.email || "—"}</strong></div>
              <div><span>Vai trò Dolores</span><strong>{doloresProfile.data.roles.join(", ") || "—"}</strong></div>
              <div><span>Trạng thái hồ sơ</span><strong>{doloresProfile.data.status}</strong></div>
              <div><span>Email đã xác minh</span><strong>{doloresProfile.data.emailVerified ? "Có" : "Chưa"}</strong></div>
            </div>}
            {doloresProfile.data && <div className={styles.accountProfileContracts}>
              <h3>Hợp đồng của Owner</h3>
              {ownerContracts.isPending && <p role="status">Đang tải hợp đồng…</p>}
              {ownerContracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
                <p>{getApiErrorMessage(ownerContracts.error)}</p>
                <button className={styles.accountSecondaryButton} type="button" disabled={ownerContracts.isFetching} onClick={() => void ownerContracts.refetch()}>{T.COMMON.RETRY}</button>
              </div>}
              {ownerContracts.data && <DataTable
                variant="accounts"
                rows={ownerContracts.data.items}
                rowKey={(contract) => contract.contractId ?? contract.id ?? `${contract.machineId}-${contract.startDate}`}
                emptyMessage="Owner chưa có hợp đồng."
                columns={[
                  { key: "contract", header: "UUID hợp đồng", render: (contract) => contract.contractId ?? contract.id ?? "—" },
                  { key: "machine", header: "UUID máy", render: (contract) => contract.machineId ?? "—" },
                  { key: "status", header: "Trạng thái", render: (contract) => contract.status ?? "—" },
                  { key: "dates", header: "Thời hạn", render: (contract) => `${contract.startDate ?? "—"} – ${contract.endDate ?? "—"}` },
                ]}
              />}
              {ownerContracts.data && ownerContracts.data.totalPages > 0 && (
                <div className={styles.accountPagination} aria-label="Phân trang hợp đồng Owner">
                  <span>Trang {contractPage + 1}/{ownerContracts.data.totalPages}</span>
                  <div>
                    <button
                      className={styles.accountSecondaryButton}
                      type="button"
                      disabled={contractPage <= 0 || ownerContracts.isFetching}
                      onClick={() => onNavigate({ contractPage: String(contractPage) })}
                    >
                      {T.LIST.PREVIOUS}
                    </button>
                    <button
                      className={styles.accountSecondaryButton}
                      type="button"
                      disabled={contractPage + 1 >= ownerContracts.data.totalPages || ownerContracts.isFetching}
                      onClick={() => onNavigate({ contractPage: String(contractPage + 2) })}
                    >
                      {T.LIST.NEXT}
                    </button>
                  </div>
                </div>
              )}
            </div>}
          </section>}
        </>
      ) : null}

      <ActionBarConfig>
        <ButtonBar type="submit" form="admin-user-edit-form" disabled={!canEdit || detail.isPending || updateUser.isPending}>{T.FORM.SAVE}</ButtonBar>
        <ButtonBar type="button" onClick={() => onNavigate({ view: null, id: null, contractPage: null })}>{T.FORM.BACK}</ButtonBar>
      </ActionBarConfig>

      {dialog === "confirm" && pendingUpdate && (
        <NotificationDialog
          variant="confirm"
          title={T.DIALOG.CONFIRM}
          description={T.DIALOG.UPDATE}
          primaryAction={{
            label: T.DIALOG.PROCEED,
            pending: updateUser.isPending,
            pendingLabel: "Đang lưu…",
            onClick: () => user && updateUser.mutate({ id: user.id, input: pendingUpdate }),
          }}
          secondaryAction={{ label: T.DIALOG.RETURN, disabled: updateUser.isPending, onClick: closeDialog }}
          onClose={closeDialog}
          closeOnEscape={!updateUser.isPending}
        >
          <p>
            {pendingUpdate.name ? `${T.FORM.NAME}: ${pendingUpdate.name}. ` : ""}
            {pendingUpdate.email ? `${T.FORM.EMAIL}: ${pendingUpdate.email}. ` : ""}
            {pendingUpdate.role ? `${T.FORM.ROLE}: ${ADMIN_USER_ROLE_LABELS[pendingUpdate.role]}. ` : ""}
            {pendingUpdate.tenant_id !== undefined ? `${T.FORM.TENANT}: ${pendingUpdate.tenant_id || T.FORM.TENANT_UNASSIGNED}.` : ""}
          </p>
        </NotificationDialog>
      )}
      {dialog === "success" && (
        <NotificationDialog
          variant="success"
          title={T.DIALOG.SUCCESS}
          description={updateUser.data?.email_verification_started ? T.DIALOG.VERIFICATION_STARTED : T.DIALOG.UPDATE}
          primaryAction={{ label: T.DIALOG.CLOSE, onClick: closeDialog }}
          onClose={closeDialog}
        />
      )}
      {dialog === "error" && (
        <NotificationDialog
          variant="error"
          title="Không lưu được thay đổi"
          description={updateUser.error ? getApiErrorMessage(updateUser.error, "mutation") : T.DIALOG.UPDATE}
          primaryAction={{ label: T.DIALOG.CLOSE, onClick: closeDialog }}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
