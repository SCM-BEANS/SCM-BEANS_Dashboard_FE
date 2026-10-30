import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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
  const expiry = useQuery({
    queryKey: ["dolores", "contract-expiry", id],
    queryFn: ({ signal }) => contractsApi.getExpiry(id, signal),
    enabled: validId && Boolean(contract.data) && !contract.isError,
    retry: false,
  });
  const uploadMainContract = useMutation({
    mutationFn: (file: File) => contractsApi.uploadDocument(id, { documentType: "MAIN_CONTRACT", file }),
    onSuccess: async () => {
      setDocumentFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-documents", id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-activation-work-order", id] }),
      ]);
    },
  });

  async function downloadDocument(documentId: string, filename: string) {
    setDownloadingDocumentId(documentId);
    setDownloadError(null);
    try {
      const blob = await contractsApi.downloadDocument(id, documentId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || documentId;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    } finally {
      setDownloadingDocumentId(null);
    }
  }

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
            {contract.data.status === "DRAFT" && <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); if (documentFile) uploadMainContract.mutate(documentFile); }}>
              <label className={styles.formField} htmlFor="moderator-main-contract-file">
                <span>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD_MAIN}</span>
                <input
                  key={uploadMainContract.data?.id ?? "main-contract-file"}
                  id="moderator-main-contract-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  disabled={uploadMainContract.isPending}
                  onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button className={styles.retryButton} type="submit" disabled={!documentFile || uploadMainContract.isPending}>
                {uploadMainContract.isPending ? MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOADING : MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD}
              </button>
              {uploadMainContract.isError && <p role="alert">{getApiErrorMessage(uploadMainContract.error)}</p>}
              {uploadMainContract.isSuccess && <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD_SUCCESS}</p>}
            </form>}
            {downloadError && <p role="alert">{downloadError}</p>}
            {documents.data && documents.data.length > 0 && (
              <DataTable variant="moderator" headers={["Tá»‡p", "Loáº¡i", "Dung lÆ°á»£ng", "NgĂ y táº£i"]}>
                {documents.data.map((document) => (
                  <tr key={document.id}>
                    <td>
                      {document.originalFilename}
                      <button className={styles.retryButton} type="button" disabled={downloadingDocumentId === document.id} onClick={() => void downloadDocument(document.id, document.originalFilename)}>
                        {downloadingDocumentId === document.id ? MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOWNLOADING : MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOWNLOAD}
                      </button>
                    </td>
                    <td>{document.documentType}</td>
                    <td>{document.sizeBytes} bytes Â· v{document.version}</td>
                    <td>{document.archivedAt ? "ÄĂ£ lÆ°u trá»¯" : document.uploadedAt ?? "â€”"}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </section>
          <section className={styles.pendingNotice} aria-labelledby="moderator-contract-expiry">
            <h2 id="moderator-contract-expiry" className={styles.sectionTitle}>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_INFO}</h2>
            <QueryFeedback query={expiry} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACT} />
            {expiry.data && !expiry.isError && (
              <>
                <dl className={styles.detailGrid}>
                  <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_DATE}</dt><dd>{expiry.data.expiryDate ?? "—"}</dd></div>
                  <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_REMINDER_DATE}</dt><dd>{expiry.data.reminderDate ?? "—"}</dd></div>
                  <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_DECISION}</dt><dd>{expiry.data.decision ?? "—"}</dd></div>
                  <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DECIDED_AT}</dt><dd>{expiry.data.decidedAt ?? "—"}</dd></div>
                  <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_PROCESSED}</dt><dd>{expiry.data.expiryProcessedAt ?? "—"}</dd></div>
                </dl>
                <p className={styles.formHint}>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_READ_ONLY}</p>
              </>
            )}
          </section>
          <ContractActivationPanel contract={contract.data} />
        </>
      )}
    </div>
  );
}

