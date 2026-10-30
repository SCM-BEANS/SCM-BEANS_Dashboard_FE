import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  AdminUserIdSchema,
  AdminUserRoleSchema,
  AdminUserStatusSchema,
  AdminUserCreateSchema,
  AdminUserUpdateSchema,
  type AdminUser,
  type AdminUserCreate,
  type AdminUserRole,
  type AdminUserUpdate,
} from "@/schema/admin-users.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

type UserForm = {
  name: string;
  email: string;
  role: AdminUserRole | "";
};

type CreateUserForm = {
  name: string;
  email: string;
  role: AdminUserRole | "";
};

type UserDialog = "confirm-create" | "confirm-update" | "confirm-disable" | "confirm-reactivate" | "confirm-reissue" | "result" | "error" | null;

const roleLabels: Record<AdminUserRole, string> = {
  owner: T.COMMON.OWNER,
  moderator: T.COMMON.MODERATOR,
  technician: T.COMMON.TECHNICIAN,
};

function queryValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function positiveNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function userRole(user: AdminUser): AdminUserRole | null {
  for (const role of user.roles) {
    const parsed = AdminUserRoleSchema.safeParse(role.toLowerCase().replace(/^role_/, ""));
    if (parsed.success) return parsed.data;
  }
  return null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

function AdminUsersContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const viewQuery = queryValue(router.query.view);
  const view = viewQuery === "detail" ? "detail" : viewQuery === "create" ? "create" : "list";
  const userId = queryValue(router.query.id);
  const validUserId = AdminUserIdSchema.safeParse(userId).success;
  const page = positiveNumber(queryValue(router.query.page), 1);
  const pageSize = 20;
  const search = queryValue(router.query.q).trim().slice(0, 100);
  const roleFilter = AdminUserRoleSchema.safeParse(queryValue(router.query.role));
  const statusFilter = AdminUserStatusSchema.safeParse(queryValue(router.query.status));
  const [searchDraft, setSearchDraft] = useState(search);
  const [form, setForm] = useState<UserForm>({ name: "", email: "", role: "" });
  const [createForm, setCreateForm] = useState<CreateUserForm>({ name: "", email: "", role: "" });
  const [requestError, setRequestError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<AdminUserUpdate | null>(null);
  const [pendingCreate, setPendingCreate] = useState<AdminUserCreate | null>(null);
  const [dialog, setDialog] = useState<UserDialog>(null);
  const [dialogError, setDialogError] = useState("");
  const [resultTitle, setResultTitle] = useState("");
  const [resultDescription, setResultDescription] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [returnToListAfterResult, setReturnToListAfterResult] = useState(false);

  useEffect(() => setSearchDraft(search), [search]);

  const listParams = {
    page,
    page_size: pageSize,
    ...(search ? { q: search } : {}),
    ...(roleFilter.success ? { role: roleFilter.data } : {}),
    ...(statusFilter.success ? { status: statusFilter.data } : {}),
  };
  const users = useQuery({
    queryKey: ["idaas", "admin-users", "list", listParams],
    queryFn: ({ signal }) => adminUsersApi.list(listParams, signal),
    enabled: router.isReady && view === "list",
  });
  const detail = useQuery({
    queryKey: ["idaas", "admin-users", "detail", userId],
    queryFn: ({ signal }) => adminUsersApi.getById(userId, signal),
    enabled: router.isReady && view === "detail" && validUserId,
  });
  const user = detail.data;
  const currentRole = user ? userRole(user) : null;
  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      role: userRole(user) ?? "",
    });
    setRequestError("");
  }, [user]);

  function navigate(patch: Record<string, string | null>) {
    const next: Record<string, string> = {};
    for (const key of ["view", "id", "page", "q", "role", "status"]) {
      const value = queryValue(router.query[key]);
      if (value) next[key] = value;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    void router.push({ pathname: PATH_ADMIN.USERS, query: next }, undefined, { shallow: true });
  }

  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUserUpdate }) => adminUsersApi.update(id, input),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(["idaas", "admin-users", "detail", variables.id], result.user);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] }),
      ]);
      setPendingUpdate(null);
      setResultTitle(T.DIALOG.SUCCESS);
      setResultDescription(result.email_verification_started ? T.DIALOG.VERIFICATION_STARTED : T.DIALOG.UPDATE);
      setDialog("result");
    },
    onError: (error) => {
      setDialogError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    },
  });

  const createUser = useMutation({
    mutationFn: (input: AdminUserCreate) => adminUsersApi.create(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      setTemporaryPassword(result.temporary_password);
      setResultTitle(T.DIALOG.SUCCESS);
      setResultDescription(result.email_verification_started ? T.DIALOG.VERIFICATION_STARTED : result.onboarding_email_sent ? T.DIALOG.ONBOARDING_EMAIL_SENT : T.DIALOG.ONBOARDING_EMAIL_NOT_SENT);
      setDialog("result");
      setReturnToListAfterResult(true);
    },
    onError: (error) => {
      setDialogError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    },
  });

  const disableUser = useMutation({
    mutationFn: (id: string) => adminUsersApi.disable(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      setResultTitle(T.DIALOG.SUCCESS);
      setResultDescription(T.DIALOG.DISABLE);
      setDialog("result");
      setReturnToListAfterResult(true);
    },
    onError: (error) => {
      setDialogError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    },
  });

  const reactivateUser = useMutation({
    mutationFn: (id: string) => adminUsersApi.update(id, { status: "ACTIVE" }),
    onSuccess: async (result, id) => {
      queryClient.setQueryData(["idaas", "admin-users", "detail", id], result.user);
      await queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      setResultTitle(T.DIALOG.SUCCESS);
      setResultDescription(T.DIALOG.REACTIVATE);
      setDialog("result");
    },
    onError: (error) => {
      setDialogError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    },
  });

  const reissuePassword = useMutation({
    mutationFn: (id: string) => adminUsersApi.reissueTemporaryPassword(id),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      setTemporaryPassword(result.temporary_password);
      setResultTitle(T.DIALOG.SUCCESS);
      setResultDescription(T.DIALOG.PASSWORD_EXPIRY + ": " + formatDate(result.temporary_password_expires_at));
      setDialog("result");
    },
    onError: (error) => {
      setDialogError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    },
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
    const nextTenantId = form.role === "owner" ? user.tenant_id ?? null : null;
    if (nextTenantId !== (user.tenant_id ?? null)) input.tenant_id = nextTenantId;

    const parsed = AdminUserUpdateSchema.safeParse(input);
    if (!parsed.success) {
      setRequestError(Object.keys(input).length ? T.FORM.INVALID : T.FORM.NO_CHANGE);
      return;
    }
    setRequestError("");
    updateUser.reset();
    setPendingUpdate(parsed.data);
    setDialog("confirm-update");
  }

  function prepareCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = AdminUserCreateSchema.safeParse({
      name: createForm.name,
      email: createForm.email,
      role: createForm.role,
    });
    if (!parsed.success) {
      setRequestError(T.FORM.INVALID);
      return;
    }
    setRequestError("");
    createUser.reset();
    setPendingCreate(parsed.data);
    setDialog("confirm-create");
  }

  function closeDialog() {
    if (createUser.isPending || updateUser.isPending || disableUser.isPending || reactivateUser.isPending || reissuePassword.isPending) return;
    const shouldReturn = returnToListAfterResult;
    setReturnToListAfterResult(false);
    setDialog(null);
    setPendingUpdate(null);
    setPendingCreate(null);
    setTemporaryPassword("");
    if (shouldReturn) navigate({ view: null, id: null });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchDraft.trim().slice(0, 100) || null, page: "1" });
  }

  const total = users.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canEdit = Boolean(user && currentRole);
  const isMutationPending = createUser.isPending || updateUser.isPending || disableUser.isPending || reactivateUser.isPending || reissuePassword.isPending;

  const roleOptions = (Object.keys(roleLabels) as AdminUserRole[]).map((role) => (
    <option key={role} value={role}>{roleLabels[role]}</option>
  ));

  function runConfirmedAction() {
    if (dialog === "confirm-create" && pendingCreate) createUser.mutate(pendingCreate);
    if (dialog === "confirm-update" && pendingUpdate && user) updateUser.mutate({ id: user.id, input: pendingUpdate });
    if (dialog === "confirm-disable" && user) disableUser.mutate(user.id);
    if (dialog === "confirm-reactivate" && user) reactivateUser.mutate(user.id);
    if (dialog === "confirm-reissue" && user) reissuePassword.mutate(user.id);
  }

  return (
    <>
      <div className={`${styles.pageContent} ${styles.accountPageContent}`}>
        <div className={styles.pageHeading}>
          <h1>{view === "detail" ? T.FORM.DETAIL_TITLE : view === "create" ? T.FORM.CREATE_TITLE : T.LIST.TITLE}</h1>
          <p>{view === "detail" ? T.FORM.DETAIL_DESCRIPTION : view === "create" ? T.FORM.CREATE_DESCRIPTION : T.LIST.DESCRIPTION}</p>
        </div>

        {view === "list" ? (
          <section className={styles.panel}>
            <h2>{T.LIST.PANEL}</h2>
            <form className={styles.accountFilters} onSubmit={submitSearch}>
              <input
                aria-label={T.LIST.SEARCH_LABEL}
                maxLength={100}
                placeholder={T.LIST.SEARCH}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
              <select
                aria-label={T.LIST.ROLE_FILTER}
                value={roleFilter.success ? roleFilter.data : ""}
                onChange={(event) => navigate({ role: event.target.value || null, page: "1" })}
              >
                <option value="">{T.COMMON.ALL_ROLES}</option>
                {roleOptions}
              </select>
              <select
                aria-label={T.LIST.STATUS_FILTER}
                value={statusFilter.success ? statusFilter.data : ""}
                onChange={(event) => navigate({ status: event.target.value || null, page: "1" })}
              >
                <option value="">{T.COMMON.ALL_STATUSES}</option>
                <option value="ACTIVE">{T.COMMON.ACTIVE}</option>
                <option value="DISABLED">{T.COMMON.DISABLED}</option>
              </select>
              <button type="submit" className={styles.accountSecondaryButton}>{T.LIST.SEARCH_BUTTON}</button>
            </form>
            {users.isPending ? (
              <p role="status">{T.LIST.LOADING}</p>
            ) : users.isError ? (
              <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
                <p>{getApiErrorMessage(users.error)}</p>
                <button className={styles.accountSecondaryButton} type="button" onClick={() => void users.refetch()}>{T.COMMON.RETRY}</button>
              </div>
            ) : users.data.items.length === 0 ? (
              <p className={styles.emptyText}>{T.LIST.EMPTY}</p>
            ) : (
              <>
                <DataTable
                  variant="accounts"
                  rows={users.data.items}
                  rowKey={(entry) => entry.id}
                  columns={[
                    { key: "name", header: T.FORM.NAME, render: (entry) => <strong>{entry.name}</strong> },
                    { key: "email", header: T.FORM.EMAIL, render: (entry) => entry.email },
                    { key: "role", header: T.FORM.ROLE, render: (entry) => {
                      const role = userRole(entry);
                      return role ? roleLabels[role] : entry.roles.join(", ");
                    } },
                    { key: "tenant", header: T.FORM.TENANT, render: (entry) => {
                      const role = userRole(entry);
                      return entry.tenant_id
                        ? entry.tenant_id
                        : role === "owner" ? T.FORM.TENANT_UNASSIGNED : T.FORM.GLOBAL_SCOPE;
                    } },
                    { key: "status", header: T.FORM.STATUS, render: (entry) => entry.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED },
                    { key: "detail", header: "", render: (entry) => (
                      <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: entry.id })}>
                        {T.LIST.DETAIL}
                      </button>
                    ) },
                  ]}
                />
                <div className={styles.accountPagination}>
                  <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total}</span>
                  <div>
                    <button className={styles.accountSecondaryButton} type="button" disabled={page <= 1 || users.isFetching} onClick={() => navigate({ page: String(page - 1) })}>{T.LIST.PREVIOUS}</button>
                    <span>{T.LIST.PAGE} {page}/{totalPages}</span>
                    <button className={styles.accountSecondaryButton} type="button" disabled={page >= totalPages || users.isFetching} onClick={() => navigate({ page: String(page + 1) })}>{T.LIST.NEXT}</button>
                  </div>
                </div>
              </>
            )}
          </section>
        ) : view === "create" ? (
          <form id="admin-user-create-form" className={styles.panel} onSubmit={prepareCreate}>
            <h2>{T.FORM.CREATE_TITLE}</h2>
            <div className={styles.accountFormGrid}>
              <label>
                {T.FORM.NAME}
                <input value={createForm.name} maxLength={50} required onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                {T.FORM.EMAIL}
                <input type="email" value={createForm.email} maxLength={255} required onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label>
                {T.FORM.ROLE}
                <select required value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value as AdminUserRole | "" }))}>
                  <option value="">{T.FORM.SELECT_ROLE}</option>
                  {roleOptions}
                </select>
              </label>
            </div>
            {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
          </form>
        ) : !validUserId ? (
          <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">{T.FORM.INVALID_ID}</div>
        ) : detail.isPending ? (
          <section className={styles.panel} role="status">{T.FORM.DETAIL_LOADING}</section>
        ) : detail.isError ? (
          <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
            <p>{getApiErrorMessage(detail.error)}</p>
            <button className={styles.accountSecondaryButton} type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button>
          </div>
        ) : user ? (
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
              <div><span>{T.FORM.CREATED}</span><strong>{formatDate(user.created_at)}</strong></div>
              <div><span>{T.FORM.UPDATED}</span><strong>{formatDate(user.updated_at)}</strong></div>
            </div>
            {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
            {updateUser.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(updateUser.error, "mutation")}</p>}
          </form>
        ) : null}
      </div>

      <ActionBar>
        {view === "detail" ? (
          <>
            <ButtonBar type="submit" form="admin-user-edit-form" disabled={!canEdit || detail.isPending || updateUser.isPending}>{T.FORM.SAVE}</ButtonBar>
            {user?.status === "ACTIVE" ? (
              <ButtonBar type="button" disabled={!user || isMutationPending} onClick={() => { setDialogError(""); setDialog("confirm-disable"); }}>{T.FORM.DISABLE}</ButtonBar>
            ) : (
              <ButtonBar type="button" disabled={!user || isMutationPending} onClick={() => { setDialogError(""); setDialog("confirm-reactivate"); }}>{T.FORM.REACTIVATE}</ButtonBar>
            )}
            <ButtonBar type="button" disabled={!user || user.status !== "ACTIVE" || isMutationPending} onClick={() => { setDialogError(""); setDialog("confirm-reissue"); }}>{T.FORM.REISSUE}</ButtonBar>
            <ButtonBar type="button" onClick={() => navigate({ view: null, id: null })}>{T.FORM.BACK}</ButtonBar>
          </>
        ) : view === "create" ? (
          <>
            <ButtonBar type="submit" form="admin-user-create-form" disabled={createUser.isPending}>{T.LIST.CREATE}</ButtonBar>
            <ButtonBar type="button" disabled={createUser.isPending} onClick={() => navigate({ view: null, id: null })}>{T.FORM.BACK}</ButtonBar>
          </>
        ) : (
          <>
            <ButtonBar type="button" onClick={() => { setRequestError(""); setCreateForm({ name: "", email: "", role: "" }); navigate({ view: "create", id: null }); }}>{T.LIST.CREATE}</ButtonBar>
            <ButtonBar type="button" disabled={users.isFetching} onClick={() => void users.refetch()}>{T.COMMON.RETRY}</ButtonBar>
          </>
        )}
      </ActionBar>

      {dialog?.startsWith("confirm-") && (
        <NotificationDialog
          variant="confirm"
          title={T.DIALOG.CONFIRM}
          description={dialog === "confirm-create" ? T.DIALOG.CREATE : dialog === "confirm-update" ? T.DIALOG.UPDATE : dialog === "confirm-disable" ? T.DIALOG.DISABLE : dialog === "confirm-reactivate" ? T.DIALOG.REACTIVATE : T.DIALOG.REISSUE}
          primaryAction={{
            label: T.DIALOG.PROCEED,
            pending: isMutationPending,
            pendingLabel: "Đang lưu…",
            onClick: runConfirmedAction,
          }}
          secondaryAction={{ label: T.DIALOG.RETURN, disabled: isMutationPending, onClick: closeDialog }}
          onClose={closeDialog}
          closeOnEscape={!isMutationPending}
        >
          <p>
            {pendingUpdate?.name ? `${T.FORM.NAME}: ${pendingUpdate.name}. ` : ""}
            {pendingUpdate?.email ? `${T.FORM.EMAIL}: ${pendingUpdate.email}. ` : ""}
            {pendingUpdate?.role ? `${T.FORM.ROLE}: ${roleLabels[pendingUpdate.role]}. ` : ""}
          </p>
          {dialog === "confirm-create" && pendingCreate && <p>{pendingCreate.name} / {pendingCreate.email} / {roleLabels[pendingCreate.role]}</p>}
        </NotificationDialog>
      )}
      {dialog === "result" && (
        <NotificationDialog
          variant="success"
          title={resultTitle}
          description={resultDescription}
          primaryAction={{ label: T.DIALOG.CLOSE, onClick: closeDialog }}
          onClose={closeDialog}
        >
          {temporaryPassword && <p><strong>{T.DIALOG.PASSWORD_ONCE}</strong><br /><code>{temporaryPassword}</code></p>}
        </NotificationDialog>
      )}
      {dialog === "error" && (
        <NotificationDialog
          variant="error"
          title="Không lưu được thay đổi"
          description={dialogError}
          primaryAction={{ label: T.DIALOG.CLOSE, onClick: closeDialog }}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

export default function AdminUsersPage() {
  return <AdminShell><AdminUsersContent /></AdminShell>;
}
