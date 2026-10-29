import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";

function localDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function RetryableNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.pendingNotice} role={onRetry ? "alert" : "status"}>
      <p>{message}</p>
      {onRetry && (
        <button className={styles.retryButton} type="button" onClick={onRetry}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      )}
    </div>
  );
}

export function ContractInstallationRequestScreen({ contractId }: { contractId: string }) {
  const validId = ContractIdSchema.safeParse(contractId).success;
  const [scheduledFor, setScheduledFor] = useState("");
  const [installationNotes, setInstallationNotes] = useState("");

  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId, signal),
    enabled: validId,
    retry: false,
  });
  const documents = useQuery({
    queryKey: ["dolores", "contract-documents", contractId],
    queryFn: ({ signal }) => contractsApi.getDocuments(contractId, signal),
    enabled: validId && contract.data?.status === "DRAFT" && Boolean(contract.data.machineId),
    retry: false,
  });
  const createWorkOrder = useMutation({
    mutationFn: installationWorkOrdersApi.create,
  });

  const hasMainContractCopy = documents.data?.some(
    (document) => document.documentType === "MAIN_CONTRACT" && !document.archivedAt,
  ) ?? false;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !contract.data ||
      contract.data.status !== "DRAFT" ||
      !contract.data.ownerId ||
      !contract.data.machineId ||
      !hasMainContractCopy
    ) {
      return;
    }

    const scheduledForIso = scheduledFor ? new Date(scheduledFor).toISOString() : undefined;
    const notes = installationNotes.trim();
    createWorkOrder.mutate({
      ownerId: contract.data.ownerId,
      contractId: contract.data.id,
      machineId: contract.data.machineId,
      ...(scheduledForIso ? { scheduledFor: scheduledForIso } : {}),
      ...(notes ? { installationNotes: notes } : {}),
    });
  };

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title="Tạo yêu cầu lắp đặt"
        description="Tạo phiếu lắp đặt cho kỹ thuật viên từ hợp đồng nháp."
      />
      <TextLinkButton href={PATH_MODERATOR.CONTRACTS}>Quay lại danh sách hợp đồng</TextLinkButton>

      {!validId && (
        <RetryableNotice message="Mã hợp đồng không hợp lệ; không gửi yêu cầu tới API." />
      )}
      {validId && contract.isPending && (
        <RetryableNotice message="Đang tải thông tin hợp đồng…" />
      )}
      {validId && contract.isError && (
        <RetryableNotice message={getApiErrorMessage(contract.error)} onRetry={() => void contract.refetch()} />
      )}
      {contract.data && contract.data.status !== "DRAFT" && (
        <RetryableNotice message="Chỉ hợp đồng DRAFT mới có thể tạo yêu cầu lắp đặt." />
      )}
      {contract.data?.status === "DRAFT" && contract.data.legacyUnmapped && (
        <RetryableNotice message="Hợp đồng cũ chưa được ánh xạ đầy đủ nên chưa thể tạo yêu cầu lắp đặt." />
      )}
      {contract.data?.status === "DRAFT" && !contract.data.machineId && (
        <RetryableNotice message="Hợp đồng chưa có mã máy; chưa thể tạo yêu cầu lắp đặt." />
      )}

      {contract.data?.status === "DRAFT" && !contract.data.legacyUnmapped && contract.data.machineId && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID}</dt>
              <dd>{contract.data.id}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OWNER_ID}</dt>
              <dd>{contract.data.ownerId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MACHINE_ID}</dt>
              <dd>{contract.data.machineId}</dd>
            </div>
          </dl>

          {documents.isPending && <RetryableNotice message="Đang kiểm tra bản hợp đồng đã tải lên…" />}
          {documents.isError && (
            <RetryableNotice message={getApiErrorMessage(documents.error)} onRetry={() => void documents.refetch()} />
          )}
          {documents.data && !hasMainContractCopy && (
            <section className={styles.partialNotice} role="alert">
              <p>Cần có bản scan MAIN_CONTRACT chưa lưu trữ trước khi tạo yêu cầu.</p>
              <TextLinkButton href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}>Mở hợp đồng</TextLinkButton>
            </section>
          )}

          {createWorkOrder.isError && (
            <RetryableNotice message={getApiErrorMessage(createWorkOrder.error)} />
          )}
          {createWorkOrder.data && (
            <section className={styles.pendingNotice} role="status">
              <h2>Đã tạo yêu cầu lắp đặt</h2>
              <p>Mã yêu cầu: {createWorkOrder.data.id}</p>
              <p>Trạng thái: {createWorkOrder.data.status}. Yêu cầu đang chờ phân công kỹ thuật viên.</p>
            </section>
          )}

          {!createWorkOrder.data && (
            <form className={styles.formPanel} onSubmit={handleSubmit}>
              <label className={styles.formField} htmlFor="installation-scheduled-for">
                <span>Thời gian lắp đặt dự kiến (không bắt buộc)</span>
                <input
                  id="installation-scheduled-for"
                  type="datetime-local"
                  min={localDateTimeValue(new Date())}
                  value={scheduledFor}
                  onChange={(event) => setScheduledFor(event.target.value)}
                />
              </label>
              <label className={styles.formField} htmlFor="installation-notes">
                <span>Ghi chú cho kỹ thuật viên (không bắt buộc)</span>
                <textarea
                  id="installation-notes"
                  maxLength={4000}
                  value={installationNotes}
                  onChange={(event) => setInstallationNotes(event.target.value)}
                />
              </label>
              <button
                className={styles.retryButton}
                type="submit"
                disabled={documents.isPending || documents.isError || !hasMainContractCopy || createWorkOrder.isPending}
              >
                {createWorkOrder.isPending ? "Đang tạo yêu cầu…" : "Tạo yêu cầu lắp đặt"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
