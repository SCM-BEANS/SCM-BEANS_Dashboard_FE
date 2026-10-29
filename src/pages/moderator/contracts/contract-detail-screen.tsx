import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/table/data-table";
import { ContractActivationPanel } from "@/components/contracts/contract-activation-panel";

import { contractsApi } from "@/apis/contracts.api";

import { ModeratorPageHeading } from "../moderator-page-heading";

import { getApiErrorMessage } from "@/lib/api-errors";

import { ContractIdSchema } from "@/schema/contracts.schema";

import { moderatorStyles as styles } from "../moderator-shell";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

function QueryFeedback({
  query,
  loadingMessage,
  errorMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
  errorMessage?: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
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

export function ContractDetailScreen({ id }: { id: string }) {
  const validId = ContractIdSchema.safeParse(id).success;
  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", id],
    queryFn: ({ signal }) => contractsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });
  const documents = useQuery({
    queryKey: ["dolores", "contract-documents", id],
    queryFn: ({ signal }) => contractsApi.getDocuments(id, signal),
    enabled: validId && Boolean(contract.data) && !contract.isError,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={contract} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACT} />}
      {contract.data && !contract.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID}</dt><dd>{contract.data.id}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OWNER_ID}</dt><dd>{contract.data.ownerId}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MACHINE_ID}</dt><dd>{contract.data.machineId ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_STATUS}</dt><dd>{contract.data.status}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PERIOD}</dt><dd>{contract.data.startDate ?? "â€”"} â€“ {contract.data.endDate ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TYPE}</dt><dd>{contract.data.machineTypeSnapshot ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MONTHLY_FEE}</dt><dd>{contract.data.monthlyRentalFee ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DEPOSIT}</dt><dd>{contract.data.depositAmount ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_INSTALLATION_FEE}</dt><dd>{contract.data.installationFee ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PAYG_PRICE}</dt><dd>{contract.data.paygUnitPrice ?? "â€”"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OFFLINE_LIMIT}</dt><dd>{contract.data.offlineLimitMinutes == null ? "â€”" : `${contract.data.offlineLimitMinutes} phĂºt`}</dd></div>
          </dl>
          {(contract.data.termsSnapshot ?? contract.data.terms) && (
            <section className={styles.pendingNotice}>
              <h2>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TERMS}</h2>
              <p>{contract.data.termsSnapshot ?? contract.data.terms}</p>
            </section>
          )}
          <section className={styles.pendingNotice} aria-labelledby="moderator-contract-documents">
            <h2 id="moderator-contract-documents">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOCUMENTS}</h2>
            <QueryFeedback query={documents} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_DOCUMENTS} />
            {documents.data?.length === 0 && !documents.isError && (
              <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_DOCUMENTS}</p>
            )}
            {documents.data && documents.data.length > 0 && (
              <DataTable variant="moderator" headers={["Tá»‡p", "Loáº¡i", "Dung lÆ°á»£ng", "NgĂ y táº£i"]}>
                {documents.data.map((document) => (
                  <tr key={document.id}>
                    <td>{document.originalFilename}</td>
                    <td>{document.documentType}</td>
                    <td>{document.sizeBytes} bytes Â· v{document.version}</td>
                    <td>{document.archivedAt ? "ÄĂ£ lÆ°u trá»¯" : document.uploadedAt ?? "â€”"}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </section>
          <ContractActivationPanel contract={contract.data} />
        </>
      )}
    </div>
  );
}

