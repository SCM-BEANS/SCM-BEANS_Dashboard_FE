import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { PATH_ADMIN } from "@/routes/path";
import { getApiErrorMessage } from "@/lib/api-errors";
import { adminUsersApi } from "@/apis/admin-users.api";
import { profilesApi } from "@/apis/profiles.api";
import { AdminUserIdSchema } from "@/schema/admin-users.schema";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { DataTable } from "@/components/table/data-table";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getBusinessesBackDestination } from "../admin-back-destination";

function queryValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}

function BusinessesContent() {
  const router = useRouter();
  const [searchText, setSearchText] = useState(queryValue(router.query.q));
  const view = queryValue(router.query.view);
  const ownerId = queryValue(router.query.id);
  const validOwnerId = AdminUserIdSchema.safeParse(ownerId).success;
  const page = Math.max(1, Number(queryValue(router.query.page)) || 1);
  const requestedStatus = queryValue(router.query.status);
  const status = requestedStatus === "ACTIVE" || requestedStatus === "DISABLED" ? requestedStatus : "";
  const contractPage = Math.max(0, Number(queryValue(router.query.contractPage)) || 0);
  useEffect(() => setSearchText(queryValue(router.query.q)), [router.query.q]);
  const list = useQuery({
    queryKey: ["idaas", "admin-users", "businesses", queryValue(router.query.q), status, page],
    queryFn: ({ signal }) => adminUsersApi.list({
      role: "owner",
      q: queryValue(router.query.q).trim().slice(0, 100) || undefined,
      status: status || undefined,
      page,
      page_size: 20,
    }, signal),
    enabled: router.isReady && view !== "detail",
  });
  const detail = useQuery({
    queryKey: ["idaas", "admin-users", "owner", ownerId],
    queryFn: ({ signal }) => adminUsersApi.getById(ownerId, signal),
    enabled: router.isReady && view === "detail" && validOwnerId,
  });
  const ownerContracts = useQuery({
    queryKey: ["dolores", "profiles", "owner-contracts", ownerId, contractPage],
    queryFn: ({ signal }) => profilesApi.getContracts(ownerId, contractPage, 20, signal),
    enabled: view === "detail" && Boolean(detail.data),
  });
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.page_size)) : 1;

  const navigate = (params: Record<string, string | number | undefined>) => {
    const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
    void router.push({ pathname: "/admin/businesses", query }, undefined, { shallow: true });
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate({ q: searchText.trim().slice(0, 100), status, page: 1 });
  };

  return (
    <>
    <div className={styles.pageContent}>
      <BackButtonHeading
        title={view === "detail" ? detail.data?.name ?? T.BUSINESSES.DETAIL : T.BUSINESSES.TITLE}
        titleId="admin-businesses-title"
        description={T.BUSINESSES.DESCRIPTION}
        className={styles.pageHeading}
        back={getBusinessesBackDestination(router.query)}
      />
      {view === "detail" ? (
        <>
          {!validOwnerId && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã tài khoản không hợp lệ.</div>}
          {validOwnerId && detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
          {validOwnerId && detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
          {detail.data && <>
            <section className={styles.panel}>
              <h2>{T.BUSINESSES.DETAIL}</h2>
              <div className={styles.operationsGrid}>
                <div><span>{T.COMMON.NAME}</span><strong>{detail.data.name || "—"}</strong></div>
                <div><span>{T.COMMON.EMAIL}</span><strong>{detail.data.email || "—"}</strong></div>
                <div><span>{T.COMMON.OWNER_ID}</span><strong title={detail.data.id}>{detail.data.id}</strong></div>
                <div><span>{T.BUSINESSES.STATUS}</span><strong>{detail.data.status}</strong></div>
                <div><span>Email xác thực</span><strong>{detail.data.email_verified ? "Đã xác thực" : "Chưa xác thực"}</strong></div>
                <div><span>{T.BUSINESSES.CREATED}</span><strong>{formatDate(detail.data.created_at)}</strong></div>
                <div><span>{T.BUSINESSES.ROLE}</span><strong>{detail.data.roles.join(", ") || T.COMMON.OWNER}</strong></div>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{ownerContracts.data ? `${ownerContracts.data.totalElements} ${T.BUSINESSES.CONTRACTS}` : T.BUSINESSES.CONTRACTS}</h2>
              {ownerContracts.isPending && <p role="status">{T.COMMON.LOADING}</p>}
              {ownerContracts.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(ownerContracts.error)} <button type="button" onClick={() => void ownerContracts.refetch()}>{T.COMMON.RETRY}</button></div>}
              {ownerContracts.data && ownerContracts.data.items.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
              {ownerContracts.data && ownerContracts.data.items.length > 0 && <DataTable
                rows={ownerContracts.data.items}
                rowKey={(contract, index) => contract.id ?? contract.contractId ?? index}
                columns={[
                  { key: "contract", header: "Hợp đồng", render: (contract) => contract.id ?? contract.contractId ?? "—" },
                  { key: "machine", header: "Máy", render: (contract) => contract.machineId ?? "—" },
                  { key: "period", header: "Thời hạn", render: (contract) => `${contract.startDate ?? "—"} – ${contract.endDate ?? "—"}` },
                  { key: "status", header: "Trạng thái", render: (contract) => contract.status ?? "—" },
                ]}
              />}
              {ownerContracts.data && ownerContracts.data.totalPages > 1 && <div className={styles.operationsPagination}>
                <span>{T.BUSINESSES.PAGE} {ownerContracts.data.page + 1}/{ownerContracts.data.totalPages}</span>
                <div><button className={styles.accountSecondaryButton} type="button" disabled={contractPage <= 0} onClick={() => navigate({ view: "detail", id: ownerId, q: queryValue(router.query.q), status, page, contractPage: contractPage - 1 })}>{T.BUSINESSES.PREVIOUS}</button>
                  <button className={styles.accountSecondaryButton} type="button" disabled={contractPage + 1 >= ownerContracts.data.totalPages} onClick={() => navigate({ view: "detail", id: ownerId, q: queryValue(router.query.q), status, page, contractPage: contractPage + 1 })}>{T.BUSINESSES.NEXT}</button></div>
              </div>}
            </section>
          </>}
        </>
      ) : <>
        <form className={styles.operationsFilters} onSubmit={submitSearch}>
          <label className={styles.visuallyHidden} htmlFor="owner-search">{T.BUSINESSES.SEARCH}</label>
          <input id="owner-search" maxLength={100} value={searchText} placeholder={T.BUSINESSES.SEARCH} onChange={(event) => setSearchText(event.target.value)} />
          <select aria-label={T.BUSINESSES.STATUS} value={status} onChange={(event) => navigate({ q: queryValue(router.query.q), status: event.target.value, page: 1 })}>
            <option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã vô hiệu hóa</option>
          </select>
          <button className={styles.accountPrimaryButton} type="submit">Tìm kiếm</button>
        </form>
        {list.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
        {list.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(list.error)}</p><button type="button" onClick={() => void list.refetch()}>{T.COMMON.RETRY}</button></div>}
        {list.data && <section className={styles.panel}>
          <h2>{list.data.total} khách hàng</h2>
          {list.data.items.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
            rows={list.data.items}
            rowKey={(owner) => owner.id}
            columns={[
              { key: "owner", header: T.COMMON.OWNER, render: (owner) => (
                <button
                  className={styles.accountTextButton}
                  type="button"
                  aria-label={`Mở hồ sơ ${owner.name || owner.id}`}
                  onClick={() => navigate({ view: "detail", id: owner.id, q: queryValue(router.query.q), status, page })}
                >
                  {owner.name || "—"}
                </button>
              ) },
              { key: "email", header: "Email", render: (owner) => owner.email || "—" },
              { key: "status", header: "Trạng thái", render: (owner) => owner.status },
              { key: "created", header: "Ngày tạo", render: (owner) => formatDate(owner.created_at) },
            ]}
          />}
          <div className={styles.operationsPagination}>
            <span>{T.BUSINESSES.PAGE} {page}/{totalPages}</span>
            <div><button className={styles.accountSecondaryButton} type="button" disabled={page <= 1} onClick={() => navigate({ q: queryValue(router.query.q), status, page: page - 1 })}>{T.BUSINESSES.PREVIOUS}</button>
              <button className={styles.accountSecondaryButton} type="button" disabled={page >= totalPages} onClick={() => navigate({ q: queryValue(router.query.q), status, page: page + 1 })}>{T.BUSINESSES.NEXT}</button></div>
          </div>
        </section>}
      </>}
    </div>
    {view === "detail" ? (detail.data ? (
      <ActionBar>
        <ButtonBar type="button" onClick={() => void router.push({ pathname: PATH_ADMIN.STORES, query: { ownerId: detail.data!.id } })}>{T.BUSINESSES.VIEW_STORES}</ButtonBar>
      </ActionBar>
    ) : null) : (
      <ActionBar>
        <ButtonBar type="button" onClick={() => void router.push(PATH_ADMIN.STORES)}>{T.BUSINESSES.VIEW_STORES}</ButtonBar>
      </ActionBar>
    )}
    </>
  );
}

export default function AdminBusinessesPage() {
  return <AdminShell><BusinessesContent /></AdminShell>;
}
