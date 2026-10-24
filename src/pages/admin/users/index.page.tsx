import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { API_ERROR_MESSAGES, getApiErrorMessage } from "@/lib/api-errors";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { tenantsApi } from "@/apis/tenants.api";
import { PATH_ADMIN } from "@/routes/path";
import {
  AdminUserCreateSchema,
  AdminUserIdSchema,
  AdminUserRoleSchema,
  AdminUserStatusSchema,
  AdminUserUpdateSchema,
  type AdminUser,
  type AdminUserCreate,
  type AdminUserRole,
  type AdminUserUpdate,
} from "@/schema/admin-users.schema";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

type View = "list" | "create" | "detail";
type FormState = { name: string; email: string; role: AdminUserRole | ""; tenantId: string };
type Action =
  | { kind: "create"; input: AdminUserCreate }
  | { kind: "update"; userId: string; input: AdminUserUpdate }
  | { kind: "disable" | "reactivate" | "reissue"; userId: string };
type Credential = { password: string; expiresAt: string; emailVerificationStarted?: boolean };

const emptyForm: FormState = { name: "", email: "", role: "", tenantId: "" };
const roleLabels: Record<AdminUserRole, string> = {
  owner: T.COMMON.OWNER,
  moderator: T.COMMON.MODERATOR,
  technician: T.COMMON.TECHNICIAN,
};

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function positiveNumber(raw: string, fallback: number): number {
  const number = Number(raw);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function supportedRole(user: AdminUser): AdminUserRole | null {
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

function actionDescription(action: Action): string {
  return T.DIALOG[action.kind.toUpperCase() as Uppercase<Action["kind"]>];
}

function ActionDialog({
  kind,
  action,
  busy,
  error,
  credential,
  onConfirm,
  onClose,
}: {
  kind: "confirm" | "success" | "error";
  action: Action | null;
  busy: boolean;
  error: string;
  credential: Credential | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [kind]);

  return (
    <div className={styles.accountDialogBackdrop}>
      <div
        className={styles.accountDialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
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
        <h2 id="account-dialog-title">
          {kind === "confirm" ? T.DIALOG.CONFIRM : kind === "success" ? T.DIALOG.SUCCESS : API_ERROR_MESSAGES.GENERIC}
        </h2>
        {kind === "confirm" && action && <p>{actionDescription(action)}</p>}
        {kind === "error" && <p role="alert">{error}</p>}
        {kind === "success" && credential && (
          <div className={styles.accountCredential}>
            <strong>{T.DIALOG.PASSWORD_ONCE}</strong>
            <code>{credential.password}</code>
            <p>{T.DIALOG.PASSWORD_EXPIRY}: {formatDate(credential.expiresAt)}</p>
            {credential.emailVerificationStarted !== undefined && (
              <p>{credential.emailVerificationStarted
                ? T.DIALOG.VERIFICATION_STARTED
                : T.DIALOG.VERIFICATION_NOT_STARTED}</p>
            )}
          </div>
        )}
        <div className={styles.accountDialogActions}>
          {kind === "confirm" && (
            <button type="button" className={styles.accountPrimaryButton} disabled={busy} onClick={onConfirm}>
              {busy ? "Đang xử lý…" : T.DIALOG.PROCEED}
            </button>
          )}
          <button type="button" className={styles.accountSecondaryButton} disabled={busy} onClick={onClose}>
            {kind === "confirm" ? T.DIALOG.RETURN : T.DIALOG.CLOSE}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminUsersContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const view = (["create", "detail"] as const).includes(param(router.query.view) as "create" | "detail")
    ? param(router.query.view) as View
    : "list";
  const accountId = param(router.query.account);
  const validId = AdminUserIdSchema.safeParse(accountId).success;
  const page = positiveNumber(param(router.query.page), 1);
  const pageSizeRaw = positiveNumber(param(router.query.page_size), 20);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const search = param(router.query.q).trim().slice(0, 100);
  const role = AdminUserRoleSchema.safeParse(param(router.query.role));
  const status = AdminUserStatusSchema.safeParse(param(router.query.status));
  const [searchDraft, setSearchDraft] = useState(search);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dialog, setDialog] = useState<"confirm" | "success" | "error" | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);

  useEffect(() => { setSearchDraft(search); }, [search]);

  const listParams = {
    page,
    page_size: pageSize,
    ...(search ? { q: search } : {}),
    ...(role.success ? { role: role.data } : {}),
    ...(status.success ? { status: status.data } : {}),
  };
  const listQuery = useQuery({
    queryKey: ["idaas", "admin-users", "list", listParams],
    queryFn: ({ signal }) => adminUsersApi.list(listParams, signal),
    enabled: router.isReady && view === "list",
  });
  const detailQuery = useQuery({
    queryKey: ["idaas", "admin-users", "detail", accountId],
    queryFn: ({ signal }) => adminUsersApi.getById(accountId, signal),
    enabled: router.isReady && view === "detail" && validId,
  });
  const user = detailQuery.data;
  const currentRole = user ? supportedRole(user) : null;
  const tenantsQuery = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    enabled: router.isReady && (view === "list" || (view === "detail" && form.role === "owner")),
    staleTime: 60_000,
  });
  const tenants = tenantsQuery.data ?? [];
  const tenantNames = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      email: user.email,
      role: supportedRole(user) ?? "",
      tenantId: user.tenant_id ?? "",
    });
  }, [user]);

  const changeRoute = useCallback((patch: Record<string, string | null>) => {
    const next: Record<string, string> = {};
    for (const key of ["view", "account", "page", "page_size", "q", "role", "status"]) {
      const value = param(router.query[key]);
      if (value) next[key] = value;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    void router.push({ pathname: PATH_ADMIN.USERS, query: next }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    if (view !== "list" || !listQuery.data) return;
    const lastPage = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > lastPage) {
      changeRoute({ page: String(lastPage) });
    }
  }, [view, listQuery.data, page, pageSize, changeRoute]);

  function openCreate() {
    setForm(emptyForm);
    setRequestError("");
    setCredential(null);
    changeRoute({ view: "create", account: null });
  }

  function openDetail(userId: string) {
    setRequestError("");
    setCredential(null);
    changeRoute({ view: "detail", account: userId });
  }

  function backToList() {
    setCredential(null);
    setDialog(null);
    changeRoute({ view: null, account: null });
  }

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "role" && value !== "owner" ? { tenantId: "" } : {}),
    }));
  }

  function prepareCreate() {
    const parsed = AdminUserCreateSchema.safeParse({
      name: form.name,
      email: form.email,
      role: form.role,
    });
    if (!parsed.success) {
      setRequestError(T.FORM.INVALID);
      return;
    }
    setRequestError("");
    setAction({ kind: "create", input: parsed.data });
    setDialog("confirm");
  }

  function prepareUpdate() {
    if (!user || !currentRole) return;
    if (form.role === "owner" && !form.tenantId && currentRole !== "owner") {
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
    setAction({ kind: "update", userId: user.id, input: parsed.data });
    setDialog("confirm");
  }

  function prepareAccountAction(kind: "disable" | "reactivate" | "reissue") {
    if (!user || !currentRole) return;
    setRequestError("");
    setAction({ kind, userId: user.id });
    setDialog("confirm");
  }

  async function confirmAction() {
    if (!action || busy) return;
    setBusy(true);
    setRequestError("");
    try {
      if (action.kind === "create") {
        const result = await adminUsersApi.create(action.input);
        setCredential({
          password: result.temporary_password,
          expiresAt: result.temporary_password_expires_at,
          emailVerificationStarted: result.email_verification_started,
        });
      } else if (action.kind === "update") {
        await adminUsersApi.update(action.userId, action.input);
      } else if (action.kind === "disable") {
        await adminUsersApi.disable(action.userId);
      } else if (action.kind === "reactivate") {
        await adminUsersApi.update(action.userId, { status: "ACTIVE" });
      } else {
        const result = await adminUsersApi.reissueTemporaryPassword(action.userId);
        setCredential({ password: result.temporary_password, expiresAt: result.temporary_password_expires_at });
      }
      await queryClient.invalidateQueries({ queryKey: ["idaas", "admin-users"] });
      setDialog("success");
    } catch (error) {
      setCredential(null);
      setRequestError(getApiErrorMessage(error, "mutation"));
      setDialog("error");
    } finally {
      setBusy(false);
    }
  }

  function closeDialog() {
    const completed = dialog === "success";
    const stay = action?.kind === "reissue";
    setDialog(null);
    setAction(null);
    setCredential(null);
    if (completed && !stay) backToList();
  }

  function searchUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changeRoute({ q: searchDraft.trim().slice(0, 100) || null, page: "1" });
  }

  const roleOptions = (
    <>
      <option value="">{T.COMMON.ALL_ROLES}</option>
      {(Object.keys(roleLabels) as AdminUserRole[]).map((value) => (
        <option key={value} value={value}>{roleLabels[value]}</option>
      ))}
    </>
  );
  const tenantOptions = (
    <>
      <option value="">{T.FORM.TENANT_PLACEHOLDER}</option>
      {form.tenantId && !tenantNames.has(form.tenantId) && (
        <option value={form.tenantId}>{form.tenantId}</option>
      )}
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.id}</option>
      ))}
    </>
  );
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canManage = Boolean(user && currentRole);

  let title: string = T.LIST.TITLE;
  let description: string = T.LIST.DESCRIPTION;
  let content;
  let actions;

  if (view === "list") {
    actions = (
      <ButtonBar type="button" onClick={openCreate}>
        {T.LIST.CREATE}
      </ButtonBar>
    );
    content = (
      <section className={styles.panel}>
        <h2>{T.LIST.PANEL}</h2>
        <form className={styles.accountFilters} onSubmit={searchUsers}>
          <input aria-label={T.LIST.SEARCH_LABEL} maxLength={100} placeholder={T.LIST.SEARCH}
            value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
          <select aria-label={T.LIST.ROLE_FILTER} value={role.success ? role.data : ""}
            onChange={(event) => changeRoute({ role: event.target.value || null, page: "1" })}>
            {roleOptions}
          </select>
          <select aria-label={T.LIST.STATUS_FILTER} value={status.success ? status.data : ""}
            onChange={(event) => changeRoute({ status: event.target.value || null, page: "1" })}>
            <option value="">{T.COMMON.ALL_STATUSES}</option>
            <option value="ACTIVE">{T.COMMON.ACTIVE}</option>
            <option value="DISABLED">{T.COMMON.DISABLED}</option>
          </select>
          <button type="submit" className={styles.accountSecondaryButton}>{T.LIST.SEARCH_BUTTON}</button>
        </form>
        {tenantsQuery.isError && <p className={styles.accountInlineWarning}>{T.LIST.TENANT_ERROR} {getApiErrorMessage(tenantsQuery.error)}</p>}
        {!router.isReady || listQuery.isPending ? (
          <p role="status">{T.LIST.LOADING}</p>
        ) : listQuery.isError ? (
          <div className={styles.errorNotice} role="alert">
            <p>{listQuery.error && getApiErrorMessage(listQuery.error)}</p>
            <button className={styles.accountSecondaryButton} type="button" onClick={() => void listQuery.refetch()}>
              {T.COMMON.RETRY}
            </button>
          </div>
        ) : listQuery.data.items.length === 0 ? (
          <p>{T.LIST.EMPTY}</p>
        ) : (
          <>
            <DataTable
              variant="accounts"
              rows={listQuery.data.items}
              rowKey={(entry) => entry.id}
              columns={[
                { key: "name", header: T.FORM.NAME, render: (entry) => <strong>{entry.name}</strong> },
                { key: "email", header: "Email", render: (entry) => entry.email },
                { key: "role", header: T.FORM.ROLE, render: (entry) => {
                  const role = supportedRole(entry);
                  return role ? roleLabels[role] : entry.roles.join(", ");
                } },
                { key: "tenant", header: "Phạm vi tenant", render: (entry) => {
                  const role = supportedRole(entry);
                  return entry.tenant_id
                    ? tenantNames.get(entry.tenant_id) ?? entry.tenant_id
                    : role === "owner" ? T.FORM.TENANT_UNASSIGNED : T.FORM.GLOBAL_SCOPE;
                } },
                { key: "status", header: T.FORM.STATUS, render: (entry) => entry.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED },
                { key: "actions", header: "", render: (entry) => <button className={styles.accountTextButton} type="button" onClick={() => openDetail(entry.id)}>{T.LIST.DETAIL}</button> },
              ]}
            />
            <div className={styles.accountPagination}>
              <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} / {total} tài khoản</span>
              <div>
                <label>{T.LIST.PAGE_SIZE} <select aria-label={T.LIST.PAGE_SIZE} value={pageSize}
                  onChange={(event) => changeRoute({ page_size: event.target.value, page: "1" })}>
                  {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                </select></label>
                <button className={styles.accountSecondaryButton} type="button" disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => changeRoute({ page: String(page - 1) })}>{T.LIST.PREVIOUS}</button>
                <span>{T.LIST.PAGE} {page} / {totalPages}</span>
                <button className={styles.accountSecondaryButton} type="button" disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => changeRoute({ page: String(page + 1) })}>{T.LIST.NEXT}</button>
              </div>
            </div>
          </>
        )}
      </section>
    );
  } else if (view === "create") {
    title = T.FORM.CREATE_TITLE;
    description = T.FORM.CREATE_DESCRIPTION;
    actions = <>
      <ButtonBar type="button" onClick={prepareCreate}>{T.LIST.CREATE}</ButtonBar>
      <ButtonBar type="button" onClick={backToList}>{T.FORM.CANCEL}</ButtonBar>
    </>;
    content = <section className={styles.panel}>
      <h2>{T.FORM.DETAIL_TITLE}</h2>
      <div className={styles.accountFormGrid}>
        <label>{T.FORM.NAME}<input value={form.name} maxLength={50} onChange={(event) => updateField("name", event.target.value)} /></label>
        <label>{T.FORM.EMAIL}<input type="email" value={form.email} maxLength={255} onChange={(event) => updateField("email", event.target.value)} /></label>
        <label>{T.FORM.ROLE}<select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
          <option value="">{T.FORM.SELECT_ROLE}</option>
          {(Object.keys(roleLabels) as AdminUserRole[]).map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}
        </select></label>
      </div>
      {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
    </section>;
  } else {
    title = T.FORM.DETAIL_TITLE;
    description = T.FORM.DETAIL_DESCRIPTION;
    actions = <>
      <ButtonBar type="button" disabled={!canManage || busy || detailQuery.isPending}
        onClick={prepareUpdate}>{T.FORM.SAVE}</ButtonBar>
      {user?.status === "ACTIVE" ? (
        <ButtonBar type="button" disabled={!canManage || busy}
          onClick={() => prepareAccountAction("disable")}>{T.FORM.DISABLE}</ButtonBar>
      ) : user?.status === "DISABLED" ? (
        <ButtonBar type="button" disabled={!canManage || busy}
          onClick={() => prepareAccountAction("reactivate")}>{T.FORM.REACTIVATE}</ButtonBar>
      ) : null}
      <ButtonBar type="button" disabled={!canManage || user?.status !== "ACTIVE" || busy}
        onClick={() => prepareAccountAction("reissue")}>{T.FORM.REISSUE}</ButtonBar>
      <ButtonBar type="button" onClick={backToList}>{T.FORM.BACK}</ButtonBar>
    </>;
    content = !validId ? (
      <div className={styles.errorNotice} role="alert">{T.FORM.INVALID_ID}</div>
    ) : detailQuery.isPending ? (
      <section className={styles.panel} role="status">{T.FORM.DETAIL_LOADING}</section>
    ) : detailQuery.isError ? (
      <div className={styles.errorNotice} role="alert">
        <p>{getApiErrorMessage(detailQuery.error)}</p>
        <button className={styles.accountSecondaryButton} type="button" onClick={() => void detailQuery.refetch()}>{T.COMMON.RETRY}</button>
      </div>
    ) : user ? (
      <>
        {!currentRole && <div className={styles.errorNotice}>{T.FORM.UNSUPPORTED_ROLE}</div>}
        <section className={styles.panel}>
          <h2>{T.FORM.DETAIL_TITLE}</h2>
          <div className={styles.accountFormGrid}>
            <label>{T.FORM.NAME}<input value={form.name} maxLength={50} disabled={!canManage} onChange={(event) => updateField("name", event.target.value)} /></label>
            <label>{T.FORM.EMAIL}<input type="email" value={form.email} maxLength={255} disabled={!canManage} onChange={(event) => updateField("email", event.target.value)} /></label>
            <label>{T.FORM.ROLE}<select value={form.role} disabled={!canManage} onChange={(event) => updateField("role", event.target.value)}>{roleOptions}</select></label>
            {form.role === "owner" && <label>{T.FORM.TENANT}<select value={form.tenantId}
              disabled={!canManage || tenantsQuery.isPending || tenantsQuery.isError || tenants.length === 0}
              onChange={(event) => updateField("tenantId", event.target.value)}>{tenantOptions}</select></label>}
            <div><span>{T.FORM.STATUS}</span><strong>{user.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED}</strong></div>
            <div><span>{T.FORM.VERIFIED}</span><strong>{user.email_verified ? T.FORM.YES : T.FORM.NO}</strong></div>
            <div><span>{T.FORM.CREATED}</span><strong>{formatDate(user.created_at)}</strong></div>
            <div><span>{T.FORM.UPDATED}</span><strong>{formatDate(user.updated_at)}</strong></div>
          </div>
          {tenantsQuery.isError && form.role === "owner" && <p className={styles.accountInlineWarning}>{T.FORM.TENANT_UNAVAILABLE} {getApiErrorMessage(tenantsQuery.error)}</p>}
          {requestError && <p className={styles.accountInlineWarning} role="alert">{requestError}</p>}
        </section>
      </>
    ) : null;
  }

  return (
    <>
      <div className={`${styles.pageContent} ${styles.accountPageContent}`}>
        <div className={styles.pageHeading}>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {content}
      </div>
      <AdminActionBar>{actions}</AdminActionBar>
      {dialog && <ActionDialog kind={dialog} action={action} busy={busy} error={requestError}
        credential={credential} onConfirm={() => void confirmAction()} onClose={closeDialog} />}
    </>
  );
}

export default function AdminUsersPage() {
  return <AdminShell><AdminUsersContent /></AdminShell>;
}
