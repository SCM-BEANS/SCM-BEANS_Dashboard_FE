import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/router";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { TruncatedId } from "@/components/truncated-id/truncated-id";

import { DataTable } from "@/components/table/data-table";

import { profilesApi } from "@/apis/profiles.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";

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

function displayDate(value?: string | null) {
  if (!value) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN", { timeZone: dateOnly ? "UTC" : "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", ...(!dateOnly ? { hour: "2-digit", minute: "2-digit" } as const : {}) }) : "—";
}

export function CustomerProfileDetailScreen({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [contractsPage, setContractsPage] = useState(0);
  const [phone, setPhone] = useState("");
  const validId = ProfileIdSchema.safeParse(id).success;
  const profile = useQuery({
    queryKey: ["dolores", "profiles", "id", id],
    queryFn: ({ signal }) => profilesApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });
  const isOwner = profile.data?.roles.some((role) => role.toUpperCase() === "OWNER") ?? false;
  const history = useQuery({
    queryKey: ["dolores", "profiles", "id", id, "history", historyPage],
    queryFn: ({ signal }) => profilesApi.getHistory(id, historyPage, 20, signal),
    enabled: validId && Boolean(profile.data),
    retry: false,
  });
  const contracts = useQuery({
    queryKey: ["dolores", "profiles", "id", id, "contracts", contractsPage],
    queryFn: ({ signal }) => profilesApi.getContracts(id, contractsPage, 20, signal),
    enabled: validId && isOwner,
    retry: false,
  });
  const updateContact = useMutation({
    mutationFn: () => profilesApi.updateContactInfo(id, { phone }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "profiles", "id", id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "profiles"] }),
      ]);
    },
  });

  useEffect(() => {
    setPhone(profile.data?.phone ?? "");
  }, [profile.data?.phone]);

  function submitPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateContact.mutate();
  }
  const dirty = Boolean(profile.data && phone !== (profile.data.phone ?? ""));

  return (
    <div className={`${styles.pageContent} ${styles.customerDetailPage}`}>
      <header className={styles.pageHeading}><h1>Hồ sơ khách hàng</h1></header>
      <div className={styles.customerDetailToolbar}>
        <ButtonBar disabled={updateContact.isPending} onClick={() => dirty ? setLeaveTarget(PATH_MODERATOR.CUSTOMERS) : void router.push(PATH_MODERATOR.CUSTOMERS)}>Về danh sách</ButtonBar>
        {profile.data && !profile.isError && <><div className={styles.customerToolbarIdentity}><strong>{profile.data.fullName || profile.data.email}</strong><span>Khách hàng</span></div>{isOwner && <ButtonBar variant="primary" type="submit" form="moderator-owner-contact" disabled={!dirty || updateContact.isPending}>{updateContact.isPending ? "Đang lưu…" : "Lưu thay đổi"}</ButtonBar>}</>}
      </div>
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={profile} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_PROFILE} />}
      {profile.data && !profile.isError && (
        <div className={styles.customerDetailLayout}>
          <div className={styles.customerDetailMain}>
          <section className={styles.formPanel} aria-labelledby="moderator-contact-title">
          <h2 id="moderator-contact-title" className={styles.sectionTitle}>Thông tin liên hệ</h2>
          <dl className={styles.customerAccountInfo}>
            <div>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NAME}</dt>
              <dd>{profile.data.fullName || "—"}</dd>
            </div>
            <div>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_EMAIL}</dt>
              <dd>{profile.data.email || "—"}</dd>
            </div>
          </dl>
          {isOwner && (
            <form id="moderator-owner-contact" onSubmit={submitPhone}>
              <label className={styles.formField} htmlFor="moderator-owner-phone">Số điện thoại
              <input
                id="moderator-owner-phone"
                type="tel"
                maxLength={64}
                value={phone}
                disabled={updateContact.isPending}
                onChange={(event) => setPhone(event.target.value)}
              /></label>
              {updateContact.isError && <p role="alert">{getApiErrorMessage(updateContact.error)}</p>}
              {updateContact.isSuccess && <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE_SAVED}</p>}
            </form>
          )}
          </section>
          {isOwner && <section className={styles.formPanel} aria-labelledby="moderator-owner-contracts">
            <h2 id="moderator-owner-contracts" className={styles.sectionTitle}>Hồ sơ khách hàng</h2>
            <details className={styles.customerTechnicalDetails}><summary>Thông tin đồng bộ</summary><dl className={styles.customerAccountInfo}><div><dt>Mã hồ sơ</dt><dd><TruncatedId value={profile.data.idaasUserId} /></dd></div><div><dt>Vai trò</dt><dd>{profile.data.roles.map(role => ({ OWNER: "Khách hàng", MODERATOR: "Điều phối viên", TECHNICIAN: "Kỹ thuật viên", ADMIN: "Quản trị viên" } as Record<string, string>)[role.toUpperCase()] ?? role).join(", ")}</dd></div></dl></details>
            <h3 className={styles.sectionTitle}>Hợp đồng liên quan</h3>
            <QueryFeedback query={contracts} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACTS} />
            {contracts.data?.items.length === 0 && !contracts.isError && (
              <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTRACTS_EMPTY}</p>
            )}
            {contracts.data && !contracts.isError && contracts.data.items.length > 0 && (
              <>
                <DataTable variant="moderator" headers={[
                  MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID,
                  MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTRACT_MACHINE,
                  MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTRACT_STATUS,
                  MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTRACT_PERIOD,
                ]}>
                  {contracts.data.items.map((item, index) => {
                    const contractId = item.contractId ?? item.id;
                    return (
                      <tr key={contractId ?? `owner-contract-${index}`}>
                        <td>{contractId && <Link href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)} onClick={(event) => { if (dirty || updateContact.isPending) { event.preventDefault(); if (!updateContact.isPending) setLeaveTarget(PATH_MODERATOR.CONTRACT_DETAIL(contractId)); } }}><TruncatedId value={contractId} /></Link>}</td>
                        <td><TruncatedId value={item.machineId} /></td>
                        <td>{({ ACTIVE: "Đang hiệu lực", DRAFT: "Bản nháp", TERMINATED: "Đã chấm dứt", EXPIRED: "Đã hết hạn" } as Record<string, string>)[item.status ?? ""] ?? item.status ?? "—"}</td>
                        <td>{displayDate(item.startDate)} – {displayDate(item.endDate)}</td>
                      </tr>
                    );
                  })}
                </DataTable>
                <div className={styles.profilePagination}>
                  <button className={styles.retryButton} type="button" disabled={contractsPage <= 0} onClick={() => setContractsPage((page) => page - 1)}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PREVIOUS}</button>
                  <span className={styles.formHint}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_SECTION_PAGE(contracts.data.page + 1, Math.max(1, contracts.data.totalPages), contracts.data.totalElements)}</span>
                  <button className={styles.retryButton} type="button" disabled={contractsPage + 1 >= contracts.data.totalPages} onClick={() => setContractsPage((page) => page + 1)}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NEXT}</button>
                </div>
              </>
            )}
          </section>}
        <details className={`${styles.formPanel} ${styles.customerTechnicalDetails}`}>
          <summary>Lịch sử hồ sơ</summary>
          <QueryFeedback query={history} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_PROFILE} />
          {history.data?.items.length === 0 && !history.isError && (
            <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY_EMPTY}</p>
          )}
          {history.data && !history.isError && history.data.items.length > 0 && (
            <>
              <DataTable variant="moderator" headers={[
                MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY_DATE,
                MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY_SOURCE,
                MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY_ACTOR,
                MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY_CHANGES,
              ]} minWidth={760}>
                {history.data.items.map((entry, index) => (
                  <tr key={entry.id ?? `${entry.changedAt ?? "history"}-${index}`}>
                    <td>{displayDate(entry.changedAt)}</td>
                    <td>{entry.source === "IDAAS_SYNC" ? "Đồng bộ tài khoản" : entry.source ?? "—"}</td>
                    <td>{entry.changedBy ?? "—"}</td>
                    <td>{typeof entry.changes === "string" ? entry.changes : JSON.stringify(entry.changes ?? {})}</td>
                  </tr>
                ))}
              </DataTable>
              <div className={styles.profilePagination}>
                <button className={styles.retryButton} type="button" disabled={historyPage <= 0} onClick={() => setHistoryPage((page) => page - 1)}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PREVIOUS}</button>
                <span className={styles.formHint}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_SECTION_PAGE(history.data.page + 1, Math.max(1, history.data.totalPages), history.data.totalElements)}</span>
                <button className={styles.retryButton} type="button" disabled={historyPage + 1 >= history.data.totalPages} onClick={() => setHistoryPage((page) => page + 1)}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NEXT}</button>
              </div>
            </>
          )}
        </details>
        </div>
        <aside className={styles.formPanel} aria-labelledby="moderator-account-status"><h2 id="moderator-account-status" className={styles.sectionTitle}>Trạng thái tài khoản</h2><dl className={styles.customerMetadata}>
          <div><dt>Trạng thái</dt><dd><span className={styles.customerStatus} data-status={profile.data.status}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS_LABELS[profile.data.status]}</span></dd></div>
          <div><dt>Xác minh email</dt><dd>{profile.data.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{displayDate(profile.data.createdAt)}</dd></div>
          <div><dt>Cập nhật</dt><dd>{displayDate(profile.data.updatedAt)}</dd></div>
        </dl></aside>
        </div>
      )}
      {leaveTarget && <NotificationDialog variant="confirm" title="Rời hồ sơ khách hàng?" description="Các thay đổi chưa lưu sẽ bị mất." primaryAction={{ label: "Rời hồ sơ", onClick: () => { void router.push(leaveTarget); } }} secondaryAction={{ label: "Tiếp tục chỉnh sửa", onClick: () => setLeaveTarget(null) }} onClose={() => setLeaveTarget(null)} />}
    </div>
  );
}
