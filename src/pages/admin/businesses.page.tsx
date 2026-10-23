import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { PATH_ADMIN } from "@/routes/path";
import { profilesApi } from "@/apis/profiles.api";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminShell, adminStyles as styles } from "./admin-shell";

function queryValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function apiError(error: unknown): string {
  if (error instanceof z.ZodError) return T.COMMON.INVALID;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return T.COMMON.FORBIDDEN;
    if (error.response?.status === 404) return "Không tìm thấy hồ sơ Owner này.";
    if (error.response?.status === 502 || !error.response) return "Không kết nối được tới Dolores. Vui lòng thử lại sau.";
  }
  return T.COMMON.ERROR;
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
  const profileId = queryValue(router.query.id);
  const page = Math.max(0, Number(queryValue(router.query.page)) || 0);
  const status = queryValue(router.query.status);
  const contractPage = Math.max(0, Number(queryValue(router.query.contractPage)) || 0);
  useEffect(() => setSearchText(queryValue(router.query.q)), [router.query.q]);
  const list = useQuery({
    queryKey: ["dolores", "profiles", "owners", queryValue(router.query.q), status, page],
    queryFn: ({ signal }) => profilesApi.list({ role: "OWNER", q: queryValue(router.query.q) || undefined, status: status || undefined, page, size: 20 }, signal),
    enabled: view !== "detail",
  });
  const detail = useQuery({
    queryKey: ["dolores", "profiles", "owner", profileId],
    queryFn: ({ signal }) => profilesApi.getById(profileId, signal),
    enabled: view === "detail" && ProfileIdSchema.safeParse(profileId).success,
  });
  const ownerContracts = useQuery({
    queryKey: ["dolores", "profiles", "owner-contracts", profileId, contractPage],
    queryFn: ({ signal }) => profilesApi.getContracts(profileId, contractPage, 20, signal),
    enabled: view === "detail" && Boolean(detail.data),
  });

  const navigate = (params: Record<string, string | number | undefined>) => {
    const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""));
    void router.push({ pathname: "/admin/businesses", query }, undefined, { shallow: true });
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate({ q: searchText.trim(), status, page: 0 });
  };

  return (
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{view === "detail" ? detail.data?.fullName ?? T.BUSINESSES.DETAIL : T.BUSINESSES.TITLE}</h1>
        <p>{T.BUSINESSES.DESCRIPTION}</p>
      </div>
      {view === "detail" ? (
        <>
          <div className={styles.pageActions}>
            <button type="button" onClick={() => navigate({ q: queryValue(router.query.q), page })}>{T.BUSINESSES.BACK_TO_LIST}</button>
            {detail.data && <button type="button" onClick={() => void router.push({ pathname: PATH_ADMIN.STORES, query: { ownerId: detail.data!.idaasUserId } })}>{T.BUSINESSES.VIEW_STORES}</button>}
          </div>
          {!ProfileIdSchema.safeParse(profileId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã hồ sơ không hợp lệ.</div>}
          {detail.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
          {detail.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{apiError(detail.error)}</p><button type="button" onClick={() => void detail.refetch()}>{T.COMMON.RETRY}</button></div>}
          {detail.data && <>
            <section className={styles.panel}>
              <h2>{T.BUSINESSES.DETAIL}</h2>
              <div className={styles.operationsGrid}>
                <div><span>{T.COMMON.NAME}</span><strong>{detail.data.fullName || "—"}</strong></div>
                <div><span>{T.COMMON.EMAIL}</span><strong>{detail.data.email || "—"}</strong></div>
                <div><span>Số điện thoại</span><strong>{detail.data.phone || "—"}</strong></div>
                <div><span>{T.COMMON.OWNER_ID}</span><strong title={detail.data.idaasUserId}>{detail.data.idaasUserId}</strong></div>
                <div><span>{T.BUSINESSES.STATUS}</span><strong>{detail.data.status}</strong></div>
                <div><span>Email xác thực</span><strong>{detail.data.emailVerified ? "Đã xác thực" : "Chưa xác thực"}</strong></div>
                <div><span>{T.BUSINESSES.CREATED}</span><strong>{formatDate(detail.data.createdAt)}</strong></div>
                <div><span>{T.BUSINESSES.ROLE}</span><strong>{detail.data.roles.join(", ") || T.COMMON.OWNER}</strong></div>
              </div>
            </section>
            <section className={styles.panel}>
              <h2>{ownerContracts.data ? `${ownerContracts.data.totalElements} ${T.BUSINESSES.CONTRACTS}` : T.BUSINESSES.CONTRACTS}</h2>
              {ownerContracts.isPending && <p role="status">{T.COMMON.LOADING}</p>}
              {ownerContracts.isError && <div className={styles.operationsNotice} role="alert">{apiError(ownerContracts.error)} <button type="button" onClick={() => void ownerContracts.refetch()}>{T.COMMON.RETRY}</button></div>}
              {ownerContracts.data && ownerContracts.data.items.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
              {ownerContracts.data && ownerContracts.data.items.length > 0 && <div className={styles.tableScroll}><table className={styles.operationsTable}>
                <thead><tr><th>Hợp đồng</th><th>Máy</th><th>Thời hạn</th><th>Trạng thái</th></tr></thead>
                <tbody>{ownerContracts.data.items.map((contract, index) => <tr key={contract.id ?? contract.contractId ?? index}>
                  <td>{contract.id ?? contract.contractId ?? "—"}</td><td>{contract.machineId ?? "—"}</td>
                  <td>{contract.startDate ?? "—"} – {contract.endDate ?? "—"}</td><td>{contract.status ?? "—"}</td>
                </tr>)}</tbody>
              </table></div>}
              {ownerContracts.data && ownerContracts.data.totalPages > 1 && <div className={styles.operationsPagination}>
                <span>{T.BUSINESSES.PAGE} {ownerContracts.data.page + 1}/{ownerContracts.data.totalPages}</span>
                <div><button className={styles.accountSecondaryButton} type="button" disabled={contractPage <= 0} onClick={() => navigate({ view: "detail", id: profileId, q: queryValue(router.query.q), page, contractPage: contractPage - 1 })}>{T.BUSINESSES.PREVIOUS}</button>
                  <button className={styles.accountSecondaryButton} type="button" disabled={contractPage + 1 >= ownerContracts.data.totalPages} onClick={() => navigate({ view: "detail", id: profileId, q: queryValue(router.query.q), page, contractPage: contractPage + 1 })}>{T.BUSINESSES.NEXT}</button></div>
              </div>}
            </section>
          </>}
        </>
      ) : <>
        <div className={styles.pageActions}>
          <button type="button" onClick={() => void router.push(PATH_ADMIN.STORES)}>{T.BUSINESSES.VIEW_STORES}</button>
          <button type="button" onClick={() => void router.push({ pathname: PATH_ADMIN.USERS, query: { view: "create" } })}>{T.BUSINESSES.CREATE_ACCOUNT}</button>
        </div>
        <form className={styles.operationsFilters} onSubmit={submitSearch}>
          <label className={styles.visuallyHidden} htmlFor="owner-search">{T.BUSINESSES.SEARCH}</label>
          <input id="owner-search" value={searchText} placeholder={T.BUSINESSES.SEARCH} onChange={(event) => setSearchText(event.target.value)} />
          <select aria-label={T.BUSINESSES.STATUS} value={status} onChange={(event) => navigate({ q: queryValue(router.query.q), status: event.target.value, page: 0 })}>
            <option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã vô hiệu hóa</option><option value="PENDING_ASSIGNMENT">Chờ gán</option><option value="UNVERIFIED">Chưa xác thực</option>
          </select>
          <button className={styles.accountPrimaryButton} type="submit">Tìm kiếm</button>
        </form>
        {list.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
        {list.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{apiError(list.error)}</p><button type="button" onClick={() => void list.refetch()}>{T.COMMON.RETRY}</button></div>}
        {list.data && <section className={styles.panel}>
          <h2>{list.data.totalElements} khách hàng</h2>
          {list.data.items.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <div className={styles.tableScroll}><table className={styles.operationsTable}>
            <thead><tr><th>{T.COMMON.OWNER}</th><th>Email</th><th>Số điện thoại</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
            <tbody>{list.data.items.map((owner) => <tr key={owner.idaasUserId}>
              <td>{owner.fullName || "—"}</td><td>{owner.email || "—"}</td><td>{owner.phone || "—"}</td><td>{owner.status}</td><td>{formatDate(owner.createdAt)}</td>
              <td><button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: owner.idaasUserId, q: queryValue(router.query.q), page })}>Chi tiết</button></td>
            </tr>)}</tbody>
          </table></div>}
          <div className={styles.operationsPagination}>
            <span>{T.BUSINESSES.PAGE} {list.data.totalPages === 0 ? 0 : list.data.page + 1}/{list.data.totalPages}</span>
            <div><button className={styles.accountSecondaryButton} type="button" disabled={page <= 0} onClick={() => navigate({ q: queryValue(router.query.q), status, page: page - 1 })}>{T.BUSINESSES.PREVIOUS}</button>
              <button className={styles.accountSecondaryButton} type="button" disabled={page + 1 >= list.data.totalPages} onClick={() => navigate({ q: queryValue(router.query.q), status, page: page + 1 })}>{T.BUSINESSES.NEXT}</button></div>
          </div>
        </section>}
      </>}
    </div>
  );
}

export default function AdminBusinessesPage() {
  return <AdminShell><BusinessesContent /></AdminShell>;
}
