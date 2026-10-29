import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { tenantsApi } from "@/apis/tenants.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  AdminUserIdSchema,
  AdminUserRoleSchema,
  AdminUserStatusSchema,
  AdminUserUpdateSchema,
  type AdminUser,
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
  tenantId: string;
};

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
  const view = queryValue(router.query.view) === "detail" ? "detail" : "list";
  const userId = queryValue(router.query.id);
  const validUserId = AdminUserIdSchema.safeParse(userId).success;
  const page = positiveNumber(queryValue(router.query.page), 1);
  const pageSize = 20;
  const search = queryValue(router.query.q).trim().slice(0, 100);
  const roleFilter = AdminUserRoleSchema.safeParse(queryValue(router.query.role));
  const statusFilter = AdminUserStatusSchema.safeParse(queryValue(router.query.status));
  const [searchDraft, setSearchDraft] = useState(search);
  const [form, setForm] = useState<UserForm>({ name: "", email: "", role: "", tenantId: "" });
  const [requestError, setRequestError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<AdminUserUpdate | null>(null);
  const [dialog, setDialog] = useState<"confirm" | "success" | "error" | null>(null);

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
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    enabled: router.isReady && (view === "list" || (view === "detail" && form.role === "owner")),
    staleTime: 60_000,
  });
  const tenantNames = useMemo(
    () => new Map((tenants.data ?? []).map((tenant) => [tenant.id, tenant.name] as const)),
    [tenants.data],
  );

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      role: userRole(user) ?? "",
      tenantId: user.tenant_id ?? "",
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

    if (form.role === "owner" && currentRole !== "owner" && !form.tenantId) {
      setRequestError(T.FORM.TENANT_REQUIRED);
      return;
    }

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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchDraft.trim().slice(0, 100) || null, page: "1" });
  }

  const total = users.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canEdit = Boolean(user && currentRole);

  const roleOptions = (Object.keys(roleLabels) as AdminUserRole[]).map((role) => (
    <option key={role} value={role}>{roleLabels[role]}</option>
  ));

  const tenantOptions = (
    <>
      <option value="">{T.FORM.TENANT_PLACEHOLDER}</option>
      {form.tenantId && !tenantNames.has(form.tenantId) && (
        <option value={form.tenantId}>{form.tenantId}</option>
      )}
      {(tenants.data ?? []).map((tenant) => (
        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
      ))}
    </>
  );

  return (
    <>
      <div className={`${styles.pageContent} ${styles.accountPageContent}`}>
        <div className={styles.pageHeading}>
          <h1>{view === "detail" ? T.FORM.DETAIL_TITLE : T.LIST.TITLE}</h1>
          <p>{view === "detail" ? T.FORM.DETAIL_DESCRIPTION : T.LIST.DESCRIPTION}</p>
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
            {tenants.isError && <p className={styles.accountInlineWarning}>{T.LIST.TENANT_ERROR} {getApiErrorMessage(tenants.error)}</p>}
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
                        ? tenantNames.get(entry.tenant_id) ?? entry.tenant_id
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
              {form.role === "owner" && (
                <label>
                  {T.FORM.TENANT}
                  <select
                    value={form.tenantId}
                    disabled={!canEdit || tenants.isPending || tenants.isError || !tenants.data?.length}
                    onChange={(event) => updateField("tenantId", event.target.value)}
                  >
                    {tenantOptions}
                  </select>
                </label>
              )}
              <div><span>{T.FORM.STATUS}</span><strong>{user.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED}</strong></div>
              <div><span>{T.FORM.VERIFIED}</span><strong>{user.email_verified ? T.FORM.YES : T.FORM.NO}</strong></div>
              <div><span>{T.FORM.CREATED}</span><strong>{formatDate(user.created_at)}</strong></div>
              <div><span>{T.FORM.UPDATED}</span><strong>{formatDate(user.updated_at)}</strong></div>
            </div>
            {tenants.isError && form.role === "owner" && <p className={styles.accountInlineWarning}>{T.FORM.TENANT_UNAVAILABLE} {getApiErrorMessage(tenants.error)}</p>}
            {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
            {updateUser.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(updateUser.error, "mutation")}</p>}
          </form>
        ) : null}
      </div>

      <ActionBar>
        {view === "detail" ? (
          <>
            <ButtonBar type="submit" form="admin-user-edit-form" disabled={!canEdit || detail.isPending || updateUser.isPending}>{T.FORM.SAVE}</ButtonBar>
            <ButtonBar type="button" onClick={() => navigate({ view: null, id: null })}>{T.FORM.BACK}</ButtonBar>
          </>
        ) : (
          <ButtonBar type="button" disabled={users.isFetching} onClick={() => void users.refetch()}>{T.COMMON.RETRY}</ButtonBar>
        )}
      </ActionBar>

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
            {pendingUpdate.role ? `${T.FORM.ROLE}: ${roleLabels[pendingUpdate.role]}. ` : ""}
            {pendingUpdate.tenant_id !== undefined ? `${T.FORM.TENANT}: ${pendingUpdate.tenant_id ? tenantNames.get(pendingUpdate.tenant_id) ?? pendingUpdate.tenant_id : T.FORM.TENANT_UNASSIGNED}.` : ""}
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

export default function AdminUsersPage() {
  return <AdminShell><AdminUsersContent /></AdminShell>;
}
