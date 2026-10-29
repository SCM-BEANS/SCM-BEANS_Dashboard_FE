import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { adminUsersApi } from "@/apis/admin-users.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { AdminUserIdSchema } from "@/schema/admin-users.schema";
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

export function ContractInstallationRequestScreen({
  contractId,
  backHref = PATH_MODERATOR.CONTRACTS,
}: {
  contractId: string;
  backHref?: string;
}) {
  const validId = ContractIdSchema.safeParse(contractId).success;
  const [scheduledFor, setScheduledFor] = useState("");
  const [installationNotes, setInstallationNotes] = useState("");
  const [technicianId, setTechnicianId] = useState("");

  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId, signal),
    enabled: validId,
    retry: false,
  });
  const technicians = useQuery({
    queryKey: ["idaas", "admin-users", "technician", "ACTIVE", 1, 100],
    queryFn: ({ signal }) => adminUsersApi.list(
      { role: "technician", status: "ACTIVE", page: 1, page_size: 100 },
      signal,
    ),
    enabled: validId && contract.data?.status === "DRAFT" && Boolean(contract.data.machineId),
    retry: false,
  });
  const createWorkOrder = useMutation({
    mutationFn: installationWorkOrdersApi.create,
  });

  const selectedTechnician = technicians.data?.items.find((user) => user.id === technicianId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !contract.data ||
      contract.data.status !== "DRAFT" ||
      !contract.data.ownerId ||
      !contract.data.machineId ||
      (technicianId !== "" && !selectedTechnician)
    ) {
      return;
    }

    const scheduledForIso = scheduledFor ? new Date(scheduledFor).toISOString() : undefined;
    const notes = installationNotes.trim();
    createWorkOrder.mutate({
      ownerId: contract.data.ownerId,
      contractId: contract.data.id,
      machineId: contract.data.machineId,
      ...(technicianId ? { technicianId: AdminUserIdSchema.parse(technicianId) } : {}),
      ...(scheduledForIso ? { scheduledFor: scheduledForIso } : {}),
      ...(notes ? { installationNotes: notes } : {}),
    });
  };

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title="Tạo yêu cầu lắp đặt"
        description="Tạo phiếu từ hợp đồng nháp, có thể giao ngay cho một kỹ thuật viên đang hoạt động."
      />
      <TextLinkButton href={backHref}>Quay lại danh sách hợp đồng</TextLinkButton>

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

          {technicians.isError && (
            <RetryableNotice
              message={`Không tải được danh sách kỹ thuật viên. ${getApiErrorMessage(technicians.error)}`}
              onRetry={() => void technicians.refetch()}
            />
          )}
          {technicians.data?.items.length === 0 && (
            <RetryableNotice message="Không tìm thấy kỹ thuật viên đang hoạt động; có thể tạo lệnh chờ phân công." />
          )}

          {createWorkOrder.isError && (
            <RetryableNotice message={getApiErrorMessage(createWorkOrder.error)} />
          )}
          {createWorkOrder.data && (
            <section className={styles.pendingNotice} role="status">
              <h2>Đã tạo yêu cầu lắp đặt</h2>
              <p>Mã yêu cầu: {createWorkOrder.data.id}</p>
              {createWorkOrder.data.status === "ASSIGNED"
                ? <p>Trạng thái: Đã giao cho {selectedTechnician?.name || selectedTechnician?.email || technicianId}.</p>
                : <p>Trạng thái: {createWorkOrder.data.status}. Yêu cầu đang chờ phân công kỹ thuật viên.</p>}
            </section>
          )}

          {!createWorkOrder.data && (
            <form className={styles.formPanel} onSubmit={handleSubmit}>
              <label className={styles.formField} htmlFor="installation-technician-id">
                <span>Giao kỹ thuật viên ngay (không bắt buộc)</span>
                <select
                  id="installation-technician-id"
                  value={technicianId}
                  disabled={technicians.isPending || technicians.isError}
                  onChange={(event) => setTechnicianId(event.target.value)}
                >
                  <option value="">
                    {technicians.isPending ? "Đang tải danh sách kỹ thuật viên…" : "Để chờ phân công"}
                  </option>
                  {technicians.data?.items.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name || technician.email || technician.id}
                      {` — ${technician.roles.map((role) => role.toUpperCase()).join(", ")}`}
                      {technician.name && technician.email ? ` — ${technician.email}` : ""}
                    </option>
                  ))}
                </select>
              </label>
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
                disabled={
                  createWorkOrder.isPending ||
                  (technicianId !== "" && (!selectedTechnician || technicians.isError))
                }
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
