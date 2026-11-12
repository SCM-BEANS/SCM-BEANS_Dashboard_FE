import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";

import { DataTable } from "@/components/table/data-table";
import { ContractActivationPanel } from "@/components/contracts/contract-activation-panel";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildContractDetailActions } from "@/components/action-bar/entity-page-actions";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";

import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { profilesApi } from "@/apis/profiles.api";

import { getApiErrorMessage } from "@/lib/api-errors";

import {
  ContractContinuationRequestSchema,
  ContractIdSchema,
  ContractPolicyAmendmentRequestSchema,
  type ContractContinuationRequest,
  type ContractPolicyAmendmentRequest,
} from "@/schema/contracts.schema";
import type { InstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";

import { moderatorStyles as styles } from "../moderator-shell";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { PATH_MODERATOR } from "@/routes/path";
import { adminStyles } from "@/pages/admin/admin-shell";

type ContractPolicyDraft = {
  policyVersion: number;
  maintenanceIntervalMonths: string;
  maintenanceWindowDays: string;
  allowedReplacementMachineTypes: Array<"CONVENTIONAL" | "SMART_IOT">;
  repairCostResponsibility: "TENANT" | "COMPANY" | "UNKNOWN";
  paymentDueEligibleDays: string;
  paymentDestinationReference?: string;
  offlineViolationAction: "WARN_ONLY" | "MANUAL_REVIEW";
  buybackEnabled: boolean;
  offlineLimitMinutes: string;
  heartbeatToleranceSeconds: string;
  buybackMinimumMonths: string;
  buybackValuationMethod: "MANUAL_APPRAISAL";
  [key: string]: unknown;
};

function date(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
}

function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("vi-VN");
}

function money(value: number | null | undefined): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value);
}

function contractStatus(value: string): string {
  if (value === "ACTIVE") return T.CONTRACTS.ACTIVE;
  if (value === "DRAFT") return T.CONTRACTS.DRAFT;
  if (value === "TERMINATED") return T.CONTRACTS.TERMINATED;
  return value;
}

function installationWorkOrderStatus(value: InstallationWorkOrderSummary["status"]): string {
  const labels: Record<InstallationWorkOrderSummary["status"], string> = {
    PENDING: "Chờ phân công",
    ASSIGNED: "Đã giao kỹ thuật viên",
    IN_PROGRESS: "Đang lắp đặt",
    COMPLETED: "Đã hoàn tất bàn giao",
    FAILED: "Lắp đặt thất bại",
    CANCELLED: "Đã hủy lệnh",
  };
  return labels[value];
}

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
    return <p className={adminStyles.emptyText} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
        <button type="button" onClick={() => void query.refetch()}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

export function ContractDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lifecycleDirty, setLifecycleDirty] = useState(false);
  const [lifecycleView, setLifecycleView] = useState<"amend" | "continue" | null>(null);
  const [policySnapshot, setPolicySnapshot] = useState<ContractPolicyDraft | null>(null);
  const [policyReason, setPolicyReason] = useState("");
  const [policyEffectiveDate, setPolicyEffectiveDate] = useState("");
  const [continuationStartDate, setContinuationStartDate] = useState("");
  const [continuationEndDate, setContinuationEndDate] = useState("");
  const [continuationTerms, setContinuationTerms] = useState("");
  const [continuationMonthlyFee, setContinuationMonthlyFee] = useState("");
  const [continuationDeposit, setContinuationDeposit] = useState("");
  const [continuationInstallationFee, setContinuationInstallationFee] = useState("");
  const [continuationPaygPrice, setContinuationPaygPrice] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const [pendingPolicy, setPendingPolicy] = useState<ContractPolicyAmendmentRequest | null>(null);
  const [pendingContinuation, setPendingContinuation] = useState<ContractContinuationRequest | null>(null);
  const [continuedContractId, setContinuedContractId] = useState("");
  const validId = ContractIdSchema.safeParse(id).success;
  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", id],
    queryFn: ({ signal }) => contractsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });
  const installationWorkOrders = useQuery({
    queryKey: ["dolores", "installation-work-orders-by-owner", contract.data?.ownerId],
    queryFn: ({ signal }) => installationWorkOrdersApi.listByOwner(contract.data!.ownerId, signal),
    enabled: Boolean(contract.data?.ownerId) && contract.data?.status === "ACTIVE",
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
  const owner = useQuery({
    queryKey: ["dolores", "profiles", "id", contract.data?.ownerId],
    queryFn: ({ signal }) => profilesApi.getById(contract.data!.ownerId, signal),
    enabled: Boolean(contract.data?.ownerId),
    retry: false,
  });
  const policyHistory = useQuery({
    queryKey: ["dolores", "contract-policy-history", id],
    queryFn: ({ signal }) => contractsApi.getPolicyHistory(id, signal),
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
  useEffect(() => {
    if (!contract.data) return;
    const snapshot = contract.data.contractTermsSnapshot;
    setPolicySnapshot(snapshot ? {
      ...snapshot,
      paymentDestinationReference: snapshot.paymentDestinationReference ?? undefined,
      maintenanceIntervalMonths: String(snapshot.maintenanceIntervalMonths),
      maintenanceWindowDays: String(snapshot.maintenanceWindowDays),
      paymentDueEligibleDays: String(snapshot.paymentDueEligibleDays),
      offlineLimitMinutes: snapshot.offlineLimitMinutes == null ? "" : String(snapshot.offlineLimitMinutes),
      heartbeatToleranceSeconds: String(snapshot.heartbeatToleranceSeconds ?? 45),
      buybackMinimumMonths: String(snapshot.buybackMinimumMonths),
    } : null);
    setPolicyReason("");
    setPolicyEffectiveDate(contract.data.endDate ?? new Date().toISOString().slice(0, 10));
    setContinuationTerms(contract.data.terms ?? "");
    setContinuationMonthlyFee(contract.data.monthlyRentalFee == null ? "" : String(contract.data.monthlyRentalFee));
    setContinuationDeposit(contract.data.depositAmount == null ? "" : String(contract.data.depositAmount));
    setContinuationInstallationFee(contract.data.installationFee == null ? "" : String(contract.data.installationFee));
    setContinuationPaygPrice(contract.data.paygUnitPrice == null ? "" : String(contract.data.paygUnitPrice));
    setContinuationStartDate(contract.data.endDate ?? "");
    setContinuationEndDate("");
  }, [contract.data]);
  const amendPolicy = useMutation({
    mutationFn: (input: ContractPolicyAmendmentRequest) => contractsApi.amendPolicy(id, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dolores", "contracts", "id", id], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-policy-history", id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] }),
      ]);
      setPendingPolicy(null);
      setLifecycleView(null);
    },
    onError: (error: unknown) => setLifecycleError(getApiErrorMessage(error, "mutation")),
  });
  const continueContract = useMutation({
    mutationFn: (input: ContractContinuationRequest) => contractsApi.continueContract(id, input),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] });
      setPendingContinuation(null);
      setLifecycleView(null);
      setContinuedContractId(created.id);
    },
    onError: (error: unknown) => setLifecycleError(getApiErrorMessage(error, "mutation")),
  });

  const submitPolicyAmendment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!policySnapshot) return;
    const {
      maintenanceIntervalMonths,
      maintenanceWindowDays,
      paymentDueEligibleDays,
      offlineLimitMinutes,
      heartbeatToleranceSeconds,
      buybackMinimumMonths,
      ...rest
    } = policySnapshot;
    const parsed = ContractPolicyAmendmentRequestSchema.safeParse({
      snapshot: {
        ...rest,
        maintenanceIntervalMonths: Number(maintenanceIntervalMonths),
        maintenanceWindowDays: Number(maintenanceWindowDays),
        paymentDueEligibleDays: Number(paymentDueEligibleDays),
        ...(offlineLimitMinutes.trim() ? { offlineLimitMinutes: Number(offlineLimitMinutes) } : {}),
        heartbeatToleranceSeconds: Number(heartbeatToleranceSeconds),
        buybackMinimumMonths: Number(buybackMinimumMonths),
      },
      reason: policyReason,
      effectiveDate: policyEffectiveDate,
    });
    if (!parsed.success) {
      setLifecycleError("Vui lòng kiểm tra thông tin chính sách, lý do và ngày hiệu lực.");
      return;
    }
    setLifecycleError("");
    setPendingPolicy(parsed.data);
  };

  const submitContinuation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const optionalAmount = (value: string) => value.trim() ? Number(value) : undefined;
    const deposit = optionalAmount(continuationDeposit);
    const installationFee = optionalAmount(continuationInstallationFee);
    const paygPrice = optionalAmount(continuationPaygPrice);
    const parsed = ContractContinuationRequestSchema.safeParse({
      startDate: continuationStartDate,
      endDate: continuationEndDate,
      terms: continuationTerms,
      monthlyRentalFee: Number(continuationMonthlyFee),
      ...(deposit === undefined ? {} : { depositAmount: deposit }),
      ...(installationFee === undefined ? {} : { installationFee }),
      ...(paygPrice === undefined ? {} : { paygUnitPrice: paygPrice }),
      ...(contract.data?.offlineLimitMinutes == null ? {} : { offlineLimitMinutes: contract.data.offlineLimitMinutes }),
      ...(contract.data?.contractTermsSnapshot ? { contractTermsSnapshot: {
        ...contract.data.contractTermsSnapshot,
        paymentDestinationReference: contract.data.contractTermsSnapshot.paymentDestinationReference ?? undefined,
        offlineLimitMinutes: contract.data.contractTermsSnapshot.offlineLimitMinutes ?? undefined,
      } } : {}),
    });
    if (!parsed.success) {
      setLifecycleError("Vui lòng kiểm tra thời hạn, điều khoản và các khoản phí của hợp đồng tiếp nối.");
      return;
    }
    setLifecycleError("");
    setPendingContinuation(parsed.data);
  };

  const busy = amendPolicy.isPending || continueContract.isPending;
  const ownerName = owner.data?.fullName ?? `${T.COMMON.OWNER} ${contract.data?.ownerId.slice(0, 8) ?? ""}`;
  const matchingInstallationOrders = contract.data
    ? (installationWorkOrders.data ?? [])
      .filter((workOrder) =>
        workOrder.ownerId === contract.data!.ownerId &&
        workOrder.contractId === contract.data!.id &&
        workOrder.machineId === contract.data!.machineId,
      )
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    : [];

  return (
    <>
      <div className={styles.pageContent}>
        <BackButtonHeading
          title={contract.data ? `${T.CONTRACTS.DETAIL} · ${contract.data.id.slice(0, 8).toUpperCase()}` : MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DETAIL_TITLE}
          titleId="moderator-contract-detail-title"
          description={T.CONTRACTS.DESCRIPTION}
          className={styles.pageHeading}
          back={{ label: "Danh sách hợp đồng", fallbackHref: PATH_MODERATOR.CONTRACTS }}
        />
        {!validId && <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UNAVAILABLE}</div>}
        {validId && <QueryFeedback query={contract} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACT} />}
        {contract.isError && <div className={`${adminStyles.notice} ${adminStyles.errorNotice}`} role="alert">
          <p>{getApiErrorMessage(contract.error)}</p>
          <ButtonBar type="button" onClick={() => void contract.refetch()}>{T.COMMON.RETRY}</ButtonBar>
        </div>}
        {contract.data && !contract.isError && <>
          <div className={adminStyles.contractDetailLayout}>
          <section className={`${adminStyles.panel} ${adminStyles.contractOverviewPanel}`}>
            <div className={adminStyles.contractOverviewHeading}>
              <h2>{T.CONTRACTS.DETAIL}</h2>
              <StatusBadge status={contract.data.status}>{contractStatus(contract.data.status)}</StatusBadge>
            </div>
            <div className={adminStyles.operationsGrid}>
              <div><span>Mã hợp đồng</span><strong><TruncatedId value={contract.data.id} /></strong></div>
              <div><span>{T.COMMON.OWNER}</span><strong>{ownerName}</strong></div>
              <div><span>Mã máy</span><strong>{contract.data.machineId ? <TruncatedId value={contract.data.machineId} /> : T.CONTRACTS.NO_MACHINE}</strong></div>
              <div><span>Thời hạn</span><strong>{date(contract.data.startDate)} – {date(contract.data.endDate)}</strong></div>
              <div><span>Loại máy</span><strong>{contract.data.machineTypeSnapshot ?? "—"}</strong></div>
              <div><span>Phí thuê hàng tháng</span><strong>{money(contract.data.monthlyRentalFee)}</strong></div>
              <div><span>Giá PAYG</span><strong>{money(contract.data.paygUnitPrice)}</strong></div>
              <div><span>Tiền cọc</span><strong>{money(contract.data.depositAmount)}</strong></div>
              <div><span>Phí lắp đặt</span><strong>{money(contract.data.installationFee)}</strong></div>
              <div><span>Giới hạn offline</span><strong>{contract.data.offlineLimitMinutes == null ? "—" : `${contract.data.offlineLimitMinutes} phút`}</strong></div>
              <div><span>Ngưỡng mất kết nối</span><strong>{contract.data.contractTermsSnapshot ? `${contract.data.contractTermsSnapshot.heartbeatToleranceSeconds ?? 45} giây` : "Chưa có chính sách"}</strong></div>
            </div>
            {(contract.data.termsSnapshot ?? contract.data.terms) && <p className={adminStyles.panelSubtitle}>{contract.data.termsSnapshot ?? contract.data.terms}</p>}
          </section>

          <section className={`${adminStyles.panel} ${adminStyles.contractExpiryPanel}`}>
            <h2>Trạng thái hết hạn</h2>
            <QueryFeedback query={expiry} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACT} />
            {expiry.data && !expiry.isError && <div className={adminStyles.operationsGrid}>
              <div><span>Ngày hết hạn</span><strong>{date(expiry.data.expiryDate)}</strong></div>
              <div><span>Ngày nhắc Owner</span><strong>{date(expiry.data.reminderDate)}</strong></div>
              <div><span>Đã gửi nhắc lúc</span><strong>{dateTime(expiry.data.reminderSentAt)}</strong></div>
              <div><span>Quyết định</span><strong>{expiry.data.decision ?? "Chưa có"}</strong></div>
              <div><span>Thời điểm quyết định</span><strong>{dateTime(expiry.data.decidedAt)}</strong></div>
              <div><span>Đã xử lý hết hạn</span><strong>{dateTime(expiry.data.expiryProcessedAt)}</strong></div>
            </div>}
            <p className={adminStyles.panelSubtitle}>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_READ_ONLY}</p>
          </section>

          <section className={`${adminStyles.panel} ${adminStyles.contractHistoryPanel}`}>
            <h2>Lịch sử chính sách</h2>
            <QueryFeedback query={policyHistory} loadingMessage={T.COMMON.LOADING} />
            {policyHistory.data && policyHistory.data.length === 0 && !policyHistory.isError && <p className={adminStyles.emptyText}>{T.COMMON.EMPTY}</p>}
            {policyHistory.data && policyHistory.data.length > 0 && <DataTable
              headerVariant="admin"
              rows={policyHistory.data}
              rowKey={(item) => item.id}
              columns={[
                { key: "version", header: "Phiên bản", render: (item) => item.version, align: "center" },
                { key: "effective", header: "Hiệu lực từ", render: (item) => date(item.effectiveDate) },
                { key: "reason", header: "Lý do", render: (item) => item.reason },
                { key: "actor", header: "Vai trò cập nhật", render: (item) => item.actorRole },
              ]}
            />}
          </section>

          {lifecycleView === "amend" && <form onChange={() => setLifecycleDirty(true)} id="moderator-contract-policy-amend-form" className={`${adminStyles.panel} ${adminStyles.contractLifecyclePanel}`} onSubmit={submitPolicyAmendment}>
            <h2>Điều chỉnh chính sách</h2>
            {policySnapshot ? <>
              <p className={adminStyles.panelSubtitle}>Chỉnh điều khoản bằng các trường nhập. Chính sách cũ vẫn nằm trong lịch sử; máy chủ ghi nhận phiên bản mới sau khi xác nhận.</p>
              <div className={adminStyles.operationsGrid}>
                <label>Phiên bản hiện tại<input value={policySnapshot.policyVersion} readOnly /></label>
                <label>Chu kỳ bảo trì (tháng) *<input type="number" min={1} max={24} step={1} required value={policySnapshot.maintenanceIntervalMonths} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, maintenanceIntervalMonths: event.target.value } : current)} /></label>
                <label>Cửa sổ bảo trì (ngày) *<input type="number" min={0} max={30} step={1} required value={policySnapshot.maintenanceWindowDays} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, maintenanceWindowDays: event.target.value } : current)} /></label>
                <label>Trách nhiệm chi phí sửa chữa *<select required value={policySnapshot.repairCostResponsibility} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, repairCostResponsibility: event.target.value as ContractPolicyDraft["repairCostResponsibility"] } : current)}>
                  <option value="TENANT">Khách thuê / Owner</option><option value="COMPANY">Công ty Dolores</option><option value="UNKNOWN">Chưa xác định</option>
                </select></label>
                <label>Số ngày đến hạn thanh toán *<input type="number" min={1} max={60} step={1} required value={policySnapshot.paymentDueEligibleDays} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, paymentDueEligibleDays: event.target.value } : current)} /></label>
                <label>Mã tham chiếu thanh toán<input maxLength={128} value={policySnapshot.paymentDestinationReference ?? ""} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, paymentDestinationReference: event.target.value } : current)} /></label>
                <label>Hành động khi vi phạm offline *<select required value={policySnapshot.offlineViolationAction} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, offlineViolationAction: event.target.value as ContractPolicyDraft["offlineViolationAction"] } : current)}>
                  <option value="WARN_ONLY">Chỉ cảnh báo</option><option value="MANUAL_REVIEW">Duyệt thủ công</option>
                </select></label>
                <label>Ngưỡng mất kết nối (giây) *<input type="number" required min={5} max={86400} step={1} value={policySnapshot.heartbeatToleranceSeconds} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, heartbeatToleranceSeconds: event.target.value } : current)} /></label>
                <label>Giới hạn offline (phút)<input type="number" min={1} step={1} value={policySnapshot.offlineLimitMinutes} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, offlineLimitMinutes: event.target.value } : current)} /></label>
                <label className={adminStyles.contractCheckbox}><input type="checkbox" checked={policySnapshot.buybackEnabled} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, buybackEnabled: event.target.checked } : current)} /> Cho phép thu mua máy cũ</label>
                <label>Số tháng tối thiểu để thu mua *<input type="number" min={0} max={120} step={1} required disabled={!policySnapshot.buybackEnabled} value={policySnapshot.buybackMinimumMonths} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, buybackMinimumMonths: event.target.value } : current)} /></label>
                <label>Phương pháp định giá<input value="Thẩm định thủ công" readOnly /></label>
              </div>
              <div className={adminStyles.operationsGrid}>
                <div className={adminStyles.contractCheckboxGroup} role="group" aria-labelledby="moderator-replacement-types-label">
                  <strong id="moderator-replacement-types-label">Loại máy thay thế được phép *</strong>
                  {(["CONVENTIONAL", "SMART_IOT"] as const).map((machineType) => <label className={adminStyles.contractCheckbox} key={machineType}>
                    <input type="checkbox" checked={policySnapshot.allowedReplacementMachineTypes.includes(machineType)} onChange={(event) => setPolicySnapshot((current) => {
                      if (!current) return current;
                      const next = event.target.checked
                        ? [...new Set([...current.allowedReplacementMachineTypes, machineType])]
                        : current.allowedReplacementMachineTypes.filter((item) => item !== machineType);
                      return next.length > 0 ? { ...current, allowedReplacementMachineTypes: next } : current;
                    })} />
                    {machineType === "SMART_IOT" ? "Máy Smart IoT" : "Máy thường"}
                  </label>)}
                </div>
              </div>
              <div className={adminStyles.operationsGrid}>
                <label>Lý do *<textarea required maxLength={1000} value={policyReason} onChange={(event) => setPolicyReason(event.target.value)} /></label>
                <label>Ngày hiệu lực *<input type="date" required value={policyEffectiveDate} onChange={(event) => setPolicyEffectiveDate(event.target.value)} /></label>
              </div>
            </> : <div className={adminStyles.notice} role="note">Hợp đồng chưa có snapshot chính sách hợp lệ để tạo bản sửa đổi.</div>}
            {lifecycleError && <p className={adminStyles.accountInlineWarning} role="alert">{lifecycleError}</p>}
            {amendPolicy.isError && <p className={adminStyles.accountInlineWarning} role="alert">{getApiErrorMessage(amendPolicy.error, "mutation")}</p>}
          </form>}

          {lifecycleView === "continue" && <form onChange={() => setLifecycleDirty(true)} id="moderator-contract-continuation-form" className={`${adminStyles.panel} ${adminStyles.contractLifecyclePanel}`} onSubmit={submitContinuation}>
            <h2>Tạo hợp đồng tiếp nối</h2>
            <p className={adminStyles.panelSubtitle}>Owner, máy và snapshot chính sách được kế thừa từ hợp đồng cũ. Máy chủ kiểm tra điều kiện trước khi tạo hợp đồng mới ở trạng thái nháp.</p>
            <div className={adminStyles.operationsGrid}>
              <label>Ngày bắt đầu *<input type="date" required value={continuationStartDate} onChange={(event) => setContinuationStartDate(event.target.value)} /></label>
              <label>Ngày kết thúc *<input type="date" required value={continuationEndDate} onChange={(event) => setContinuationEndDate(event.target.value)} /></label>
              <label>Phí thuê hàng tháng (VND) *<input type="number" min="0" step="any" required value={continuationMonthlyFee} onChange={(event) => setContinuationMonthlyFee(event.target.value)} /></label>
              <label>Tiền cọc (VND)<input type="number" min="0" step="any" value={continuationDeposit} onChange={(event) => setContinuationDeposit(event.target.value)} /></label>
              <label>Phí lắp đặt (VND)<input type="number" min="0" step="any" value={continuationInstallationFee} onChange={(event) => setContinuationInstallationFee(event.target.value)} /></label>
              <label>Giá PAYG (VND)<input type="number" min="0" step="any" value={continuationPaygPrice} onChange={(event) => setContinuationPaygPrice(event.target.value)} /></label>
              <label>Điều khoản *<textarea required maxLength={4000} value={continuationTerms} onChange={(event) => setContinuationTerms(event.target.value)} /></label>
            </div>
            {lifecycleError && <p className={adminStyles.accountInlineWarning} role="alert">{lifecycleError}</p>}
            {continueContract.isError && <p className={adminStyles.accountInlineWarning} role="alert">{getApiErrorMessage(continueContract.error, "mutation")}</p>}
          </form>}

          <section className={`${adminStyles.panel} ${adminStyles.contractDocumentsPanel}`} aria-labelledby="moderator-contract-documents">
            <h2 id="moderator-contract-documents">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOCUMENTS}</h2>
            <QueryFeedback query={documents} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_DOCUMENTS} />
            {documents.data?.length === 0 && !documents.isError && <p className={adminStyles.emptyText} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_DOCUMENTS}</p>}
            {contract.data.status === "DRAFT" && <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); if (documentFile) uploadMainContract.mutate(documentFile); }}>
              <label className={styles.formField} htmlFor="moderator-main-contract-file">
                <span>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD_MAIN}</span>
                <input key={uploadMainContract.data?.id ?? "main-contract-file"} id="moderator-main-contract-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={uploadMainContract.isPending} onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />
              </label>
              <ButtonBar type="submit" disabled={!documentFile || uploadMainContract.isPending}>{uploadMainContract.isPending ? MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOADING : MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD}</ButtonBar>
              {uploadMainContract.isError && <p role="alert">{getApiErrorMessage(uploadMainContract.error)}</p>}
              {uploadMainContract.isSuccess && <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UPLOAD_SUCCESS}</p>}
            </form>}
            {downloadError && <p className={adminStyles.accountInlineWarning} role="alert">{downloadError}</p>}
            {documents.data && documents.data.length > 0 && <DataTable
              headerVariant="admin"
              rows={documents.data}
              rowKey={(item) => item.id}
              columns={[
                { key: "file", header: "Tệp", render: (item) => item.originalFilename },
                { key: "type", header: "Loại", render: (item) => item.documentType },
                { key: "version", header: "Phiên bản", render: (item) => `v${item.version}` },
                { key: "uploaded", header: "Ngày tải", render: (item) => item.archivedAt ? "Đã lưu trữ" : dateTime(item.uploadedAt) },
                { key: "action", header: "", render: (item) => <ProgressDownloadButton
                  filename={item.originalFilename}
                  download={(signal, onProgress) => {
                    setDownloadError(null);
                    return contractsApi.downloadDocument(id, item.id, signal, onProgress);
                  }}
                  onError={(error) => setDownloadError(getApiErrorMessage(error))}
                >{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOWNLOAD}</ProgressDownloadButton> },
              ]}
            />}
          </section>
          </div>

          <ContractActivationPanel contract={contract.data} />
          {contract.data.status === "ACTIVE" && <section className={adminStyles.panel} aria-labelledby="moderator-contract-installation-history">
            <h2 id="moderator-contract-installation-history">Điều phối lắp đặt</h2>
            <p className={adminStyles.panelSubtitle}>Các lệnh lắp đặt khớp với hợp đồng, máy và chủ sở hữu này. Mở chi tiết để xem checklist, bàn giao và chứng cứ.</p>
            <QueryFeedback query={installationWorkOrders} loadingMessage="Đang tải lệnh lắp đặt…" />
            {installationWorkOrders.data && matchingInstallationOrders.length === 0 && !installationWorkOrders.isError && (
              <p className={adminStyles.emptyText} role="status">Chưa tìm thấy lệnh lắp đặt thuộc hợp đồng này.</p>
            )}
            {matchingInstallationOrders.length > 0 && <DataTable
              headerVariant="admin"
              rows={matchingInstallationOrders}
              rowKey={(item) => item.id}
              columns={[
                { key: "work-order", header: "Mã lệnh", render: (item) => <code title={item.id}>{item.id.slice(0, 8).toUpperCase()}</code> },
                { key: "status", header: "Trạng thái", render: (item) => installationWorkOrderStatus(item.status) },
                { key: "technician", header: "Kỹ thuật viên", render: (item) => item.assignedTechnicianId ? <code title={item.assignedTechnicianId}>{item.assignedTechnicianId.slice(0, 8).toUpperCase()}</code> : "Chưa phân công" },
                { key: "scheduled", header: "Lịch hẹn", render: (item) => dateTime(item.scheduledFor) },
                { key: "completed", header: "Hoàn tất", render: (item) => dateTime(item.completedAt) },
                { key: "action", header: "", render: (item) => <ButtonBar href={PATH_MODERATOR.TECHNICAL_REQUEST_DETAIL(item.id)}>Mở chi tiết lệnh</ButtonBar> },
              ]}
            />}
          </section>}
        </>}
      </div>
      {contract.data && <PageActions actions={buildContractDetailActions({
        status: contract.data.status, machineId: contract.data.machineId, hasSnapshot: Boolean(contract.data.contractTermsSnapshot), lifecycleView,
        dirty: lifecycleDirty, pending: busy, formId: lifecycleView === "amend" ? "moderator-contract-policy-amend-form" : "moderator-contract-continuation-form",
        terminationHref: PATH_MODERATOR.CONTRACT_TERMINATION(contract.data.id),
        onCancel: () => { setLifecycleView(null); setLifecycleError(""); setLifecycleDirty(false); },
        onAmend: () => { setLifecycleError(""); setLifecycleDirty(false); setLifecycleView("amend"); },
        onContinue: () => { setLifecycleError(""); setLifecycleDirty(false); setLifecycleView("continue"); },
        onHistory: () => void router.push(PATH_MODERATOR.CONTRACT_HISTORY(contract.data!.id)),
      })} />}
      {(pendingPolicy || pendingContinuation) && <NotificationDialog
        variant="confirm"
        title={pendingPolicy ? "Xác nhận điều chỉnh chính sách?" : "Tạo hợp đồng tiếp nối dạng nháp?"}
        description={pendingPolicy
          ? `Chính sách mới có hiệu lực từ ${date(pendingPolicy.effectiveDate)}. Phiên bản hiện tại sẽ được lưu vào lịch sử.`
          : "Hợp đồng tiếp nối sẽ kế thừa Owner và máy. Máy chủ kiểm tra điều kiện trước khi tạo bản nháp mới."}
        primaryAction={{
          label: "Xác nhận",
          pending: busy,
          pendingLabel: "Đang gửi…",
          onClick: () => {
            if (pendingPolicy) amendPolicy.mutate(pendingPolicy);
            else if (pendingContinuation) continueContract.mutate(pendingContinuation);
          },
        }}
        secondaryAction={{ label: "Quay lại", disabled: busy, onClick: () => { setPendingPolicy(null); setPendingContinuation(null); } }}
        onClose={() => { if (!busy) { setPendingPolicy(null); setPendingContinuation(null); } }}
        closeOnEscape={!busy}
      >
        {lifecycleError && <p className={adminStyles.accountInlineWarning} role="alert">{lifecycleError}</p>}
      </NotificationDialog>}
      {continuedContractId && <NotificationDialog
        variant="success"
        title="Đã tạo hợp đồng tiếp nối"
        description={`Mã hợp đồng mới: ${continuedContractId}`}
        primaryAction={{ label: "Mở hợp đồng", onClick: () => { const nextId = continuedContractId; setContinuedContractId(""); void router.push(`${PATH_MODERATOR.CONTRACTS}/${encodeURIComponent(nextId)}`); } }}
        onClose={() => setContinuedContractId("")}
      />}
    </>
  );
}

