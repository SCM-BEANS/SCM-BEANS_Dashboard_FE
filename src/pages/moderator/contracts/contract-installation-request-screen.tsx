import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { profilesApi } from "@/apis/profiles.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import type { InstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";

function localDateTimeValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function workOrderStatusLabel(status: InstallationWorkOrderSummary["status"]) {
  switch (status) {
    case "PENDING": return "Chờ phân công";
    case "ASSIGNED": return "Đã giao kỹ thuật viên";
    case "IN_PROGRESS": return "Đang lắp đặt";
    case "COMPLETED": return "Đã hoàn tất bàn giao";
    case "FAILED": return "Không hoàn tất";
    case "CANCELLED": return "Đã hủy";
  }
}

function blocksNewInstallationOrder(status: InstallationWorkOrderSummary["status"]) {
  return status === "PENDING" || status === "ASSIGNED" || status === "IN_PROGRESS" || status === "COMPLETED";
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
        <ButtonBar type="button" onClick={onRetry}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </ButtonBar>
      )}
    </div>
  );
}

export function ContractInstallationRequestScreen({
  contractId,
  backHref,
}: {
  contractId: string;
  backHref?: string;
}) {
  const queryClient = useQueryClient();
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
  const documents = useQuery({
    queryKey: ["dolores", "contract-documents", contractId],
    queryFn: ({ signal }) => contractsApi.getDocuments(contractId, signal),
    enabled: validId && contract.data?.status === "DRAFT",
    retry: false,
  });
  const workOrders = useQuery({
    queryKey: ["dolores", "installation-work-orders-by-owner", contract.data?.ownerId],
    queryFn: ({ signal }) => installationWorkOrdersApi.listByOwner(contract.data!.ownerId, signal),
    enabled: validId && contract.data?.status === "DRAFT" && Boolean(contract.data.ownerId && contract.data.machineId),
    retry: false,
  });
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "technician", "ACTIVE"],
    queryFn: async ({ signal }) => {
      const firstPage = await profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal);
      const pages = [firstPage];
      for (let page = 1; page < firstPage.totalPages; page += 5) {
        const pageNumbers = Array.from({ length: Math.min(5, firstPage.totalPages - page) }, (_, offset) => page + offset);
        pages.push(...await Promise.all(pageNumbers.map((pageNumber) =>
          profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: pageNumber, size: 100 }, signal),
        )));
      }
      return pages.flatMap((page) => page.items).filter((technician) => technician.emailVerified);
    },
    enabled: validId && contract.data?.status === "DRAFT" && Boolean(contract.data.machineId),
    retry: false,
  });
  const createWorkOrder = useMutation({
    mutationFn: installationWorkOrdersApi.create,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "installation-work-orders-by-owner", contract.data?.ownerId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-activation-work-order", contractId] }),
      ]);
    },
  });

  const selectedTechnician = technicians.data?.find((user) => user.idaasUserId === technicianId);
  const hasMainContract = documents.data?.some((document) =>
    document.documentType === "MAIN_CONTRACT" && !document.archivedAt,
  ) ?? false;
  const matchingWorkOrders = workOrders.data?.filter((workOrder) =>
    workOrder.ownerId === contract.data?.ownerId &&
    workOrder.contractId === contract.data?.id &&
    workOrder.machineId === contract.data?.machineId,
  ) ?? [];
  const currentWorkOrder = [...matchingWorkOrders]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .find((workOrder) => blocksNewInstallationOrder(workOrder.status));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !contract.data ||
      contract.data.status !== "DRAFT" ||
      !contract.data.ownerId ||
      !contract.data.machineId ||
      !hasMainContract ||
      !technicianId ||
      !selectedTechnician ||
      workOrders.isError ||
      workOrders.isPending ||
      currentWorkOrder ||
      documents.isError ||
      documents.isPending
    ) {
      return;
    }

    const scheduledForIso = scheduledFor ? new Date(scheduledFor).toISOString() : undefined;
    const notes = installationNotes.trim();
    createWorkOrder.mutate({
      ownerId: contract.data.ownerId,
      contractId: contract.data.id,
      machineId: contract.data.machineId,
      technicianId: ProfileIdSchema.parse(technicianId),
      ...(scheduledForIso ? { scheduledFor: scheduledForIso } : {}),
      ...(notes ? { installationNotes: notes } : {}),
    });
  };

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title="Tạo lệnh lắp đặt"
        description="Tạo lệnh lắp đặt từ hợp đồng nháp và giao trực tiếp cho kỹ thuật viên phụ trách."
      />
      {backHref && <ButtonBar href={backHref}>Về hợp đồng</ButtonBar>}

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
      {contract.data?.status === "DRAFT" && !contract.data.ownerId && (
        <RetryableNotice message="Hợp đồng chưa có chủ sở hữu hợp lệ; không thể tạo yêu cầu lắp đặt." />
      )}

      {contract.data?.status === "DRAFT" && !contract.data.legacyUnmapped && contract.data.ownerId && contract.data.machineId && (
        <>
          <section className={`${styles.overviewPanel} ${styles.installationPanel}`} aria-labelledby="installation-contract-summary">
            <h2 id="installation-contract-summary" className={styles.panelHeading}>Hợp đồng cần lắp đặt</h2>
            <p className={styles.formHint}>Kiểm tra đúng hồ sơ trước khi giao việc cho kỹ thuật viên.</p>
            <dl className={`${styles.detailGrid} ${styles.installationDetails}`}>
              <div className={styles.detailItem}>
                <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID}</dt>
                <dd><code className={styles.codeValue}>{contract.data.id}</code></dd>
              </div>
              <div className={styles.detailItem}>
                <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OWNER_ID}</dt>
                <dd><code className={styles.codeValue}>{contract.data.ownerId}</code></dd>
              </div>
              <div className={styles.detailItem}>
                <dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MACHINE_ID}</dt>
                <dd><code className={styles.codeValue}>{contract.data.machineId}</code></dd>
              </div>
            </dl>
          </section>

          {documents.isPending && <RetryableNotice message="Đang kiểm tra tài liệu hợp đồng…" />}
          {documents.isError && (
            <RetryableNotice
              message={`Không kiểm tra được tài liệu hợp đồng. ${getApiErrorMessage(documents.error)}`}
              onRetry={() => void documents.refetch()}
            />
          )}
          {documents.isSuccess && !hasMainContract && (
            <div className={`${styles.contractNotice} ${styles.installationPrerequisite}`} role="note">
              <p>Cần tải lên tài liệu MAIN_CONTRACT chưa lưu trữ trước khi tạo lệnh.</p>
              <ButtonBar href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}>Mở chi tiết hợp đồng</ButtonBar>
            </div>
          )}

          {workOrders.isPending && <RetryableNotice message="Đang kiểm tra các lệnh lắp đặt hiện có của Owner…" />}
          {workOrders.isError && (
            <RetryableNotice
              message={`Không kiểm tra được lệnh lắp đặt hiện có; chưa thể tạo lệnh mới an toàn. ${getApiErrorMessage(workOrders.error)}`}
              onRetry={() => void workOrders.refetch()}
            />
          )}
          {currentWorkOrder && (
            <section className={`${styles.overviewPanel} ${styles.installationPanel}`} role="status" aria-labelledby="current-installation-order">
              <h2 id="current-installation-order" className={styles.panelHeading}>Lệnh lắp đặt hiện tại</h2>
              <dl className={`${styles.detailGrid} ${styles.installationDetails}`}>
                <div className={styles.detailItem}>
                  <dt>Mã lệnh</dt>
                  <dd><code className={styles.codeValue}>{currentWorkOrder.id}</code></dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Trạng thái</dt>
                  <dd><span className={styles.installationStatus}>{workOrderStatusLabel(currentWorkOrder.status)}</span></dd>
                </div>
                {currentWorkOrder.assignedTechnicianId && <div className={styles.detailItem}>
                  <dt>Kỹ thuật viên</dt>
                  <dd><code className={styles.codeValue}>{currentWorkOrder.assignedTechnicianId}</code></dd>
                </div>}
                {currentWorkOrder.scheduledFor && <div className={styles.detailItem}>
                  <dt>Lịch dự kiến</dt>
                  <dd>{new Date(currentWorkOrder.scheduledFor).toLocaleString("vi-VN")}</dd>
                </div>}
              </dl>
              {currentWorkOrder.status === "COMPLETED"
                ? <p>Kỹ thuật viên đã hoàn tất bàn giao. Mở lại hợp đồng để tiếp tục kích hoạt.</p>
                : <p>Hợp đồng này đã có lệnh đang mở nên không thể tạo lệnh trùng.</p>}
              <div className={styles.installationActions}>
                <ButtonBar href={PATH_MODERATOR.TECHNICAL_REQUEST_DETAIL(currentWorkOrder.id)}>Mở chi tiết lệnh</ButtonBar>
                <ButtonBar href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}>Chi tiết hợp đồng</ButtonBar>
              </div>
            </section>
          )}

          {documents.isSuccess && hasMainContract && workOrders.isSuccess && !currentWorkOrder && (
            <p className={styles.contractNotice} role="note">
              Máy cần sẵn sàng trong kho và checklist lắp đặt phải đang hiệu lực, đã được duyệt. API sẽ kiểm tra các điều kiện này khi tạo lệnh.
            </p>
          )}

          {technicians.isError && (
            <RetryableNotice
              message={`Không tải được danh sách kỹ thuật viên. ${getApiErrorMessage(technicians.error)}`}
              onRetry={() => void technicians.refetch()}
            />
          )}
          {technicians.data?.length === 0 && (
            <RetryableNotice message="Không tìm thấy kỹ thuật viên đang hoạt động đã xác minh; chưa thể giao lệnh lắp đặt." />
          )}

          {createWorkOrder.isError && (
            <RetryableNotice message={getApiErrorMessage(createWorkOrder.error)} />
          )}
          {createWorkOrder.data && (
            <section className={`${styles.overviewPanel} ${styles.installationPanel}`} role="status" aria-labelledby="installation-order-created">
              <h2 id="installation-order-created" className={styles.panelHeading}>Đã tạo lệnh lắp đặt</h2>
              <dl className={`${styles.detailGrid} ${styles.installationDetails}`}>
                <div className={styles.detailItem}>
                  <dt>Mã lệnh</dt>
                  <dd><code className={styles.codeValue}>{createWorkOrder.data.id}</code></dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Trạng thái</dt>
                  <dd><span className={styles.installationStatus}>{workOrderStatusLabel(createWorkOrder.data.status)}</span></dd>
                </div>
                <div className={styles.detailItem}>
                  <dt>Kỹ thuật viên</dt>
                  <dd>{selectedTechnician?.fullName || selectedTechnician?.email || technicianId}</dd>
                </div>
              </dl>
              {createWorkOrder.data.status === "ASSIGNED"
                ? <p>Kỹ thuật viên sẽ hoàn thành checklist và bàn giao trên tài khoản của họ. Hợp đồng chỉ được kích hoạt sau khi lệnh chuyển sang COMPLETED.</p>
                : <p>API đã tạo lệnh nhưng trạng thái trả về chưa phải ASSIGNED. Hãy kiểm tra lại lệnh trước khi tiếp tục.</p>}
              <div className={styles.installationActions}>
                <ButtonBar href={PATH_MODERATOR.TECHNICAL_REQUEST_DETAIL(createWorkOrder.data.id)}>Mở chi tiết lệnh</ButtonBar>
                <ButtonBar href={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}>Chi tiết hợp đồng</ButtonBar>
              </div>
            </section>
          )}

          {!createWorkOrder.data && !currentWorkOrder && documents.isSuccess && hasMainContract && workOrders.isSuccess && (
            <form className={styles.formPanel} onSubmit={handleSubmit}>
              <div>
                <h2 className={styles.panelHeading}>Giao lệnh cho kỹ thuật viên</h2>
                <p className={styles.formHint}>Chọn người phụ trách và thời gian dự kiến. Lệnh sẽ được giao ngay sau khi tạo.</p>
              </div>
              <div className={styles.formRow}>
                <label className={styles.formField} htmlFor="installation-technician-id">
                  <span>Kỹ thuật viên phụ trách *</span>
                  <select
                    id="installation-technician-id"
                    required
                    value={technicianId}
                    disabled={technicians.isPending || technicians.isError || technicians.data?.length === 0}
                    onChange={(event) => setTechnicianId(event.target.value)}
                  >
                    <option value="">
                      {technicians.isPending ? "Đang tải danh sách…" : "Chọn kỹ thuật viên"}
                    </option>
                    {technicians.data?.map((technician) => (
                      <option key={technician.idaasUserId} value={technician.idaasUserId}>
                        {technician.fullName || technician.email || technician.idaasUserId}
                        {technician.fullName && technician.email ? ` — ${technician.email}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.formField} htmlFor="installation-scheduled-for">
                  <span>Thời gian lắp đặt (không bắt buộc)</span>
                  <input
                    id="installation-scheduled-for"
                    type="datetime-local"
                    min={localDateTimeValue(new Date())}
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                  />
                </label>
              </div>
              <label className={styles.formField} htmlFor="installation-notes">
                <span>Ghi chú cho kỹ thuật viên (không bắt buộc)</span>
                <textarea
                  id="installation-notes"
                  maxLength={4000}
                  value={installationNotes}
                  onChange={(event) => setInstallationNotes(event.target.value)}
                />
              </label>
              <div className={styles.installationActions}>
                <ButtonBar
                  type="submit"
                  disabled={
                    createWorkOrder.isPending ||
                    !selectedTechnician ||
                    technicians.isPending ||
                    technicians.isError
                  }
                >
                  {createWorkOrder.isPending ? "Đang tạo lệnh…" : "Tạo và giao lệnh"}
                </ButtonBar>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
