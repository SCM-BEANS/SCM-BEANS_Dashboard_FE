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
  TerminationCaseRequestSchema,
  type ContractContinuationRequest,
  type ContractPolicyAmendmentRequest,
  type TerminationCaseRequest,
} from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ButtonBar } from "@/components/button/button-bar";
import { ContractCreateForm } from "@/components/create-form/contract-create-form";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { ContractTable } from "@/components/table/contract-table";
import { ContractActivationPanel } from "@/components/contracts/contract-activation-panel";
import { DataTable } from "@/components/table/data-table";
import { ActionBar } from "@/components/action-bar/action-bar";
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

function ContractsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createdContractId, setCreatedContractId] = useState("");
  const [lifecycleView, setLifecycleView] = useState<"amend" | "terminate" | "continue" | null>(null);
  const [policySnapshotText, setPolicySnapshotText] = useState("");
  const [policyReason, setPolicyReason] = useState("");
  const [policyEffectiveDate, setPolicyEffectiveDate] = useState("");
  const [terminationType, setTerminationType] = useState<TerminationCaseRequest["type"]>("NORMAL");
  const [terminationReason, setTerminationReason] = useState("");
  const [terminationEffectiveDate, setTerminationEffectiveDate] = useState("");
  const [continuationStartDate, setContinuationStartDate] = useState("");
  const [continuationEndDate, setContinuationEndDate] = useState("");
  const [continuationTerms, setContinuationTerms] = useState("");
  const [continuationMonthlyFee, setContinuationMonthlyFee] = useState("");
  const [continuationDeposit, setContinuationDeposit] = useState("");
  const [continuationInstallationFee, setContinuationInstallationFee] = useState("");
  const [continuationPaygPrice, setContinuationPaygPrice] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const [pendingPolicy, setPendingPolicy] = useState<ContractPolicyAmendmentRequest | null>(null);
  const [pendingTermination, setPendingTermination] = useState<TerminationCaseRequest | null>(null);
  const [pendingContinuation, setPendingContinuation] = useState<ContractContinuationRequest | null>(null);
  const [terminationCaseId, setTerminationCaseId] = useState("");
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
  const download = useMutation({ mutationFn: ({ id, filename }: { id: string; filename: string }) => contractsApi.downloadDocument(contractId, id), onSuccess: (blob, input) => {
    const safeFilename = input.filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "contract-document";
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = safeFilename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  useEffect(() => {
    if (!contract.data) return;
    setPolicySnapshotText(contract.data.contractTermsSnapshot ? JSON.stringify(contract.data.contractTermsSnapshot, null, 2) : "");
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
  const requestTermination = useMutation({
    mutationFn: (input: TerminationCaseRequest) => contractsApi.requestTermination(contractId, input),
    onSuccess: (created) => {
      setPendingTermination(null);
      setLifecycleView(null);
      setTerminationCaseId(created.id);
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
    let snapshot: unknown;
    try { snapshot = JSON.parse(policySnapshotText); }
    catch { setLifecycleError("Snapshot chính sách phải là JSON hợp lệ."); return; }
    const parsed = ContractPolicyAmendmentRequestSchema.safeParse({
      snapshot,
      reason: policyReason,
      effectiveDate: policyEffectiveDate,
    });
    if (!parsed.success) { setLifecycleError("Kiểm tra snapshot, lý do và ngày hiệu lực của chính sách."); return; }
    setLifecycleError("");
    setPendingPolicy(parsed.data);
  };
  const submitTerminationRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = TerminationCaseRequestSchema.safeParse({
      type: terminationType,
      reason: terminationReason,
      ...(terminationEffectiveDate ? { effectiveDate: terminationEffectiveDate } : {}),
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    if (!parsed.success) { setLifecycleError("Chọn loại yêu cầu và nhập lý do hợp lệ."); return; }
    setLifecycleError("");
    setPendingTermination(parsed.data);
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
  const ownerName = (id: string) => owners.data?.find((item) => item.idaasUserId === id)?.fullName ?? `${T.COMMON.OWNER} ${id.slice(0, 8)}`;
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
  <div className={styles.pageContent}>
    <BackButtonHeading
      title={pageTitle}
      titleId="admin-contracts-title"
      description={view === "create"
        ? T.CONTRACTS.CREATE_DESCRIPTION
        : isContractList
          ? ADMIN_CONTRACT_LIST_DESCRIPTION
          : T.CONTRACTS.DESCRIPTION}
      className={styles.pageHeading}
      back={getContractsBackDestination(router.query)}
    />
    {isContractList && <>
      {contracts.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contracts.error)}</p><ButtonBar type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contracts.data?.length === 0 && !contracts.isError && <p className={styles.pendingNotice} role="status">{T.COMMON.EMPTY}</p>}
      {contracts.data && contracts.data.length > 0 && <ContractTable
        contracts={contracts.data}
        contractHref={(id) => `/admin/contracts?view=detail&id=${encodeURIComponent(id)}`}
        draftStatusHref={(id) => `/admin/contracts?view=installation-request&id=${encodeURIComponent(id)}`}
      />}
    </>}
    {view === "create" && <ContractCreateForm
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
        <section className={styles.panel}><h2>{T.CONTRACTS.DETAIL}</h2><div className={styles.operationsGrid}>
          <div><span>Mã hợp đồng</span><strong>{contract.data.id}</strong></div><div><span>{T.COMMON.OWNER}</span><strong>{ownerName(contract.data.ownerId)} · {contract.data.ownerId}</strong></div>
          <div><span>Mã máy</span><strong>{contract.data.machineId ?? T.CONTRACTS.NO_MACHINE}</strong></div><div><span>Trạng thái</span><strong>{status(contract.data.status)}</strong></div>
          <div><span>Thời hạn</span><strong>{date(contract.data.startDate)} – {date(contract.data.endDate)}</strong></div><div><span>Loại máy</span><strong>{contract.data.machineTypeSnapshot ?? "—"}</strong></div>
          <div><span>Phí thuê hàng tháng</span><strong>{money(contract.data.monthlyRentalFee)}</strong></div><div><span>Giá PAYG</span><strong>{money(contract.data.paygUnitPrice)}</strong></div>
          <div><span>Tiền cọc</span><strong>{money(contract.data.depositAmount)}</strong></div><div><span>Phí lắp đặt</span><strong>{money(contract.data.installationFee)}</strong></div>
          <div><span>Giới hạn offline</span><strong>{contract.data.offlineLimitMinutes == null ? "—" : `${contract.data.offlineLimitMinutes} phút`}</strong></div>
        </div>
        {(contract.data.termsSnapshot ?? contract.data.terms) && <p className={styles.panelSubtitle}>{contract.data.termsSnapshot ?? contract.data.terms}</p>}</section>
        <section className={styles.panel}><h2>Trạng thái hết hạn</h2>
          {expiry.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {expiry.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(expiry.error)} <ButtonBar type="button" onClick={() => void expiry.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {expiry.data && <div className={styles.operationsGrid}><div><span>Ngày hết hạn</span><strong>{date(expiry.data.expiryDate)}</strong></div><div><span>Ngày nhắc</span><strong>{date(expiry.data.reminderDate)}</strong></div><div><span>Đã gửi nhắc lúc</span><strong>{dateTime(expiry.data.reminderSentAt)}</strong></div><div><span>Quyết định</span><strong>{expiry.data.decision ?? "Chưa có"}</strong></div><div><span>Thời điểm quyết định</span><strong>{dateTime(expiry.data.decidedAt)}</strong></div></div>}
        </section>
        <section className={styles.panel}>
          <h2>Lịch sử chính sách</h2>
          {policyHistory.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {policyHistory.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(policyHistory.error)} <ButtonBar type="button" onClick={() => void policyHistory.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {policyHistory.data && policyHistory.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
          {policyHistory.data && policyHistory.data.length > 0 && <DataTable
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
        {lifecycleView === "amend" && <form id="contract-policy-amend-form" className={styles.panel} onSubmit={submitPolicyAmendment}>
          <h2>Điều chỉnh chính sách</h2>
          {contract.data.contractTermsSnapshot ? <>
            <label>Snapshot chính sách (JSON)<textarea required rows={12} value={policySnapshotText} onChange={(event) => setPolicySnapshotText(event.target.value)} /></label>
            <div className={styles.operationsGrid}>
              <label>Lý do *<input required maxLength={1000} value={policyReason} onChange={(event) => setPolicyReason(event.target.value)} /></label>
              <label>Ngày hiệu lực *<input type="date" required value={policyEffectiveDate} onChange={(event) => setPolicyEffectiveDate(event.target.value)} /></label>
            </div>
          </> : <p className={styles.operationsNotice}>Hợp đồng này chưa có snapshot chính sách có cấu trúc nên chưa thể tạo bản sửa đổi.</p>}
          {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
          {amendPolicy.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(amendPolicy.error, "mutation")}</p>}
        </form>}
        {lifecycleView === "terminate" && <form id="contract-termination-form" className={styles.panel} onSubmit={submitTerminationRequest}>
          <h2>Yêu cầu chấm dứt hợp đồng</h2>
          <p className={styles.panelSubtitle}>Tạo hồ sơ kiểm toán; thao tác này chưa chấm dứt hợp đồng hoặc giải phóng máy.</p>
          <div className={styles.operationsGrid}>
            <label>Loại yêu cầu<select value={terminationType} onChange={(event) => setTerminationType(event.target.value as TerminationCaseRequest["type"])}>
              <option value="NORMAL">Theo kỳ hạn</option><option value="EARLY">Trước hạn</option><option value="VIOLATION">Do vi phạm</option>
            </select></label>
            <label>Ngày hiệu lực<input type="date" value={terminationEffectiveDate} onChange={(event) => setTerminationEffectiveDate(event.target.value)} /></label>
            <label>Lý do *<textarea required maxLength={2000} value={terminationReason} onChange={(event) => setTerminationReason(event.target.value)} /></label>
          </div>
          {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
          {requestTermination.isError && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(requestTermination.error, "mutation")}</p>}
        </form>}
        {lifecycleView === "continue" && <form id="contract-continuation-form" className={styles.panel} onSubmit={submitContinuation}>
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
        <section className={styles.panel}><h2>{T.CONTRACTS.DOCUMENTS}</h2>
          {documents.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {documents.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(documents.error)} <ButtonBar type="button" onClick={() => void documents.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {documents.data && documents.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
          {documents.data && documents.data.length > 0 && <DataTable
            rows={documents.data}
            rowKey={(doc) => doc.id}
            columns={[
              { key: "file", header: "Tệp", render: (doc) => doc.originalFilename },
              { key: "type", header: "Loại", render: (doc) => doc.documentType },
              { key: "size", header: "Dung lượng · phiên bản", render: (doc) => `${(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB · v${doc.version}` },
              { key: "uploaded", header: "Ngày tải", render: (doc) => doc.archivedAt ? "Đã lưu trữ" : dateTime(doc.uploadedAt) },
              { key: "actions", header: "", render: (doc) => <ButtonBar type="button" disabled={download.isPending} onClick={() => download.mutate({ id: doc.id, filename: doc.originalFilename })}>{download.isPending && download.variables?.id === doc.id ? "Đang tải…" : T.CONTRACTS.DOWNLOAD}</ButtonBar> },
            ]}
          />}
          {download.isError && <p className={styles.operationsNotice} role="alert">Không tải được tài liệu. Vui lòng thử lại.</p>}
        </section>
      </>}
    </>}
    {view === "detail" && contract.data && <ContractActivationPanel contract={contract.data} />}
    {view === "history" && <>
      {!ContractIdSchema.safeParse(machineId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã máy không hợp lệ.</div>}
      {history.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {history.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(history.error)}</p><ButtonBar type="button" onClick={() => void history.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {history.data && <section className={styles.panel}><h2>Hợp đồng theo máy</h2>{history.data.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
        rows={history.data}
        rowKey={(item) => item.id}
        columns={[
          { key: "contract", header: "Hợp đồng", render: (item) => <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: item.id })}>{item.id.slice(0, 8).toUpperCase()}</button> },
          { key: "owner", header: T.COMMON.OWNER, render: (item) => ownerName(item.ownerId) },
          { key: "period", header: "Thời hạn", render: (item) => `${date(item.startDate)} – ${date(item.endDate)}` },
          { key: "status", header: "Trạng thái", render: (item) => status(item.status) },
        ]}
      />}</section>}
    </>}
  </div>
  {isContractList && <ActionBar>
        <ButtonBar type="button" onClick={() => navigate({ view: "create" })}>{T.CONTRACTS.CREATE}</ButtonBar>
        <ButtonBar type="button" disabled={contracts.isFetching || owners.isFetching} onClick={() => { void Promise.all([contracts.refetch(), owners.refetch()]); }}>{T.COMMON.RETRY}</ButtonBar>
  </ActionBar>}
  {view === "detail" && contract.data && <ActionBar>
    {contract.data.machineId && <ButtonBar type="button" onClick={() => navigate({ view: "history", id: contract.data!.id, machineId: contract.data!.machineId! })}>{T.CONTRACTS.HISTORY}</ButtonBar>}
    {contract.data.status === "ACTIVE" && (lifecycleView ? <>
      {lifecycleView === "amend" && <ButtonBar type="submit" form="contract-policy-amend-form" disabled={amendPolicy.isPending || !contract.data.contractTermsSnapshot}>Xác nhận nội dung sửa đổi</ButtonBar>}
      {lifecycleView === "terminate" && <ButtonBar type="submit" form="contract-termination-form" disabled={requestTermination.isPending}>Gửi yêu cầu chấm dứt</ButtonBar>}
      <ButtonBar type="button" onClick={() => { setLifecycleView(null); setLifecycleError(""); }}>Đóng biểu mẫu</ButtonBar>
    </> : <>
      <ButtonBar type="button" disabled={!contract.data.contractTermsSnapshot} title={!contract.data.contractTermsSnapshot ? "Hợp đồng chưa có snapshot chính sách" : undefined} onClick={() => { setLifecycleError(""); setLifecycleView("amend"); }}>Sửa chính sách</ButtonBar>
      <ButtonBar type="button" onClick={() => { setLifecycleError(""); setLifecycleView("terminate"); }}>Yêu cầu chấm dứt</ButtonBar>
    </>)}
    {contract.data.status === "TERMINATED" && (lifecycleView === "continue" ? <>
      <ButtonBar type="submit" form="contract-continuation-form" disabled={continueContract.isPending}>Tạo bản nháp tiếp nối</ButtonBar>
      <ButtonBar type="button" onClick={() => { setLifecycleView(null); setLifecycleError(""); }}>Đóng biểu mẫu</ButtonBar>
    </> : <ButtonBar type="button" onClick={() => { setLifecycleError(""); setLifecycleView("continue"); }}>Tạo hợp đồng tiếp nối</ButtonBar>)}
  </ActionBar>}
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
  {(pendingPolicy || pendingTermination || pendingContinuation) && <NotificationDialog
    variant="confirm"
    title={pendingPolicy ? "Ghi nhận sửa đổi chính sách?" : pendingTermination ? "Tạo yêu cầu chấm dứt?" : "Tạo hợp đồng tiếp nối dạng nháp?"}
    description={pendingPolicy
      ? `Snapshot mới có hiệu lực từ ${date(pendingPolicy.effectiveDate)}. Lịch sử chính sách chỉ được bổ sung, không thể sửa hoặc xóa.`
      : pendingTermination
        ? "Hồ sơ chấm dứt được tạo để theo dõi kiểm toán. Hợp đồng và máy chưa bị thay đổi ở bước này."
        : "Hợp đồng tiếp nối kế thừa Owner và máy từ hợp đồng cũ; chỉ tạo bản nháp nếu quy trình chấm dứt đã hoàn tất."}
    primaryAction={{
      label: "Tiếp tục",
      pending: amendPolicy.isPending || requestTermination.isPending || continueContract.isPending,
      pendingLabel: "Đang gửi…",
      onClick: () => {
        if (pendingPolicy) amendPolicy.mutate(pendingPolicy);
        else if (pendingTermination) requestTermination.mutate(pendingTermination);
        else if (pendingContinuation) continueContract.mutate(pendingContinuation);
      },
    }}
    secondaryAction={{ label: "Quay lại", disabled: amendPolicy.isPending || requestTermination.isPending || continueContract.isPending, onClick: () => { setPendingPolicy(null); setPendingTermination(null); setPendingContinuation(null); } }}
    onClose={() => { if (!amendPolicy.isPending && !requestTermination.isPending && !continueContract.isPending) { setPendingPolicy(null); setPendingTermination(null); setPendingContinuation(null); } }}
    closeOnEscape={!amendPolicy.isPending && !requestTermination.isPending && !continueContract.isPending}
  >
    {lifecycleError && <p className={styles.accountInlineWarning} role="alert">{lifecycleError}</p>}
  </NotificationDialog>}
  {terminationCaseId && <NotificationDialog
    variant="success"
    title="Đã tạo hồ sơ chấm dứt"
    description={`Mã hồ sơ: ${terminationCaseId}. Hợp đồng vẫn còn nguyên trạng ở bước này.`}
    primaryAction={{ label: "Đóng", onClick: () => setTerminationCaseId("") }}
    onClose={() => setTerminationCaseId("")}
  />}
  </>;
}

export default function AdminContractsPage() { return <AdminShell><ContractsContent /></AdminShell>; }
