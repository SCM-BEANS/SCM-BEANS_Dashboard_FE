import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { contractsApi } from "@/apis/contracts.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { CreateContractRequestSchema } from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import styles from "./contract-create-form.module.css";

type MachineType = "CONVENTIONAL" | "SMART_IOT";
type MachineChoice = {
  machineId: string;
  optionLabel: string;
};

class RentalMachineUnavailable extends Error {}
class RentalMachineCheckFailed extends Error {
  constructor(readonly readError: unknown) { super("Không kiểm tra được máy đã chọn."); }
}

async function rentalSerialChoices(signal?: AbortSignal): Promise<MachineChoice[]> {
  const first = await machinesApi.listRentalCandidatePage(0, 100, signal);
  const candidates = [...first.content];
  for (let page = 1; page < first.totalPages; page++) {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    const next = await machinesApi.listRentalCandidatePage(page, 100, signal);
    candidates.push(...next.content);
  }
  return [...new Map(candidates
    .filter((machine) => machine.status === "AVAILABLE_FOR_RENT" && machine.serialNumber?.trim())
    .map((machine) => [machine.machineId, {
      machineId: machine.machineId, optionLabel: machine.serialNumber!.trim(),
    }])).values()];
}
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
    heartbeatToleranceSeconds: string;
    buybackEnabled: boolean;
    buybackMinimumMonths: string;
    buybackValuationMethod: string;
  };
};

const initialForm: ContractFormState = {
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
    heartbeatToleranceSeconds: "45",
    buybackEnabled: true,
    buybackMinimumMonths: "0",
    buybackValuationMethod: "MANUAL_APPRAISAL",
  },
};

const FORM_ID = "contract-create-form";

export function ContractCreateForm({
  onCreated,
  onCancel,
  ownerRole = "OWNER",
  selectMachineBySerial = false,
}: {
  onCreated: (contractId: string) => void;
  onCancel: () => void;
  ownerRole?: string;
  selectMachineBySerial?: boolean;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContractFormState>(initialForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [createdContractId, setCreatedContractId] = useState("");
  const useRentalCandidates = selectMachineBySerial || ownerRole === "owner";
  const ownerQueryKey = ownerRole === "OWNER"
    ? ["dolores", "profiles", "owner-directory"]
    : ["dolores", "profiles", "owner-directory", ownerRole];

  const owners = useQuery({
    queryKey: ownerQueryKey,
    queryFn: async ({ signal }) => {
      const first = await profilesApi.list({ role: ownerRole, page: 0, size: 100 }, signal);
      const pages = [first];
      for (let index = 1; index < first.totalPages; index += 5) {
        const numbers = Array.from({ length: Math.min(5, first.totalPages - index) }, (_, offset) => index + offset);
        pages.push(...await Promise.all(numbers.map((page) => profilesApi.list({ role: ownerRole, page, size: 100 }, signal))));
        if (signal?.aborted) break;
      }
      return pages.flatMap((page) => page.items);
    },
  });
  const machines = useQuery({
    queryKey: useRentalCandidates
      ? ["dolores", "inventory", "rental-candidates", selectMachineBySerial ? "serial-number" : "model"]
      : ["dolores", "machines", "inventory"],
    queryFn: async ({ signal }): Promise<MachineChoice[]> => {
      if (selectMachineBySerial) return rentalSerialChoices(signal);
      if (useRentalCandidates) {
        const candidates = await machinesApi.listRentalCandidates(signal);
        return candidates.map(({ machineId, displayName }) => ({
          machineId,
          optionLabel: displayName || machineId,
        }));
      }

      const inventory = await machinesApi.list(signal);
      return inventory
        .filter((machine) => machine.status === "IN_WAREHOUSE")
        .map((machine) => {
          const displayName = machine.serialNumber || machine.id.slice(0, 8);
          const machineType = machine.machineType === "SMART_IOT"
            ? T.MACHINES.SMART
            : machine.machineType === "CONVENTIONAL"
              ? T.MACHINES.CONVENTIONAL
              : T.MACHINES.UNCLASSIFIED;
          return {
            machineId: machine.id,
            optionLabel: `${displayName} · ${machineType} · ${machine.id}`,
          };
        });
    },
  });
  const warehouseMachines = machines.data ?? [];

  const create = useMutation({
    mutationFn: async (request: z.infer<typeof CreateContractRequestSchema>) => {
      if (selectMachineBySerial) {
        let current;
        try { current = await machinesApi.getById(request.machineId); }
        catch (error) { throw new RentalMachineCheckFailed(error); }
        const selected = warehouseMachines.find((machine) => machine.machineId === request.machineId);
        if (current.status !== "AVAILABLE_FOR_RENT" || !current.serialNumber?.trim()
          || current.serialNumber.trim() !== selected?.optionLabel) {
          throw new RentalMachineUnavailable("Máy đã chọn không còn sẵn sàng cho thuê hoặc serial number đã thay đổi. Vui lòng chọn lại máy.");
        }
      }
      return contractsApi.create(request);
    },
    retry: false,
    onSuccess: ({ id }) => {
      setRequestError("");
      setCreatedContractId(id);
      void queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["dolores", "inventory", "rental-candidates"] });
      onCreated(id);
    },
    onError: (error: unknown) => {
      if (error instanceof RentalMachineCheckFailed) {
        setRequestError("Chưa kiểm tra được tình trạng máy. " + getApiErrorMessage(error.readError));
        return;
      }
      if (error instanceof RentalMachineUnavailable) {
        setRequestError(error.message);
        setForm((current) => ({ ...current, machineId: "" }));
        void machines.refetch();
        return;
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
      if (isUncertainApiMutation(error)) setBlockResubmit(true);
    },
  });

  const setField = <K extends keyof ContractFormState,>(key: K, value: ContractFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const setSnapshotField = <K extends keyof ContractFormState["contractTermsSnapshot"],>(
    key: K,
    value: ContractFormState["contractTermsSnapshot"][K],
  ) => {
    setForm((current) => ({
      ...current,
      contractTermsSnapshot: { ...current.contractTermsSnapshot, [key]: value },
    }));
  };
  const toggleReplacementMachineType = (machineType: MachineType, checked: boolean) => {
    setForm((current) => {
      const currentTypes = current.contractTermsSnapshot.allowedReplacementMachineTypes;
      const allowedReplacementMachineTypes = checked
        ? [...new Set([...currentTypes, machineType])]
        : currentTypes.filter((value) => value !== machineType);
      return {
        ...current,
        contractTermsSnapshot: { ...current.contractTermsSnapshot, allowedReplacementMachineTypes },
      };
    });
  };

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending || blockResubmit || createdContractId) return;
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
        heartbeatToleranceSeconds: Number(form.contractTermsSnapshot.heartbeatToleranceSeconds),
        buybackEnabled: form.contractTermsSnapshot.buybackEnabled,
        buybackMinimumMonths: Number(form.contractTermsSnapshot.buybackMinimumMonths),
        buybackValuationMethod: form.contractTermsSnapshot.buybackValuationMethod.trim(),
      },
    });
    if (!parsed.success) {
      setRequestError(T.CONTRACTS.CREATE_INVALID);
      return;
    }
    if (selectMachineBySerial && !warehouseMachines.some((machine) => machine.machineId === parsed.data.machineId)) {
      setRequestError("Chọn serial number của máy sẵn sàng cho thuê.");
      return;
    }
    create.mutate(parsed.data);
  };

  const locked = create.isPending || blockResubmit || Boolean(createdContractId);
  const submitDisabled = !form.ownerId || !form.machineId || !form.startDate || !form.endDate || !form.monthlyRentalFee || !form.terms.trim() || locked || owners.isPending || owners.isError || owners.data?.length === 0 ||
    machines.isPending || machines.isError || warehouseMachines.length === 0 ||
    (selectMachineBySerial && !warehouseMachines.some((machine) => machine.machineId === form.machineId));

  return (
    <>
      <section className={styles.panel}>
        <h2>Thông tin hợp đồng</h2>
        <form id={FORM_ID} className={styles.contractForm} onSubmit={submitCreate}>
          <fieldset className={styles.contractFormFields} disabled={locked}>
            <div className={styles.operationsGrid}>
              <label htmlFor="contract-owner">
                <span>Owner *</span>
                <select id="contract-owner" name="ownerId" required value={form.ownerId} disabled={owners.isPending || owners.isError || Boolean(createdContractId)} onChange={(event) => setField("ownerId", event.target.value)}>
                  <option value="">{owners.isPending ? T.COMMON.LOADING : "Chọn Owner"}</option>
                  {owners.data?.map((owner) => <option key={owner.idaasUserId} value={owner.idaasUserId}>{owner.fullName} · {owner.idaasUserId.slice(0, 8)}</option>)}
                </select>
              </label>
              <label htmlFor="contract-machine">
                <span>{selectMachineBySerial ? "Serial number của máy *" : "Máy đang ở kho *"}</span>
                <select id="contract-machine" aria-label={selectMachineBySerial ? "Serial number của máy *" : undefined} name="machineId" required value={form.machineId} disabled={machines.isPending || machines.isError || warehouseMachines.length === 0 || Boolean(createdContractId)} onChange={(event) => setField("machineId", event.target.value)}>
                  <option value="">{machines.isPending ? T.COMMON.LOADING : machines.isError ? "Không tải được danh sách máy" : warehouseMachines.length ? (selectMachineBySerial ? "Chọn serial number" : "Chọn máy trong kho") : (selectMachineBySerial ? "Chưa có máy sẵn sàng cho thuê" : T.CONTRACTS.NO_WAREHOUSE_MACHINES)}</option>
                  {warehouseMachines.map((machine) => <option key={machine.machineId} value={machine.machineId}>{machine.optionLabel}</option>)}
                </select>
                {selectMachineBySerial ? <small>Chỉ hiển thị máy sẵn sàng cho thuê.</small> : null}
              </label>
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
              <label htmlFor="contract-repair-responsibility">
                <span>Trách nhiệm chi phí sửa chữa *</span>
                <select id="contract-repair-responsibility" name="contractTermsSnapshot.repairCostResponsibility" value={form.contractTermsSnapshot.repairCostResponsibility} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("repairCostResponsibility", event.target.value as ContractFormState["contractTermsSnapshot"]["repairCostResponsibility"])}>
                  <option value="UNKNOWN">Chưa xác định</option><option value="TENANT">Bên thuê</option><option value="COMPANY">Công ty</option>
                </select>
              </label>
              <label htmlFor="contract-payment-destination"><span>Mã tham chiếu nơi nhận thanh toán</span><input id="contract-payment-destination" name="contractTermsSnapshot.paymentDestinationReference" type="text" maxLength={128} value={form.contractTermsSnapshot.paymentDestinationReference} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("paymentDestinationReference", event.target.value)} /></label>
              <label htmlFor="contract-heartbeat-tolerance"><span>Ngưỡng mất kết nối (giây) *</span><input id="contract-heartbeat-tolerance" name="contractTermsSnapshot.heartbeatToleranceSeconds" type="number" required min="5" max="86400" step="1" value={form.contractTermsSnapshot.heartbeatToleranceSeconds} disabled={Boolean(createdContractId)} onChange={(event) => setSnapshotField("heartbeatToleranceSeconds", event.target.value)} /><small>Chuyển sang mất kết nối khi quá thời gian này chưa có tín hiệu mới.</small></label>
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

          {owners.data?.length === 0 && <p className={styles.operationsNotice} role="status">{T.CONTRACTS.NO_OWNERS}</p>}
          {owners.isError && <p className={styles.operationsNotice} role="alert">{T.CONTRACTS.UNKNOWN_OWNER}. {getApiErrorMessage(owners.error)} <ButtonBar type="button" onClick={() => void owners.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.isError && <p className={styles.operationsNotice} role="alert">{getApiErrorMessage(machines.error)} <ButtonBar type="button" onClick={() => void machines.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.data && warehouseMachines.length === 0 && <p className={styles.operationsNotice} role="status">{selectMachineBySerial ? "Chưa có máy có serial number và trạng thái sẵn sàng cho thuê." : T.CONTRACTS.NO_WAREHOUSE_MACHINES}</p>}
          {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
          {blockResubmit && <p className={styles.operationsNotice} role="status">Vì kết quả gửi yêu cầu chưa xác định, hãy kiểm tra danh sách hợp đồng trước khi thử tạo lại.</p>}
        </form>
      </section>
      <PageActions actions={createdContractId ? [] : [
        { id: "cancel", label: "Hủy", priority: 100, onClick: onCancel, confirm: JSON.stringify(form) !== JSON.stringify(initialForm) ? { title: "Hủy tạo hợp đồng?", description: "Thông tin đã nhập sẽ bị mất.", confirmLabel: "Hủy tạo" } : undefined },
        { id: "create", label: T.CONTRACTS.CREATE_SUBMIT, variant: "primary", priority: 100, type: "submit", form: FORM_ID, disabled: submitDisabled, disabledReason: create.isPending ? "Đang tạo hợp đồng." : "Điền đầy đủ thông tin hợp lệ để tạo hợp đồng.", pending: create.isPending, pendingLabel: T.CONTRACTS.CREATING },
      ]} />
    </>
  );
}
