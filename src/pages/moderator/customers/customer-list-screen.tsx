import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { profilesApi } from "@/apis/profiles.api";
import { DataTable } from "@/components/table/data-table";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_MODERATOR } from "@/routes/path";
import type { Profile } from "@/schema/profiles.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";

const OWNER_ROLE = "owner";
const PAGE_SIZE = 10;
const PROFILE_STATUSES: readonly Profile["status"][] = [
  "UNVERIFIED",
  "PENDING_ASSIGNMENT",
  "ACTIVE",
  "DISABLED",
];

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.pageHeading}>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function profileStatusLabel(status: Profile["status"]) {
  return MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS_LABELS[status];
}

export function CustomerProfileListScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Profile["status"] | "">("");
  const [page, setPage] = useState(0);

  const profiles = useQuery({
    queryKey: ["dolores", "profiles", OWNER_ROLE, status, search, page, PAGE_SIZE],
    queryFn: ({ signal }) => profilesApi.list({
      role: OWNER_ROLE,
      ...(status ? { status } : {}),
      ...(search ? { q: search } : {}),
      page,
      size: PAGE_SIZE,
    }, signal),
    retry: false,
  });

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleStatusChange = (nextStatus: Profile["status"] | "") => {
    setStatus(nextStatus);
    setPage(0);
  };

  const pageData = profiles.data;
  const totalPages = pageData?.totalPages ?? 0;

  return (
    <div className={`${styles.pageContent} ${styles.customerListPage}`}>
      <div className={styles.customerPageHeading}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMERS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMERS_DESCRIPTION}
      />
      <ButtonBar variant="primary" href={PATH_MODERATOR.NEW_CUSTOMER}>Tạo khách hàng</ButtonBar>
      </div>

      <section className={`${styles.formPanel} ${styles.customerListPanel}`}>
      <div className={styles.customerListHeading}><h2>Danh sách khách hàng</h2>{pageData && <span>{pageData.totalElements.toLocaleString("vi-VN")} {search || status ? "kết quả" : "khách hàng"}</span>}</div>
      <form className={styles.customerFilters} onSubmit={handleSearch}>
        <div className={styles.formRow}>
          <label className={styles.formField}>
            {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_SEARCH}
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={MODERATOR_MESSAGES.READ_SCREENS.PROFILE_SEARCH_PLACEHOLDER}
            />
          </label>
          <label className={styles.formField}>
            {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS}
            <select value={status} onChange={(event) => handleStatusChange(event.target.value as Profile["status"] | "")}>
              <option value="">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS_ALL}</option>
              {PROFILE_STATUSES.map((profileStatus) => (
                <option key={profileStatus} value={profileStatus}>{profileStatusLabel(profileStatus)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.contractActions}>
          <button className={styles.retryButton} type="submit">
            {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_SEARCH_ACTION}
          </button>
        </div>
      </form>

      <QueryFeedback query={profiles} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_PROFILES} />
      {pageData?.items.length === 0 && !profiles.isPending && !profiles.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_PROFILES}</p>
      )}
      {pageData && pageData.items.length > 0 && !profiles.isError && (
        <>
          <DataTable variant="moderator" headers={[
            "Khách hàng",
            MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE,
            MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS,
            MODERATOR_MESSAGES.READ_SCREENS.PROFILE_ACTION,
          ]}>
            {pageData.items.map((profile) => (
              <tr key={profile.idaasUserId}>
                <td><div className={styles.customerIdentity}><span className={styles.customerAvatar} aria-hidden="true">{profile.fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toUpperCase() || "?"}</span><div><strong>{profile.fullName || "Chưa có họ tên"}</strong><span>{profile.email || "—"}</span></div></div></td>
                <td>{profile.phone || "—"}</td>
                <td><span className={styles.customerStatus} data-status={profile.status}>{profileStatusLabel(profile.status)}</span></td>
                <td>
                  <ButtonBar rollingLabel href={PATH_MODERATOR.CUSTOMER_DETAIL(profile.idaasUserId)} aria-label={`Mở hồ sơ ${profile.fullName || profile.email}`}>
                    Mở hồ sơ
                  </ButtonBar>
                </td>
              </tr>
            ))}
          </DataTable>
          <nav className={styles.profilePagination} aria-label={MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PAGINATION}>
            <button
              className={styles.retryButton}
              type="button"
              disabled={page === 0 || profiles.isFetching}
              onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            >
              {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PREVIOUS}
            </button>
            <span>
              {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PAGE(page + 1, Math.max(totalPages, 1), pageData.totalElements)}
            </span>
            <button
              className={styles.retryButton}
              type="button"
              disabled={page + 1 >= totalPages || profiles.isFetching}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              {MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NEXT}
            </button>
          </nav>
        </>
      )}
      </section>
    </div>
  );
}
