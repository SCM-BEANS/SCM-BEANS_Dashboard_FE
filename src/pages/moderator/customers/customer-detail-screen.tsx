import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";

import { DataTable } from "@/components/table/data-table";

import { profilesApi } from "@/apis/profiles.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";

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

function PageHeading({ title, description }: { title: string; description: string }) {
  return <ModeratorPageHeading title={title} description={description} />;
}

export function CustomerProfileDetailScreen({ id }: { id: string }) {
  const queryClient = useQueryClient();
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

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMER_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CUSTOMERS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={profile} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_PROFILE} />}
      {profile.data && !profile.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_NAME}</dt>
              <dd>{profile.data.fullName || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_ID}</dt>
              <dd>{profile.data.idaasUserId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_EMAIL}</dt>
              <dd>{profile.data.email || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE}</dt>
              <dd>{profile.data.phone || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_ROLES}</dt>
              <dd>{profile.data.roles.join(", ") || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS}</dt>
              <dd>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_STATUS_LABELS[profile.data.status]}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_EMAIL_VERIFIED}</dt>
              <dd>{profile.data.emailVerified ? "Có" : "Không"}</dd>
            </div>
          </dl>
          {isOwner && (
            <form className={styles.pendingNotice} onSubmit={submitPhone}>
              <label htmlFor="moderator-owner-phone">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTACT_PHONE}</label>
              <input
                id="moderator-owner-phone"
                type="tel"
                maxLength={64}
                value={phone}
                disabled={updateContact.isPending}
                onChange={(event) => setPhone(event.target.value)}
              />
              <button className={styles.retryButton} type="submit" disabled={updateContact.isPending}>
                {updateContact.isPending
                  ? MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE_SAVING
                  : MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE_SAVE}
              </button>
              {updateContact.isError && <p role="alert">{getApiErrorMessage(updateContact.error)}</p>}
              {updateContact.isSuccess && <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_PHONE_SAVED}</p>}
            </form>
          )}
          {isOwner && <section className={styles.pendingNotice} aria-labelledby="moderator-owner-contracts">
            <h2 id="moderator-owner-contracts" className={styles.sectionTitle}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_CONTRACTS}</h2>
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
                        <td>{contractId && <Link className={styles.tableLink} href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}>{contractId}</Link>}</td>
                        <td>{item.machineId ?? "—"}</td>
                        <td>{item.status ?? "—"}</td>
                        <td>{item.startDate ?? "—"} – {item.endDate ?? "—"}</td>
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
        </>
      )}
      {profile.data && (
        <section className={styles.pendingNotice} aria-labelledby="moderator-profile-history">
          <h2 id="moderator-profile-history" className={styles.sectionTitle}>{MODERATOR_MESSAGES.READ_SCREENS.PROFILE_HISTORY}</h2>
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
                    <td>{entry.changedAt ?? "—"}</td>
                    <td>{entry.source ?? "—"}</td>
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
        </section>
      )}
    </div>
  );
}
