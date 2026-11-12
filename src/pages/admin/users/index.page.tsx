import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { adminUsersApi } from "@/apis/admin-users.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { AdminUserCreateView } from "@/components/features/admin-users/admin-user-create-view";
import { AdminUserDetailView } from "@/components/features/admin-users/admin-user-detail-view";
import { ADMIN_USER_ROLE_LABELS, getAdminUserRole } from "@/components/features/admin-users/admin-user-utils";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  AdminUserRoleSchema,
  AdminUserStatusSchema,
} from "@/schema/admin-users.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

function queryValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function positiveNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function userDetailHref(userId: string, query: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const key of ["page", "q", "role", "status"]) {
    const value = queryValue(query[key]);
    if (value) params.set(key, value);
  }
  const queryString = params.toString();
  return `${PATH_ADMIN.USER_DETAIL(userId)}${queryString ? `?${queryString}` : ""}`;
}

function AdminUsersContent({ detailUserId }: { detailUserId?: string }) {
  const router = useRouter();
  const queryView = queryValue(router.query.view);
  const view = detailUserId || queryView === "detail" ? "detail" : queryView === "create" ? "create" : "list";
  const userId = detailUserId ?? queryValue(router.query.id);
  const page = positiveNumber(queryValue(router.query.page), 1);
  const contractPage = positiveNumber(queryValue(router.query.contractPage), 1) - 1;
  const pageSize = 10;
  const search = queryValue(router.query.q).trim().slice(0, 100);
  const roleFilter = AdminUserRoleSchema.safeParse(queryValue(router.query.role));
  const statusFilter = AdminUserStatusSchema.safeParse(queryValue(router.query.status));
  const [searchDraft, setSearchDraft] = useState(search);

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

  function navigate(patch: Record<string, string | null>) {
    const next: Record<string, string> = {};
    for (const key of ["view", "id", "page", "q", "role", "status", "contractPage"]) {
      const value = queryValue(router.query[key]);
      if (value) next[key] = value;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value) next[key] = value;
      else delete next[key];
    }
    void router.push({ pathname: detailUserId && patch.view !== null ? PATH_ADMIN.USER_DETAIL(detailUserId) : PATH_ADMIN.USERS, query: next }, undefined, { shallow: true });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate({ q: searchDraft.trim().slice(0, 100) || null, page: "1" });
  }

  const total = users.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className={`${styles.pageContent} ${styles.accountPageContent} ${styles.userPage}`}>
        <div className={`${styles.pageHeading} ${styles.userPageHeading}`}>
          <div>
          <h1>{view === "detail" ? T.FORM.DETAIL_TITLE : view === "create" ? T.FORM.CREATE_TITLE : T.LIST.TITLE}</h1>
          {view === "list" && <p>Tra cứu tài khoản và quản lý quyền truy cập.</p>}
          {view === "create" && <p>{T.FORM.CREATE_DESCRIPTION}</p>}
          </div>
          {view === "list" && <ButtonBar variant="primary" onClick={() => navigate({ view: "create", id: null, contractPage: null })}>{T.LIST.CREATE}</ButtonBar>}
        </div>

        {view === "list" ? (
          <section className={`${styles.panel} ${styles.userListPanel}`}>
            <div className={styles.userSectionHeading}><h2>{T.LIST.PANEL}</h2>{users.data && <span>{users.data.total.toLocaleString("vi-VN")} {search || roleFilter.success || statusFilter.success ? "kết quả" : "tài khoản"}</span>}</div>
            <TableFilters
              search={{
                ariaLabel: T.LIST.SEARCH_LABEL,
                maxLength: 100,
                placeholder: T.LIST.SEARCH,
                value: searchDraft,
                onChange: setSearchDraft,
              }}
              selects={[
                {
                  id: "role",
                  ariaLabel: T.LIST.ROLE_FILTER,
                  value: roleFilter.success ? roleFilter.data : "",
                  options: [
                    { value: "", label: T.COMMON.ALL_ROLES },
                    ...Object.entries(ADMIN_USER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
                  ],
                  onChange: (value) => navigate({ role: value || null, page: "1" }),
                },
                {
                  id: "status",
                  ariaLabel: T.LIST.STATUS_FILTER,
                  value: statusFilter.success ? statusFilter.data : "",
                  options: [
                    { value: "", label: T.COMMON.ALL_STATUSES },
                    { value: "ACTIVE", label: T.COMMON.ACTIVE },
                    { value: "DISABLED", label: T.COMMON.DISABLED },
                  ],
                  onChange: (value) => navigate({ status: value || null, page: "1" }),
                },
              ]}
              submitLabel={T.LIST.SEARCH_BUTTON}
              onSubmit={submitSearch}
            />
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
                    { key: "name", header: "Tài khoản", render: (entry) => (
                      <div className={styles.userIdentityCell}><span className={styles.userAvatar} aria-hidden="true">{entry.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "?"}</span><div><strong>{entry.name || "Chưa có họ tên"}</strong><span>{entry.email}</span></div></div>
                    ) },
                    { key: "role", header: T.FORM.ROLE, render: (entry) => {
                      const role = getAdminUserRole(entry);
                      return role ? ADMIN_USER_ROLE_LABELS[role] : entry.roles.join(", ");
                    } },
                    { key: "status", header: T.FORM.STATUS, render: (entry) => (
                      <span className={styles.userStatus} data-status={entry.status}>{entry.status === "ACTIVE" ? T.COMMON.ACTIVE : T.COMMON.DISABLED}</span>
                    ) },
                    { key: "action", header: "", render: (entry) => <ButtonBar rollingLabel href={userDetailHref(entry.id, router.query)} aria-label={`Mở hồ sơ ${entry.name || entry.email}`}>Mở hồ sơ</ButtonBar> },
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
          <AdminUserCreateView />
        ) : (
          <AdminUserDetailView userId={userId} contractPage={contractPage} onNavigate={navigate} />
        )}
      </div>

    </>
  );
}

export default function AdminUsersPage({ detailUserId }: { detailUserId?: string }) {
  return <AdminShell><AdminUsersContent detailUserId={detailUserId} /></AdminShell>;
}
