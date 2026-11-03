import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { contractsApi } from "@/apis/contracts.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TerminationWorkflowPanel } from "@/components/contracts/termination-workflow-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ContractIdSchema, TerminationCaseRequestSchema, type TerminationCaseRequest } from "@/schema/contracts.schema";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import styles from "./contract-termination-screen.module.css";

type TerminationRole = "ADMIN" | "MODERATOR" | "OWNER";

export function ContractTerminationScreen({
  contractId,
  role,
  backHref,
}: {
  contractId: string;
  role: TerminationRole;
  backHref: string;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TerminationCaseRequest["type"]>("NORMAL");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [pendingRequest, setPendingRequest] = useState<TerminationCaseRequest | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState("");
  const [formError, setFormError] = useState("");
  const validId = ContractIdSchema.safeParse(contractId).success;
  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId, signal),
    enabled: validId,
    retry: false,
  });
  const expiry = useQuery({
    queryKey: ["dolores", "contract-expiry", contractId],
    queryFn: ({ signal }) => contractsApi.getExpiry(contractId, signal),
    enabled: validId && Boolean(contract.data),
    retry: false,
  });
  const recallOrders = useQuery({
    queryKey: ["dolores", "recall-work-orders", "contract", contractId],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ contractId, page: 0, size: 100 }, signal),
    enabled: validId && Boolean(contract.data),
    retry: false,
  });
  const requestTermination = useMutation({
    mutationFn: (input: TerminationCaseRequest) => contractsApi.requestTermination(contractId, input),
    onSuccess: async (created) => {
      setPendingRequest(null);
      setCreatedCaseId(created.id);
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts", "id", contractId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-expiry", contractId] }),
      ]);
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error, "mutation")),
  });

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = TerminationCaseRequestSchema.safeParse({
      type,
      reason,
      ...(effectiveDate ? { effectiveDate } : {}),
      idempotencyKey: globalThis.crypto.randomUUID(),
      correlationId: globalThis.crypto.randomUUID(),
    });
    if (!parsed.success) {
      setFormError("Vui lòng chọn loại yêu cầu và nhập lý do hợp lệ.");
      return;
    }
    setFormError("");
    setPendingRequest(parsed.data);
  };

  const sortedRecallOrders = [...(recallOrders.data?.content ?? [])].sort((left, right) =>
    Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""),
  );
  const latestRecallCaseId = sortedRecallOrders.find((order) => order.status !== "CANCELLED")?.terminationCaseId
    ?? sortedRecallOrders[0]?.terminationCaseId
    ?? "";
  const activeCaseId = createdCaseId || expiry.data?.terminationCaseId || latestRecallCaseId;
  const canCreateCase = role !== "OWNER"
    && contract.data?.status === "ACTIVE"
    && expiry.isSuccess
    && recallOrders.isSuccess
    && !activeCaseId;
  const detailHref = role === "ADMIN"
    ? PATH_ADMIN.CONTRACT_DETAIL(contractId)
    : role === "MODERATOR"
      ? PATH_MODERATOR.CONTRACT_DETAIL(contractId)
      : PATH_CUSTOMER.CONTRACT_DETAIL(contractId);

  return (
    <section className={styles.page} aria-labelledby="termination-page-title">
      <BackButtonHeading
        back={{ label: "Về chi tiết hợp đồng", fallbackHref: backHref || detailHref }}
        title="Chấm dứt hợp đồng"
        titleId="termination-page-title"
        description="Theo dõi yêu cầu, thu hồi máy và các bước xử lý liên quan đến hợp đồng."
        className={styles.heading}
      />

      {!validId ? <p className={styles.error} role="alert">Mã hợp đồng không hợp lệ.</p> : null}
      {contract.isPending && validId ? <p className={styles.notice} role="status">Đang tải thông tin hợp đồng…</p> : null}
      {contract.isError ? (
        <div className={styles.error} role="alert">
          <p>{getApiErrorMessage(contract.error)}</p>
          <ButtonBar type="button" onClick={() => void contract.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}

      {contract.data ? (
        <section className={styles.contractCard} aria-label="Thông tin hợp đồng">
          <h2>Hợp đồng</h2>
          <dl className={styles.contractSummary}>
            <div><dt>Mã hợp đồng</dt><dd>{contract.data.id}</dd></div>
            <div><dt>Trạng thái</dt><dd>{contract.data.status === "ACTIVE" ? T.CONTRACTS.ACTIVE : contract.data.status === "TERMINATED" ? T.CONTRACTS.TERMINATED : T.CONTRACTS.DRAFT}</dd></div>
            <div><dt>Chủ sở hữu</dt><dd>{contract.data.ownerId}</dd></div>
            <div><dt>Máy</dt><dd>{contract.data.machineId ?? "Chưa gắn máy"}</dd></div>
          </dl>
        </section>
      ) : null}

      {role !== "OWNER" && contract.data?.status === "ACTIVE" && expiry.isPending ? (
        <p className={styles.notice} role="status">Đang kiểm tra hồ sơ chấm dứt hiện có…</p>
      ) : null}
      {role !== "OWNER" && contract.data?.status === "ACTIVE" && expiry.isSuccess && recallOrders.isPending && !activeCaseId ? (
        <p className={styles.notice} role="status">Đang kiểm tra hồ sơ thu hồi đã có của hợp đồng…</p>
      ) : null}
      {contract.data?.status === "ACTIVE" && recallOrders.isError && !expiry.data?.terminationCaseId ? (
        <div className={styles.error} role="alert">
          <p>Không thể kiểm tra lệnh thu hồi đã liên kết nên chưa xác định được hồ sơ hiện có.</p>
          <ButtonBar type="button" onClick={() => void recallOrders.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {canCreateCase ? (
        <form className={styles.form} onSubmit={submitRequest}>
          <h2>Tạo hồ sơ chấm dứt</h2>
          <p>Gửi yêu cầu sẽ mở hồ sơ theo dõi. Hợp đồng vẫn hiệu lực trong lúc xử lý; backend chuyển máy sang trạng thái bảo trì ngay khi ghi nhận yêu cầu.</p>
          <div className={styles.formGrid}>
            <label>Loại yêu cầu
              <select value={type} onChange={(event) => setType(event.target.value as TerminationCaseRequest["type"])}>
                <option value="NORMAL">Kết thúc theo kỳ hạn</option>
                <option value="EARLY">Chấm dứt trước hạn</option>
                <option value="VIOLATION">Do vi phạm</option>
              </select>
            </label>
            <label>Ngày hiệu lực
              <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
            </label>
            <label className={styles.reasonField}>Lý do <span aria-hidden="true">*</span>
              <textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
          </div>
          {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
          {requestTermination.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(requestTermination.error, "mutation")}</p> : null}
          {requestTermination.isSuccess ? <p className={styles.success} role="status">Đã tạo hồ sơ. Máy được chuyển sang trạng thái bảo trì; hợp đồng vẫn hiệu lực đến khi quy trình hoàn tất.</p> : null}
          <ButtonBar type="submit" disabled={requestTermination.isPending}>
            {requestTermination.isPending ? "Đang gửi yêu cầu…" : "Tạo hồ sơ chấm dứt"}
          </ButtonBar>
        </form>
      ) : null}

      {role !== "OWNER" && contract.data?.status === "ACTIVE" && activeCaseId ? (
        <p className={styles.notice} role="status">Hợp đồng đã có hồ sơ chấm dứt. Các bước xử lý được theo dõi bên dưới.</p>
      ) : null}
      {role === "OWNER" && !activeCaseId && expiry.isSuccess && recallOrders.isSuccess ? (
        <p className={styles.notice} role="status">Hợp đồng chưa có hồ sơ chấm dứt được liên kết.</p>
      ) : null}
      {expiry.isError ? (
        <div className={styles.error} role="alert">
          <p>Không tải được trạng thái hồ sơ chấm dứt: {getApiErrorMessage(expiry.error)}</p>
          <ButtonBar type="button" onClick={() => void expiry.refetch()}>Thử tải lại</ButtonBar>
        </div>
      ) : null}
      {activeCaseId ? (
        <TerminationWorkflowPanel
          mode={role === "OWNER" ? "owner" : "operator"}
          role={role}
          contractId={contractId}
          caseId={activeCaseId}
        />
      ) : null}

      {pendingRequest ? (
        <NotificationDialog
          variant="confirm"
          title="Tạo hồ sơ chấm dứt hợp đồng?"
          description="Hồ sơ sẽ được tạo để theo dõi quá trình xử lý. Máy chuyển sang trạng thái bảo trì ngay khi backend ghi nhận; hợp đồng vẫn hiệu lực đến bước hoàn tất cuối cùng."
          primaryAction={{
            label: "Tạo hồ sơ",
            pending: requestTermination.isPending,
            pendingLabel: "Đang tạo…",
            onClick: () => requestTermination.mutate(pendingRequest),
          }}
          secondaryAction={{ label: "Quay lại", disabled: requestTermination.isPending, onClick: () => setPendingRequest(null) }}
          onClose={() => { if (!requestTermination.isPending) setPendingRequest(null); }}
          closeOnEscape={!requestTermination.isPending}
        >
          {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
        </NotificationDialog>
      ) : null}
    </section>
  );
}
