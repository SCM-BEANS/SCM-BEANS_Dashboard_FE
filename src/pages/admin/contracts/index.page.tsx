import { buildContractDetailActions } from "@/components/action-bar/entity-page-actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useState, type FormEvent } from "react";
import { contractsApi } from "@/apis/contracts.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { profilesApi } from "@/apis/profiles.api";
import { ContractIdSchema } from "@/schema/contracts.schema";
import {
  ContractContinuationRequestSchema,
  ContractPolicyAmendmentRequestSchema,
  type ContractContinuationRequest,
  type ContractPolicyAmendmentRequest,
} from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { ContractCreateForm } from "@/components/create-form/contract-create-form";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { ContractTable } from "@/components/table/contract-table";
import { TableFilters } from "@/components/table/table-filters";
import { ContractActivationPanel } from "@/components/contracts/contract-activation-panel";
import { DataTable } from "@/components/table/data-table";
import { PageActions } from "@/components/action-bar/page-actions";
import { PATH_ADMIN } from "@/routes/path";
import { ContractInstallationRequestScreen } from "@/pages/moderator/contracts/contract-installation-request-screen";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getContractsBackDestination } from "../admin-back-destination";
import {
  ADMIN_CONTRACT_LIST_DESCRIPTION,
  ADMIN_CONTRACT_LIST_TITLE,
} from "@/components/table/constants/contract-table.constants";

const queryValue = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
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
  return value == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value);
}
function status(value: string): string {
  if (value === "ACTIVE") return T.CONTRACTS.ACTIVE;
  if (value === "DRAFT") return T.CONTRACTS.DRAFT;
  return T.CONTRACTS.TERMINATED;
}

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

function ContractsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createdContractId, setCreatedContractId] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [contractSearchDraft, setContractSearchDraft] = useState("");
  const [contractStatusDraft, setContractStatusDraft] = useState("");
  const [contractTypeDraft, setContractTypeDraft] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState("");
  const [contractPage, setContractPage] = useState(1);
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
  const view = queryValue(router.query.view);
  const isContractList = view === "" || view === "list";
  const isInstallationRequest = view === "installation-request";
  const contractId = queryValue(router.query.id);
  const machineId = queryValue(router.query.machineId);
  const contracts = useQuery({ queryKey: ["dolores", "contracts"], queryFn: ({ signal }) => contractsApi.list(signal), enabled: view === "" || view === "list" });
  const owners = useQuery({
    queryKey: ["dolores", "profiles", "owner-directory"],
    queryFn: async ({ signal }) => {
      const first = await profilesApi.list({ role: "OWNER", page: 0, size: 100 }, signal);
      const pages = [first];
      for (let index = 1; index < first.totalPages; index += 5) {
        const numbers = Array.from({ length: Math.min(5, first.totalPages - index) }, (_, offset) => index + offset);
        pages.push(...await Promise.all(numbers.map((page) => profilesApi.list({ role: "OWNER", page, size: 100 }, signal))));
        if (signal?.aborted) break;
      }
      return pages.flatMap((page) => page.items);
    },
  });
  const contract = useQuery({ queryKey: ["dolores", "contract", contractId], queryFn: ({ signal }) => contractsApi.getById(contractId, signal), enabled: view === "detail" && ContractIdSchema.safeParse(contractId).success });
  const policyHistory = useQuery({ queryKey: ["dolores", "contract-policy-history", contractId], queryFn: ({ signal }) => contractsApi.getPolicyHistory(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const expiry = useQuery({ queryKey: ["dolores", "contract-expiry", contractId], queryFn: ({ signal }) => contractsApi.getExpiry(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const documents = useQuery({ queryKey: ["dolores", "contract-documents", contractId], queryFn: ({ signal }) => contractsApi.getDocuments(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const history = useQuery({ queryKey: ["dolores", "machine-contract-history", machineId], queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId, signal), enabled: view === "history" && ContractIdSchema.safeParse(machineId).success });
  const contractPolicySnapshot = contract.data?.contractTermsSnapshot;
  const policyDraft = contractPolicySnapshot ? {
    ...contractPolicySnapshot,
    maintenanceIntervalMonths: String(contractPolicySnapshot.maintenanceIntervalMonths),
    maintenanceWindowDays: String(contractPolicySnapshot.maintenanceWindowDays),
    paymentDueEligibleDays: String(contractPolicySnapshot.paymentDueEligibleDays),
    offlineLimitMinutes: contractPolicySnapshot.offlineLimitMinutes == null ? "" : String(contractPolicySnapshot.offlineLimitMinutes),
    heartbeatToleranceSeconds: String(contractPolicySnapshot.heartbeatToleranceSeconds ?? 45),
    buybackMinimumMonths: String(contractPolicySnapshot.buybackMinimumMonths),
  } : null;
  const policyFormDirty = Boolean(contract.data && (
    JSON.stringify(policySnapshot) !== JSON.stringify(policyDraft)
    || policyReason !== ""
    || policyEffectiveDate !== (contract.data.endDate ?? new Date().toISOString().slice(0, 10))
  ));
  const continuationFormDirty = Boolean(contract.data && (
    continuationStartDate !== (contract.data.endDate ?? "")
    || continuationEndDate !== ""
    || continuationTerms !== (contract.data.terms ?? "")
    || continuationMonthlyFee !== (contract.data.monthlyRentalFee == null ? "" : String(contract.data.monthlyRentalFee))
    || continuationDeposit !== (contract.data.depositAmount == null ? "" : String(contract.data.depositAmount))
    || continuationInstallationFee !== (contract.data.installationFee == null ? "" : String(contract.data.installationFee))
    || continuationPaygPrice !== (contract.data.paygUnitPrice == null ? "" : String(contract.data.paygUnitPrice))
  ));
  useEffect(() => {
    if (!contract.data) return;
    const snapshot = contract.data.contractTermsSnapshot;
    setPolicySnapshot(snapshot ? {
      ...snapshot,
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
    mutationFn: (input: ContractPolicyAmendmentRequest) => contractsApi.amendPolicy(contractId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(["dolores", "contract", contractId], updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-policy-history", contractId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] }),
      ]);
      setPendingPolicy(null);
      setLifecycleView(null);
    },
    onError: (error: unknown) => setLifecycleError(getApiErrorMessage(error, "mutation")),
  });
  const continueContract = useMutation({
    mutationFn: (input: ContractContinuationRequest) => contractsApi.continueContract(contractId, input),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] });
      setPendingContinuation(null);
      setLifecycleView(null);
      setCreatedContractId(created.id);
      await router.push({ pathname: "/admin/contracts" }, undefined, { shallow: true });
    },
    onError: (error: unknown) => setLifecycleError(getApiErrorMessage(error, "mutation")),
  });
  const submitPolicyAmendment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const snapshot = policySnapshot ? (() => {
      const {
        maintenanceIntervalMonths,
        maintenanceWindowDays,
        paymentDueEligibleDays,
        offlineLimitMinutes,
        heartbeatToleranceSeconds,
        buybackMinimumMonths,
        ...rest
      } = policySnapshot;
      return {
        ...rest,
        maintenanceIntervalMonths: Number(maintenanceIntervalMonths),
        maintenanceWindowDays: Number(maintenanceWindowDays),
        paymentDueEligibleDays: Number(paymentDueEligibleDays),
        ...(offlineLimitMinutes.trim() ? { offlineLimitMinutes: Number(offlineLimitMinutes) } : {}),
        heartbeatToleranceSeconds: Number(heartbeatToleranceSeconds),
        buybackMinimumMonths: Number(buybackMinimumMonths),
      };
    })() : null;
    const parsed = ContractPolicyAmendmentRequestSchema.safeParse({
      snapshot,
      reason: policyReason,
      effectiveDate: policyEffectiveDate,
    });
    if (!parsed.success) { setLifecycleError("Kiểm tra snapshot, lý do và ngày hiệu lực của chính sách."); return; }
    setLifecycleError("");
    setPendingPolicy(parsed.data);
  };
  const submitContinuation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const toOptionalAmount = (value: string) => value.trim() ? Number(value) : undefined;
    const parsed = ContractContinuationRequestSchema.safeParse({
      startDate: continuationStartDate,
      endDate: continuationEndDate,
      terms: continuationTerms,
      monthlyRentalFee: Number(continuationMonthlyFee),
      ...(toOptionalAmount(continuationDeposit) === undefined ? {} : { depositAmount: toOptionalAmount(continuationDeposit) }),
      ...(toOptionalAmount(continuationInstallationFee) === undefined ? {} : { installationFee: toOptionalAmount(continuationInstallationFee) }),
      ...(toOptionalAmount(continuationPaygPrice) === undefined ? {} : { paygUnitPrice: toOptionalAmount(continuationPaygPrice) }),
      ...(contract.data?.offlineLimitMinutes ? { offlineLimitMinutes: contract.data.offlineLimitMinutes } : {}),
      ...(contract.data?.contractTermsSnapshot ? { contractTermsSnapshot: contract.data.contractTermsSnapshot } : {}),
    });
    if (!parsed.success) { setLifecycleError("Kiểm tra thời hạn, điều khoản và các khoản phí của hợp đồng tiếp nối."); return; }
    setLifecycleError("");
    setPendingContinuation(parsed.data);
  };
  const navigate = (query?: Record<string, string>) => {
    if (query?.view === "create") {
      setCreatedContractId("");
    }
    void router.push({ pathname: "/admin/contracts", query }, undefined, { shallow: true });
  };
  const ownerName = (id: string) => {
    if (owners.isPending) return T.COMMON.LOADING;
    return owners.data?.find((item) => item.idaasUserId === id)?.fullName ?? "—";
  };
  const filteredContracts = (contracts.data ?? []).filter((item) => {
    const searchValue = contractSearch.trim().toLocaleLowerCase();
    const searchableText = [item.id, item.ownerId, ownerName(item.ownerId), item.machineTypeSnapshot ?? ""]
      .join(" ")
      .toLocaleLowerCase();
    return (!searchValue || searchableText.includes(searchValue))
      && (!contractStatusFilter || item.status === contractStatusFilter)
      && (!contractTypeFilter || item.machineTypeSnapshot === contractTypeFilter);
  });
  const contractPageSize = 10;
  const contractTotalPages = Math.max(1, Math.ceil(filteredContracts.length / contractPageSize));
  const visibleContracts = filteredContracts.slice((contractPage - 1) * contractPageSize, contractPage * contractPageSize);
  const submitContractFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContractSearch(contractSearchDraft.trim());
    setContractStatusFilter(contractStatusDraft);
    setContractTypeFilter(contractTypeDraft);
    setContractPage(1);
  };
  const pageTitle = view === "create"
    ? T.CONTRACTS.CREATE_TITLE
    : isInstallationRequest
      ? "Tạo yêu cầu lắp đặt"
    : view === "history"
      ? T.CONTRACTS.HISTORY
      : view === "detail"
        ? `${T.CONTRACTS.DETAIL} · ${contractId.slice(0, 8).toUpperCase()}`
        : isContractList
          ? ADMIN_CONTRACT_LIST_TITLE
          : T.CONTRACTS.TITLE;

  if (isInstallationRequest) {
    return (
      <ContractInstallationRequestScreen
        contractId={contractId}
        backHref={PATH_ADMIN.CONTRACTS}
      />
    );
  }

  return <>
  <div className={`${styles.pageContent} ${styles.userPage}`}>
    {isContractList ? <div className={`${styles.pageHeading} ${styles.userPageHeading}`}>
      <div>
        <h1 id="admin-contracts-title">{ADMIN_CONTRACT_LIST_TITLE}</h1>
        <p>{ADMIN_CONTRACT_LIST_DESCRIPTION}</p>
      </div>
      <ButtonBar variant="primary" onClick={() => navigate({ view: "create" })}>{T.CONTRACTS.CREATE}</ButtonBar>
    </div> : <BackButtonHeading
      title={pageTitle}
      titleId="admin-contracts-title"
      description={view === "create"
        ? T.CONTRACTS.CREATE_DESCRIPTION
        : isContractList
          ? ADMIN_CONTRACT_LIST_DESCRIPTION
          : T.CONTRACTS.DESCRIPTION}
      className={styles.pageHeading}
      back={getContractsBackDestination(router.query)}
    />}
    {isContractList && <section className={`${styles.panel} ${styles.contractListPanel}`} aria-labelledby="admin-contract-list-panel-title">
      <div className={styles.userSectionHeading}>
        <h2 id="admin-contract-list-panel-title">Danh sách hợp đồng</h2>
        {contracts.data && <span className={styles.contractListCount}>{filteredContracts.length.toLocaleString("vi-VN")} hợp đồng</span>}
      </div>
      <TableFilters
        search={{
          ariaLabel: "Tìm hợp đồng",
          maxLength: 100,
          placeholder: "Tìm mã hợp đồng hoặc khách hàng",
          value: contractSearchDraft,
          onChange: setContractSearchDraft,
        }}
        selects={[
          {
            id: "contract-status-filter",
            ariaLabel: "Lọc hợp đồng theo trạng thái",
            value: contractStatusDraft,
            options: [
              { value: "", label: "Tất cả trạng thái" },
              { value: "ACTIVE", label: T.CONTRACTS.ACTIVE },
              { value: "DRAFT", label: T.CONTRACTS.DRAFT },
              { value: "TERMINATED", label: T.CONTRACTS.TERMINATED },
            ],
            onChange: setContractStatusDraft,
          },
          {
            id: "contract-machine-type-filter",
            ariaLabel: "Lọc hợp đồng theo loại máy",
            value: contractTypeDraft,
            options: [
              { value: "", label: "Tất cả loại máy" },
              { value: "CONVENTIONAL", label: T.MACHINES.CONVENTIONAL },
              { value: "SMART_IOT", label: T.MACHINES.SMART },
            ],
            onChange: setContractTypeDraft,
          },
        ]}
        submitLabel="Tìm kiếm"
        onSubmit={submitContractFilters}
      />
      {contracts.isPending && <p role="status">{T.COMMON.LOADING}</p>}
      {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contracts.error)}</p><ButtonBar type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contracts.data?.length === 0 && !contracts.isError && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
      {contracts.data && contracts.data.length > 0 && filteredContracts.length === 0 && <p className={styles.emptyText}>Không tìm thấy hợp đồng phù hợp bộ lọc.</p>}
      {visibleContracts.length > 0 &&
        <ContractTable
          contracts={visibleContracts}
          headerVariant="admin"
          ownerHeader="Khách hàng"
          ownerName={ownerName}
          contractHref={(id) => `/admin/contracts?view=detail&id=${encodeURIComponent(id)}`}
          draftStatusHref={(id) => `/admin/contracts?view=installation-request&id=${encodeURIComponent(id)}`}
        />
      }
      {filteredContracts.length > 0 && <div className={styles.accountPagination}>
        <span>{(contractPage - 1) * contractPageSize + 1}–{Math.min(contractPage * contractPageSize, filteredContracts.length)} / {filteredContracts.length} hợp đồng</span>
        <div>
          <button className={styles.accountSecondaryButton} type="button" disabled={contractPage <= 1} onClick={() => setContractPage((page) => Math.max(1, page - 1))}>Trang trước</button>
          <span>Trang {contractPage}/{contractTotalPages}</span>
          <button className={styles.accountSecondaryButton} type="button" disabled={contractPage >= contractTotalPages} onClick={() => setContractPage((page) => Math.min(contractTotalPages, page + 1))}>Trang sau</button>
        </div>
      </div>}
    </section>}
    {view === "create" && <ContractCreateForm
      onCancel={() => void router.push({ pathname: "/admin/contracts" }, undefined, { shallow: true })}
      onCreated={(id) => {
        setCreatedContractId(id);
        void router.push({ pathname: "/admin/contracts" }, undefined, { shallow: true });
      }}
    />}
    {view === "detail" && <>
      {!ContractIdSchema.safeParse(contractId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã hợp đồng không hợp lệ.</div>}
      {contract.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {contract.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contract.error)}</p><ButtonBar type="button" onClick={() => void contract.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contract.data && <>
        <div className={styles.contractDetailLayout}>
        <section className={`${styles.panel} ${styles.contractOverviewPanel}`}><div className={styles.contractOverviewHeading}><h2>{T.CONTRACTS.DETAIL}</h2><StatusBadge status={contract.data.status}>{status(contract.data.status)}</StatusBadge></div><div className={styles.operationsGrid}>
          <div><span>Mã hợp đồng</span><strong><TruncatedId value={contract.data.id} /></strong></div><div><span>{T.COMMON.OWNER}</span><strong>{ownerName(contract.data.ownerId)}</strong></div>
          <div><span>Mã máy</span><strong>{contract.data.machineId ? <TruncatedId value={contract.data.machineId} /> : T.CONTRACTS.NO_MACHINE}</strong></div>
          <div><span>Thời hạn</span><strong>{date(contract.data.startDate)} – {date(contract.data.endDate)}</strong></div><div><span>Loại máy</span><strong>{contract.data.machineTypeSnapshot ?? "—"}</strong></div>
          <div><span>Phí thuê hàng tháng</span><strong>{money(contract.data.monthlyRentalFee)}</strong></div><div><span>Giá PAYG</span><strong>{money(contract.data.paygUnitPrice)}</strong></div>
          <div><span>Tiền cọc</span><strong>{money(contract.data.depositAmount)}</strong></div><div><span>Phí lắp đặt</span><strong>{money(contract.data.installationFee)}</strong></div>
          <div><span>Giới hạn offline</span><strong>{contract.data.offlineLimitMinutes == null ? "—" : `${contract.data.offlineLimitMinutes} phút`}</strong></div>
          <div><span>Ngưỡng mất kết nối</span><strong>{contract.data.contractTermsSnapshot ? `${contract.data.contractTermsSnapshot.heartbeatToleranceSeconds ?? 45} giây` : "Chưa có chính sách"}</strong></div>
        </div>
        {(contract.data.termsSnapshot ?? contract.data.terms) && <p className={styles.panelSubtitle}>{contract.data.termsSnapshot ?? contract.data.terms}</p>}</section>
        <section className={`${styles.panel} ${styles.contractExpiryPanel}`}><h2>Trạng thái hết hạn</h2>
          {expiry.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {expiry.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(expiry.error)} <ButtonBar type="button" onClick={() => void expiry.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {expiry.data && <div className={styles.operationsGrid}><div><span>Ngày hết hạn</span><strong>{date(expiry.data.expiryDate)}</strong></div><div><span>Ngày nhắc</span><strong>{date(expiry.data.reminderDate)}</strong></div><div><span>Đã gửi nhắc lúc</span><strong>{dateTime(expiry.data.reminderSentAt)}</strong></div><div><span>Quyết định</span><strong>{expiry.data.decision ?? "Chưa có"}</strong></div><div><span>Thời điểm quyết định</span><strong>{dateTime(expiry.data.decidedAt)}</strong></div></div>}
        </section>
        <section className={`${styles.panel} ${styles.contractHistoryPanel}`}>
          <h2>Lịch sử chính sách</h2>
          {policyHistory.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {policyHistory.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(policyHistory.error)} <ButtonBar type="button" onClick={() => void policyHistory.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {policyHistory.data && policyHistory.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
          {policyHistory.data && policyHistory.data.length > 0 && <DataTable
            headerVariant="admin"
            rows={policyHistory.data}
            rowKey={(item) => item.id}
            columns={[
              { key: "version", header: "Phiên bản", render: (item) => item.version },
              { key: "effective", header: "Hiệu lực từ", render: (item) => date(item.effectiveDate) },
              { key: "reason", header: "Lý do", render: (item) => item.reason },
              { key: "actor", header: "Vai trò cập nhật", render: (item) => item.actorRole },
            ]}
          />}
        </section>
        {lifecycleView === "amend" && <form id="contract-policy-amend-form" className={`${styles.panel} ${styles.contractLifecyclePanel}`} onSubmit={submitPolicyAmendment}>
          <h2>Điều chỉnh chính sách</h2>
          {policySnapshot ? <>
            <p className={styles.panelSubtitle}>Chỉnh các điều khoản bằng trường nhập rõ ràng. Phiên bản hiện tại được giữ nguyên; máy chủ sẽ ghi nhận bản sửa đổi sau khi bạn xác nhận.</p>
            <div className={styles.operationsGrid}>
              <label>Phiên bản chính sách<input type="text" value={policySnapshot.policyVersion} readOnly /></label>
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
              <label className={styles.contractCheckbox}><input type="checkbox" checked={policySnapshot.buybackEnabled} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, buybackEnabled: event.target.checked } : current)} /> Cho phép thu mua máy cũ</label>
              <label>Số tháng tối thiểu để thu mua *<input type="number" min={0} max={120} step={1} required disabled={!policySnapshot.buybackEnabled} value={policySnapshot.buybackMinimumMonths} onChange={(event) => setPolicySnapshot((current) => current ? { ...current, buybackMinimumMonths: event.target.value } : current)} /></label>
              <label>Phương pháp định giá<input type="text" value={policySnapshot.buybackValuationMethod === "MANUAL_APPRAISAL" ? "Thẩm định thủ công" : policySnapshot.buybackValuationMethod} readOnly /></label>
            </div>
            <div className={styles.operationsGrid}>
              <div className={styles.contractCheckboxGroup} role="group" aria-labelledby="replacement-machine-types-label">
                <strong id="replacement-machine-types-label">Loại máy thay thế được phép *</strong>
                {(["CONVENTIONAL", "SMART_IOT"] as const).map((machineType) => (
                  <label className={styles.contractCheckbox} key={machineType}>
                    <input
                      type="checkbox"
                      checked={policySnapshot.allowedReplacementMachineTypes.includes(machineType)}
                      onChange={(event) => setPolicySnapshot((current) => {
                        if (!current) return current;
                        const selectedTypes = current.allowedReplacementMachineTypes;
                        const nextTypes = event.target.checked
                          ? [...new Set([...selectedTypes, machineType])]
                          : selectedTypes.filter((selected) => selected !== machineType);
                        return nextTypes.length ? { ...current, allowedReplacementMachineTypes: nextTypes } : current;
                      })}
                    />
                    {machineType === "SMART_IOT" ? "Máy Smart IoT" : "Máy thường"}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.operationsGrid}>
              <label>Lý do *<input required maxLength={1000} value={policyReason} onChange={(event) => setPolicyReason(event.target.value)} /></label>
              <label>Ngày hiệu lực *<input type="date" required value={policyEffectiveDate} onChange={(event) => setPolicyEffectiveDate(event.target.value)} /></label>
            </div>
          </> : <p className={styles.operationsNotice}>Hợp đồng này chưa có snapshot chính sách có cấu trúc nên chưa thể tạo bản sửa đổi.</p>}
          {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
          {amendPolicy.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(amendPolicy.error, "mutation")}</p>}
        </form>}
        {lifecycleView === "continue" && <form id="contract-continuation-form" className={`${styles.panel} ${styles.contractLifecyclePanel}`} onSubmit={submitContinuation}>
          <h2>Tạo hợp đồng tiếp nối</h2>
          <p className={styles.panelSubtitle}>Owner và máy sẽ được kế thừa từ hợp đồng cũ. Chỉ tiếp tục sau khi quy trình chấm dứt đã hoàn tất.</p>
          <div className={styles.operationsGrid}>
            <label>Ngày bắt đầu *<input type="date" required value={continuationStartDate} onChange={(event) => setContinuationStartDate(event.target.value)} /></label>
            <label>Ngày kết thúc *<input type="date" required value={continuationEndDate} onChange={(event) => setContinuationEndDate(event.target.value)} /></label>
            <label>Phí thuê hàng tháng (VND) *<input type="number" min="0" step="any" required value={continuationMonthlyFee} onChange={(event) => setContinuationMonthlyFee(event.target.value)} /></label>
            <label>Tiền cọc (VND)<input type="number" min="0" step="any" value={continuationDeposit} onChange={(event) => setContinuationDeposit(event.target.value)} /></label>
            <label>Phí lắp đặt (VND)<input type="number" min="0" step="any" value={continuationInstallationFee} onChange={(event) => setContinuationInstallationFee(event.target.value)} /></label>
            <label>Giá PAYG (VND)<input type="number" min="0" step="any" value={continuationPaygPrice} onChange={(event) => setContinuationPaygPrice(event.target.value)} /></label>
            <label>Điều khoản *<textarea required maxLength={4000} value={continuationTerms} onChange={(event) => setContinuationTerms(event.target.value)} /></label>
          </div>
          {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
          {continueContract.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(continueContract.error, "mutation")}</p>}
        </form>}
        <section className={`${styles.panel} ${styles.contractDocumentsPanel}`}><h2>{T.CONTRACTS.DOCUMENTS}</h2>
          {documents.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {documents.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(documents.error)} <ButtonBar type="button" onClick={() => void documents.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {documents.data && documents.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
          {documents.data && documents.data.length > 0 && <DataTable
            headerVariant="admin"
            rows={documents.data}
            rowKey={(doc) => doc.id}
            columns={[
              { key: "file", header: "Tệp", render: (doc) => doc.originalFilename },
              { key: "type", header: "Loại", render: (doc) => doc.documentType },
              { key: "version", header: "Phiên bản", render: (doc) => `v${doc.version}` },
              { key: "uploaded", header: "Ngày tải", render: (doc) => doc.archivedAt ? "Đã lưu trữ" : dateTime(doc.uploadedAt) },
              { key: "actions", header: "", render: (doc) => <ProgressDownloadButton
                filename={doc.originalFilename}
                download={(signal, onProgress) => {
                  setDownloadError("");
                  return contractsApi.downloadDocument(contractId, doc.id, signal, onProgress);
                }}
                onError={(error) => setDownloadError(getApiErrorMessage(error, "mutation"))}
              >{T.CONTRACTS.DOWNLOAD}</ProgressDownloadButton> },
            ]}
          />}
          {downloadError && <p className={styles.operationsNotice} role="alert">{downloadError}</p>}
        </section>
        </div>
      </>}
    </>}
    {view === "detail" && contract.data && <ContractActivationPanel contract={contract.data} />}
    {view === "history" && <>
      {!ContractIdSchema.safeParse(machineId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã máy không hợp lệ.</div>}
      {history.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {history.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(history.error)}</p><ButtonBar type="button" onClick={() => void history.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {history.data && <section className={styles.panel}><h2>Hợp đồng theo máy</h2>{history.data.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
        headerVariant="admin"
        rows={history.data}
        rowKey={(item) => item.id}
        columns={[
          { key: "contract", header: "Hợp đồng", render: (item) => <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: item.id })}><TruncatedId value={item.id} /></button> },
          { key: "owner", header: "Khách hàng", render: (item) => ownerName(item.ownerId) },
          { key: "period", header: "Thời hạn", render: (item) => `${date(item.startDate)} – ${date(item.endDate)}` },
          { key: "status", header: "Trạng thái", render: (item) => <StatusBadge status={item.status}>{status(item.status)}</StatusBadge> },
        ]}
      />}</section>}
    </>}
  </div>
  <PageActions actions={view === "detail" && contract.data ? buildContractDetailActions({
    status: contract.data.status, machineId: contract.data.machineId, hasSnapshot: Boolean(contract.data.contractTermsSnapshot), lifecycleView,
    dirty: lifecycleView === "amend" ? policyFormDirty : continuationFormDirty,
    pending: lifecycleView === "amend" ? amendPolicy.isPending : continueContract.isPending,
    formId: lifecycleView === "amend" ? "contract-policy-amend-form" : "contract-continuation-form",
    terminationHref: PATH_ADMIN.CONTRACT_TERMINATION(contract.data.id),
    onCancel: () => { setLifecycleView(null); setLifecycleError(""); },
    onAmend: () => { setLifecycleError(""); setLifecycleView("amend"); },
    onContinue: () => { setLifecycleError(""); setLifecycleView("continue"); },
    onHistory: () => navigate({ view: "history", id: contract.data!.id, machineId: contract.data!.machineId! }),
  }) : []} />
  {isContractList && createdContractId && (
    <NotificationDialog
      variant="success"
      title={T.CONTRACTS.CREATED}
      description={`M\u00e3 h\u1ee3p \u0111\u1ed3ng: ${createdContractId}`}
      primaryAction={{
        label: T.CONTRACTS.DETAIL,
        onClick: () => {
          const id = createdContractId;
          setCreatedContractId("");
          navigate({ view: "detail", id });
        },
      }}
      onClose={() => setCreatedContractId("")}
    />
  )}
  {(pendingPolicy || pendingContinuation) && <NotificationDialog
    variant="confirm"
    title={pendingPolicy ? "Ghi nhận sửa đổi chính sách?" : "Tạo hợp đồng tiếp nối dạng nháp?"}
    description={pendingPolicy
      ? `Snapshot mới có hiệu lực từ ${date(pendingPolicy.effectiveDate)}. Lịch sử chính sách chỉ được bổ sung, không thể sửa hoặc xóa.`
      : "Hợp đồng tiếp nối kế thừa Owner và máy từ hợp đồng cũ; chỉ tạo bản nháp nếu quy trình chấm dứt đã hoàn tất."}
    primaryAction={{
      label: "Tiếp tục",
      pending: amendPolicy.isPending || continueContract.isPending,
      pendingLabel: "Đang gửi…",
      onClick: () => {
        if (pendingPolicy) amendPolicy.mutate(pendingPolicy);
        else if (pendingContinuation) continueContract.mutate(pendingContinuation);
      },
    }}
    secondaryAction={{ label: "Quay lại", disabled: amendPolicy.isPending || continueContract.isPending, onClick: () => { setPendingPolicy(null); setPendingContinuation(null); } }}
    onClose={() => { if (!amendPolicy.isPending && !continueContract.isPending) { setPendingPolicy(null); setPendingContinuation(null); } }}
    closeOnEscape={!amendPolicy.isPending && !continueContract.isPending}
  >
    {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
  </NotificationDialog>}
  </>;
}

export default function AdminContractsPage() { return <AdminShell><ContractsContent /></AdminShell>; }
