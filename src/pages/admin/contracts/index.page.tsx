import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { contractsApi } from "@/apis/contracts.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { ContractIdSchema, CreateContractRequestSchema } from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { ActionBar } from "@/components/action-bar/action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getContractsBackDestination } from "../admin-back-destination";

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

type MachineType = "CONVENTIONAL" | "SMART_IOT";
type ContractFormState = {
  ownerId: string;
  machineId: string;
  startDate: string;
  endDate: string;
  terms: string;
  monthlyRentalFee: string;
  depositAmount: string;
  installationFee: string;
  paygUnitPrice: string;
  offlineLimitMinutes: string;
  contractTermsSnapshot: {
    maintenanceIntervalMonths: string;
    maintenanceWindowDays: string;
    allowedReplacementMachineTypes: MachineType[];
    repairCostResponsibility: "TENANT" | "COMPANY" | "UNKNOWN";
    paymentDueEligibleDays: string;
    paymentDestinationReference: string;
    offlineViolationAction: string;
    buybackEnabled: boolean;
    buybackMinimumMonths: string;
    buybackValuationMethod: string;
  };
};

const initialContractForm: ContractFormState = {
  ownerId: "",
  machineId: "",
  startDate: "",
  endDate: "",
  terms: "",
  monthlyRentalFee: "",
  depositAmount: "",
  installationFee: "",
  paygUnitPrice: "",
  offlineLimitMinutes: "",
  contractTermsSnapshot: {
    maintenanceIntervalMonths: "3",
    maintenanceWindowDays: "10",
    allowedReplacementMachineTypes: ["SMART_IOT"],
    repairCostResponsibility: "UNKNOWN",
    paymentDueEligibleDays: "10",
    paymentDestinationReference: "",
    offlineViolationAction: "WARN_ONLY",
    buybackEnabled: true,
    buybackMinimumMonths: "0",
    buybackValuationMethod: "MANUAL_APPRAISAL",
  },
};

function ContractsContent() {
  const router = useRouter();
  const [form, setForm] = useState<ContractFormState>(initialContractForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [createdContractId, setCreatedContractId] = useState("");
  const view = queryValue(router.query.view);
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
  const machines = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: view === "create",
  });
  const contract = useQuery({ queryKey: ["dolores", "contract", contractId], queryFn: ({ signal }) => contractsApi.getById(contractId, signal), enabled: view !== "list" && ContractIdSchema.safeParse(contractId).success });
  const expiry = useQuery({ queryKey: ["dolores", "contract-expiry", contractId], queryFn: ({ signal }) => contractsApi.getExpiry(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const documents = useQuery({ queryKey: ["dolores", "contract-documents", contractId], queryFn: ({ signal }) => contractsApi.getDocuments(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const history = useQuery({ queryKey: ["dolores", "machine-contract-history", machineId], queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId, signal), enabled: view === "history" && ContractIdSchema.safeParse(machineId).success });
  const download = useMutation({ mutationFn: ({ id, filename }: { id: string; filename: string }) => contractsApi.downloadDocument(contractId, id), onSuccess: (blob, input) => {
    const safeFilename = input.filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "contract-document";
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = safeFilename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  const create = useMutation({
    mutationFn: (request: z.infer<typeof CreateContractRequestSchema>) => contractsApi.create(request),
    onSuccess: ({ id }) => {
      setRequestError("");
      setCreatedContractId(id);
      void router.push({ pathname: "/admin/contracts" }, undefined, { shallow: true });
    },
    onError: (error: unknown) => {
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        setRequestError(getApiErrorMessage(error, "mutation"));
        return;
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });
  const navigate = (query?: Record<string, string>) => {
    if (query?.view === "create") {
      setForm(initialContractForm);
      setCreatedContractId("");
      setBlockResubmit(false);
      setRequestError("");
    }
    void router.push({ pathname: "/admin/contracts", query }, undefined, { shallow: true });
  };
  const ownerName = (id: string) => owners.data?.find((item) => item.idaasUserId === id)?.fullName ?? `${T.COMMON.OWNER} ${id.slice(0, 8)}`;
  const warehouseMachines = machines.data?.filter((machine) => machine.status === "IN_WAREHOUSE") ?? [];
  const setField = <K extends keyof ContractFormState,>(key: K, value: ContractFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setSnapshotField = <K extends keyof ContractFormState["contractTermsSnapshot"],>(key: K, value: ContractFormState["contractTermsSnapshot"][K]) => {
    setForm((current) => ({
      ...current,
      contractTermsSnapshot: { ...current.contractTermsSnapshot, [key]: value },
    }));
  };
  const toggleReplacementMachineType = (machineType: MachineType, checked: boolean) => {
    setForm((current) => {
      const existingTypes = current.contractTermsSnapshot.allowedReplacementMachineTypes;
      const allowedReplacementMachineTypes = checked
        ? [...new Set([...existingTypes, machineType])]
        : existingTypes.filter((value) => value !== machineType);
      return {
        ...current,
        contractTermsSnapshot: { ...current.contractTermsSnapshot, allowedReplacementMachineTypes },
      };
    });
  };
  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (blockResubmit || createdContractId) return;
    setRequestError("");
    const optionalNumber = (value: string) => value.trim() === "" ? undefined : Number(value);
    const parsed = CreateContractRequestSchema.safeParse({
      ownerId: form.ownerId,
      machineId: form.machineId,
      startDate: form.startDate,
      endDate: form.endDate,
      terms: form.terms.trim(),
      monthlyRentalFee: optionalNumber(form.monthlyRentalFee),
      depositAmount: optionalNumber(form.depositAmount),
      installationFee: optionalNumber(form.installationFee),
      paygUnitPrice: optionalNumber(form.paygUnitPrice),
      offlineLimitMinutes: optionalNumber(form.offlineLimitMinutes),
      contractTermsSnapshot: {
        policyVersion: 1,
        maintenanceIntervalMonths: Number(form.contractTermsSnapshot.maintenanceIntervalMonths),
        maintenanceWindowDays: Number(form.contractTermsSnapshot.maintenanceWindowDays),
        allowedReplacementMachineTypes: form.contractTermsSnapshot.allowedReplacementMachineTypes,
        repairCostResponsibility: form.contractTermsSnapshot.repairCostResponsibility,
        paymentDueEligibleDays: Number(form.contractTermsSnapshot.paymentDueEligibleDays),
        paymentDestinationReference: form.contractTermsSnapshot.paymentDestinationReference.trim(),
        offlineViolationAction: form.contractTermsSnapshot.offlineViolationAction.trim(),
        buybackEnabled: form.contractTermsSnapshot.buybackEnabled,
        buybackMinimumMonths: Number(form.contractTermsSnapshot.buybackMinimumMonths),
        buybackValuationMethod: form.contractTermsSnapshot.buybackValuationMethod.trim(),
      },
    });
    if (!parsed.success) {
      setRequestError(T.CONTRACTS.CREATE_INVALID);
      return;
    }
    create.mutate(parsed.data);
  };
  const pageTitle = view === "create" ? T.CONTRACTS.CREATE_TITLE : view === "history" ? T.CONTRACTS.HISTORY : view === "detail" ? `${T.CONTRACTS.DETAIL} · ${contractId.slice(0, 8).toUpperCase()}` : T.CONTRACTS.TITLE;

  return <>
  <div className={styles.pageContent}>
    <BackButtonHeading
      title={pageTitle}
      titleId="admin-contracts-title"
      description={view === "create" ? T.CONTRACTS.CREATE_DESCRIPTION : T.CONTRACTS.DESCRIPTION}
      className={styles.pageHeading}
      back={getContractsBackDestination(router.query)}
    />
    {(view === "" || view === "list") && <>
      {contracts.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contracts.error)}</p><ButtonBar type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contracts.data && <section className={styles.panel}><h2>{contracts.data.length} hợp đồng</h2>
        {owners.isError && <p className={styles.operationsNotice} role="status">{T.CONTRACTS.UNKNOWN_OWNER}. {getApiErrorMessage(owners.error)}</p>}
        {contracts.data.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
          rows={contracts.data}
          rowKey={(item) => item.id}
          columns={[
            { key: "contract", header: "Hợp đồng", render: (item) => <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: item.id })}>{item.id.slice(0, 8).toUpperCase()}</button> },
            { key: "owner", header: T.COMMON.OWNER, render: (item) => ownerName(item.ownerId), cellProps: (item) => ({ title: item.ownerId }) },
            { key: "machine", header: "Máy", render: (item) => item.machineId?.slice(0, 8).toUpperCase() ?? T.CONTRACTS.NO_MACHINE },
            { key: "period", header: "Thời hạn", render: (item) => `${date(item.startDate)} – ${date(item.endDate)}` },
            { key: "status", header: "Trạng thái", render: (item) => status(item.status) },
          ]}
        />}
      </section>}
    </>}
    {view === "create" && <>
      <section className={styles.panel}>
        <h2>Thông tin hợp đồng</h2>
        <form id="contract-create-form" className={styles.contractForm} onSubmit={submitCreate}>
          <fieldset className={styles.contractFormFields} disabled={create.isPending || blockResubmit || Boolean(createdContractId)}>
          <div className={styles.operationsGrid}>
            <label htmlFor="contract-owner"><span>Owner *</span><select id="contract-owner" name="ownerId" required value={form.ownerId} disabled={owners.isPending || owners.isError || Boolean(createdContractId)} onChange={(event) => setField("ownerId", event.target.value)}>
              <option value="">{owners.isPending ? T.COMMON.LOADING : "Chọn Owner"}</option>
              {owners.data?.map((owner) => <option key={owner.idaasUserId} value={owner.idaasUserId}>{owner.fullName} · {owner.idaasUserId.slice(0, 8)}</option>)}
            </select></label>
            <label htmlFor="contract-machine"><span>Máy đang ở kho *</span><select id="contract-machine" name="machineId" required value={form.machineId} disabled={machines.isPending || machines.isError || warehouseMachines.length === 0 || Boolean(createdContractId)} onChange={(event) => setField("machineId", event.target.value)}>
              <option value="">{machines.isPending ? T.COMMON.LOADING : machines.isError ? "Không tải được danh sách máy" : warehouseMachines.length ? "Chọn máy trong kho" : T.CONTRACTS.NO_WAREHOUSE_MACHINES}</option>
              {warehouseMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber || machine.id.slice(0, 8)} · {machine.machineType === "SMART_IOT" ? T.MACHINES.SMART : machine.machineType === "CONVENTIONAL" ? T.MACHINES.CONVENTIONAL : T.MACHINES.UNCLASSIFIED} · {machine.id}</option>)}
            </select></label>
            <label htmlFor="contract-start-date"><span>Ngày bắt đầu *</span><input id="contract-start-date" name="startDate" type="date" required value={form.startDate} disabled={Boolean(createdContractId)} onChange={(event) => setField("startDate", event.target.value)} /></label>
            <label htmlFor="contract-end-date"><span>Ngày kết thúc *</span><input id="contract-end-date" name="endDate" type="date" required min={form.startDate || undefined} value={form.endDate} disabled={Boolean(createdContractId)} onChange={(event) => setField("endDate", event.target.value)} /></label>
            <label htmlFor="contract-monthly-rental-fee"><span>Phí thuê hàng tháng (VND) *</span><input id="contract-monthly-rental-fee" name="monthlyRentalFee" type="number" min="0" step="any" required value={form.monthlyRentalFee} disabled={Boolean(createdContractId)} onChange={(event) => setField("monthlyRentalFee", event.target.value)} /></label>
            <label htmlFor="contract-payg-unit-price"><span>Đơn giá PAYG (VND / đơn vị)</span><input id="contract-payg-unit-price" name="paygUnitPrice" type="number" min="0" step="any" value={form.paygUnitPrice} disabled={Boolean(createdContractId)} onChange={(event) => setField("paygUnitPrice", event.target.value)} /></label>
            <label htmlFor="contract-installation-fee"><span>Phí lắp đặt (VND)</span><input id="contract-installation-fee" name="installationFee" type="number" min="0" step="any" value={form.installationFee} disabled={Boolean(createdContractId)} onChange={(event) => setField("installationFee", event.target.value)} /></label>
            <label htmlFor="contract-deposit-amount"><span>Tiền cọc (VND)</span><input id="contract-deposit-amount" name="depositAmount" type="number" min="0" step="any" value={form.depositAmount} disabled={Boolean(createdContractId)} onChange={(event) => setField("depositAmount", event.target.value)} /></label>
            <label htmlFor="contract-offline-limit"><span>Giới hạn offline (phút)</span><input id="contract-offline-limit" name="offlineLimitMinutes" type="number" min="1" step="1" value={form.offlineLimitMinutes} disabled={Boolean(createdContractId)} onChange={(event) => setField("offlineLimitMinutes", event.target.value)} /></label>
            <label htmlFor="contract-terms"><span>Điều khoản *</span><textarea id="contract-terms" name="terms" required rows={4} value={form.terms} disabled={Boolean(createdContractId)} onChange={(event) => setField("terms", event.target.value)} /></label>
          </div>

          <h3>Snapshot điều khoản vận hành</h3>
          <div className={styles.operationsGrid}>
            <div><span>Phiên bản policy</span><strong>1</strong></div>
            <label htmlFor="contract-maintenance-interval"><span>Chu kỳ bảo trì (tháng) *</span><input id="contract-maintenance-interval" name="contractTermsSnapshot.maintenanceIntervalMonths" type="number" min="1" max="24" step="1" required value={form.contractTermsSnapshot.maintenanceIntervalMonths} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("maintenanceIntervalMonths", event.target.value)} /></label>
            <label htmlFor="contract-maintenance-window"><span>Thời hạn bảo trì (ngày) *</span><input id="contract-maintenance-window" name="contractTermsSnapshot.maintenanceWindowDays" type="number" min="0" max="30" step="1" required value={form.contractTermsSnapshot.maintenanceWindowDays} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("maintenanceWindowDays", event.target.value)} /></label>
            <label htmlFor="contract-payment-due-days"><span>Số ngày thanh toán được phép *</span><input id="contract-payment-due-days" name="contractTermsSnapshot.paymentDueEligibleDays" type="number" min="1" max="60" step="1" required value={form.contractTermsSnapshot.paymentDueEligibleDays} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("paymentDueEligibleDays", event.target.value)} /></label>
            <label htmlFor="contract-repair-responsibility"><span>Trách nhiệm chi phí sửa chữa *</span><select id="contract-repair-responsibility" name="contractTermsSnapshot.repairCostResponsibility" value={form.contractTermsSnapshot.repairCostResponsibility} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("repairCostResponsibility", event.target.value as ContractFormState["contractTermsSnapshot"]["repairCostResponsibility"])}>
              <option value="UNKNOWN">Chưa xác định</option><option value="TENANT">Bên thuê</option><option value="COMPANY">Công ty</option>
            </select></label>
            <label htmlFor="contract-payment-destination"><span>Mã tham chiếu nơi nhận thanh toán</span><input id="contract-payment-destination" name="contractTermsSnapshot.paymentDestinationReference" type="text" maxLength={128} value={form.contractTermsSnapshot.paymentDestinationReference} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("paymentDestinationReference", event.target.value)} /></label>
            <label htmlFor="contract-offline-action"><span>Hành động khi máy offline vượt giới hạn *</span><input id="contract-offline-action" name="contractTermsSnapshot.offlineViolationAction" type="text" required maxLength={64} value={form.contractTermsSnapshot.offlineViolationAction} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("offlineViolationAction", event.target.value)} /></label>
            <label htmlFor="contract-buyback-valuation"><span>Phương pháp định giá mua lại *</span><input id="contract-buyback-valuation" name="contractTermsSnapshot.buybackValuationMethod" type="text" required maxLength={64} value={form.contractTermsSnapshot.buybackValuationMethod} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("buybackValuationMethod", event.target.value)} /></label>
            <label htmlFor="contract-buyback-minimum"><span>Số tháng tối thiểu để mua lại *</span><input id="contract-buyback-minimum" name="contractTermsSnapshot.buybackMinimumMonths" type="number" min="0" max="120" step="1" required value={form.contractTermsSnapshot.buybackMinimumMonths} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("buybackMinimumMonths", event.target.value)} /></label>
            <div>
              <span>Loại máy thay thế được phép</span>
              <div className={styles.contractCheckboxGroup}>
                <label><input type="checkbox" name="contractTermsSnapshot.allowedReplacementMachineTypes" value="CONVENTIONAL" checked={form.contractTermsSnapshot.allowedReplacementMachineTypes.includes("CONVENTIONAL")} disabled={Boolean(createdContractId)} onChange={(event) => toggleReplacementMachineType("CONVENTIONAL", event.target.checked)} /><span>{T.MACHINES.CONVENTIONAL}</span></label>
                <label><input type="checkbox" name="contractTermsSnapshot.allowedReplacementMachineTypes" value="SMART_IOT" checked={form.contractTermsSnapshot.allowedReplacementMachineTypes.includes("SMART_IOT")} disabled={Boolean(createdContractId)} onChange={(event) => toggleReplacementMachineType("SMART_IOT", event.target.checked)} /><span>{T.MACHINES.SMART}</span></label>
              </div>
            </div>
            <label className={styles.contractCheckbox}><input type="checkbox" name="contractTermsSnapshot.buybackEnabled" checked={form.contractTermsSnapshot.buybackEnabled} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("buybackEnabled", event.target.checked)} /><span>Cho phép mua lại máy</span></label>
          </div>
          </fieldset>

          {owners.data && owners.data.length === 0 && <p className={styles.operationsNotice} role="status">{T.CONTRACTS.NO_OWNERS}</p>}
          {owners.isError && <p className={styles.operationsNotice} role="alert">{T.CONTRACTS.UNKNOWN_OWNER}. {getApiErrorMessage(owners.error)} <ButtonBar type="button" onClick={() => void owners.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.isError && <p className={styles.operationsNotice} role="alert">{getApiErrorMessage(machines.error)} <ButtonBar type="button" onClick={() => void machines.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.data && warehouseMachines.length === 0 && <p className={styles.operationsNotice} role="status">{T.CONTRACTS.NO_WAREHOUSE_MACHINES}</p>}
          {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
        </form>
      </section>
    </>}
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
  {(view === "" || view === "list") && <ActionBar>
        <ButtonBar type="button" onClick={() => navigate({ view: "create" })}>{T.CONTRACTS.CREATE}</ButtonBar>
        <ButtonBar type="button" disabled={contracts.isFetching || owners.isFetching} onClick={() => { void Promise.all([contracts.refetch(), owners.refetch()]); }}>{T.COMMON.RETRY}</ButtonBar>
  </ActionBar>}
  {view === "create" && <ActionBar>
    <ButtonBar type="submit" form="contract-create-form" disabled={create.isPending || blockResubmit || Boolean(createdContractId) || owners.isPending || owners.isError || owners.data?.length === 0 || machines.isPending || machines.isError || warehouseMachines.length === 0}>{create.isPending ? T.CONTRACTS.CREATING : createdContractId ? "Đã tạo" : T.CONTRACTS.CREATE_SUBMIT}</ButtonBar>
  </ActionBar>}
  {view === "detail" && contract.data?.machineId && <ActionBar>
    <ButtonBar type="button" onClick={() => navigate({ view: "history", id: contract.data!.id, machineId: contract.data!.machineId! })}>{T.CONTRACTS.HISTORY}</ButtonBar>
  </ActionBar>}
  {(view === "" || view === "list") && createdContractId && (
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
  </>;
}

export default function AdminContractsPage() { return <AdminShell><ContractsContent /></AdminShell>; }
