import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { contractsApi } from "@/apis/contracts.api";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { ButtonBar } from "@/components/button/button-bar";
import { APP_MESSAGES } from "@/constants/messages";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { CreateContractRequestSchema } from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { moderatorStyles as styles } from "../moderator-shell";

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
    buybackEnabled: true,
    buybackMinimumMonths: "0",
    buybackValuationMethod: "MANUAL_APPRAISAL",
  },
};

export function ContractCreateScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContractFormState>(initialForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [createdContractId, setCreatedContractId] = useState("");

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
  });
  const warehouseMachines = machines.data?.filter((machine) => machine.status === "IN_WAREHOUSE") ?? [];

  const create = useMutation({
    mutationFn: (request: z.infer<typeof CreateContractRequestSchema>) => contractsApi.create(request),
    onSuccess: async ({ id }) => {
      setRequestError("");
      setCreatedContractId(id);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error) && error.response?.status === 409
        ? APP_MESSAGES.CONTRACT.MACHINE_ALREADY_IN_USE
        : getApiErrorMessage(error, "mutation");
      setRequestError(message);
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

  const locked = create.isPending || blockResubmit || Boolean(createdContractId);
  const submitDisabled = locked || owners.isPending || owners.isError || owners.data?.length === 0 ||
    machines.isPending || machines.isError || warehouseMachines.length === 0;

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeading}>
        <h1>{T.CONTRACTS.CREATE_TITLE}</h1>
        <p>{T.CONTRACTS.CREATE_DESCRIPTION}</p>
      </header>

      <section className={styles.formPanel}>
        <h2 className={styles.sectionTitle}>Thông tin hợp đồng</h2>
        <form id="moderator-contract-create-form" className={styles.contractForm} onSubmit={submitCreate}>
          <fieldset disabled={locked}>
            <div className={styles.formRow}>
              <label className={styles.formField} htmlFor="moderator-contract-owner">
                <span>Owner *</span>
                <select id="moderator-contract-owner" name="ownerId" required value={form.ownerId} disabled={owners.isPending || owners.isError} onChange={(event) => setField("ownerId", event.target.value)}>
                  <option value="">{owners.isPending ? T.COMMON.LOADING : "Chọn Owner"}</option>
                  {owners.data?.map((owner) => <option key={owner.idaasUserId} value={owner.idaasUserId}>{owner.fullName} · {owner.idaasUserId.slice(0, 8)}</option>)}
                </select>
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-machine">
                <span>Máy đang ở kho *</span>
                <select id="moderator-contract-machine" name="machineId" required value={form.machineId} disabled={machines.isPending || machines.isError || warehouseMachines.length === 0} onChange={(event) => setField("machineId", event.target.value)}>
                  <option value="">{machines.isPending ? T.COMMON.LOADING : machines.isError ? "Không tải được danh sách máy" : warehouseMachines.length ? "Chọn máy trong kho" : T.CONTRACTS.NO_WAREHOUSE_MACHINES}</option>
                  {warehouseMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber || machine.id.slice(0, 8)} · {machine.machineType === "SMART_IOT" ? T.MACHINES.SMART : machine.machineType === "CONVENTIONAL" ? T.MACHINES.CONVENTIONAL : T.MACHINES.UNCLASSIFIED} · {machine.id}</option>)}
                </select>
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-start-date">
                <span>Ngày bắt đầu *</span>
                <input id="moderator-contract-start-date" name="startDate" type="date" required value={form.startDate} onChange={(event) => setField("startDate", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-end-date">
                <span>Ngày kết thúc *</span>
                <input id="moderator-contract-end-date" name="endDate" type="date" required min={form.startDate || undefined} value={form.endDate} onChange={(event) => setField("endDate", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-monthly-rental-fee">
                <span>Phí thuê hàng tháng (VND) *</span>
                <input id="moderator-contract-monthly-rental-fee" name="monthlyRentalFee" type="number" min="0" step="any" required value={form.monthlyRentalFee} onChange={(event) => setField("monthlyRentalFee", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-payg-unit-price">
                <span>Đơn giá PAYG (VND / đơn vị)</span>
                <input id="moderator-contract-payg-unit-price" name="paygUnitPrice" type="number" min="0" step="any" value={form.paygUnitPrice} onChange={(event) => setField("paygUnitPrice", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-installation-fee">
                <span>Phí lắp đặt (VND)</span>
                <input id="moderator-contract-installation-fee" name="installationFee" type="number" min="0" step="any" value={form.installationFee} onChange={(event) => setField("installationFee", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-deposit-amount">
                <span>Tiền cọc (VND)</span>
                <input id="moderator-contract-deposit-amount" name="depositAmount" type="number" min="0" step="any" value={form.depositAmount} onChange={(event) => setField("depositAmount", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-offline-limit">
                <span>Giới hạn offline (phút)</span>
                <input id="moderator-contract-offline-limit" name="offlineLimitMinutes" type="number" min="1" step="1" value={form.offlineLimitMinutes} onChange={(event) => setField("offlineLimitMinutes", event.target.value)} />
              </label>
              <label className={styles.formField} htmlFor="moderator-contract-terms">
                <span>Điều khoản *</span>
                <textarea id="moderator-contract-terms" name="terms" required rows={4} value={form.terms} onChange={(event) => setField("terms", event.target.value)} />
              </label>
            </div>

            <div className={styles.contractSnapshot}>
              <h3>Snapshot điều khoản vận hành</h3>
              <div className={styles.formRow}>
                <label className={styles.formField}>
                  <span>Phiên bản policy</span>
                  <input value="1" readOnly aria-label="Phiên bản policy" />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-maintenance-interval">
                  <span>Chu kỳ bảo trì (tháng) *</span>
                  <input id="moderator-contract-maintenance-interval" name="contractTermsSnapshot.maintenanceIntervalMonths" type="number" min="1" max="24" step="1" required value={form.contractTermsSnapshot.maintenanceIntervalMonths} onChange={(event) => setSnapshotField("maintenanceIntervalMonths", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-maintenance-window">
                  <span>Thời hạn bảo trì (ngày) *</span>
                  <input id="moderator-contract-maintenance-window" name="contractTermsSnapshot.maintenanceWindowDays" type="number" min="0" max="30" step="1" required value={form.contractTermsSnapshot.maintenanceWindowDays} onChange={(event) => setSnapshotField("maintenanceWindowDays", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-payment-due-days">
                  <span>Số ngày thanh toán được phép *</span>
                  <input id="moderator-contract-payment-due-days" name="contractTermsSnapshot.paymentDueEligibleDays" type="number" min="1" max="60" step="1" required value={form.contractTermsSnapshot.paymentDueEligibleDays} onChange={(event) => setSnapshotField("paymentDueEligibleDays", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-repair-responsibility">
                  <span>Trách nhiệm chi phí sửa chữa *</span>
                  <select id="moderator-contract-repair-responsibility" name="contractTermsSnapshot.repairCostResponsibility" value={form.contractTermsSnapshot.repairCostResponsibility} onChange={(event) => setSnapshotField("repairCostResponsibility", event.target.value as ContractFormState["contractTermsSnapshot"]["repairCostResponsibility"])}>
                    <option value="UNKNOWN">Chưa xác định</option><option value="TENANT">Bên thuê</option><option value="COMPANY">Công ty</option>
                  </select>
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-payment-destination">
                  <span>Mã tham chiếu nơi nhận thanh toán</span>
                  <input id="moderator-contract-payment-destination" name="contractTermsSnapshot.paymentDestinationReference" type="text" maxLength={128} value={form.contractTermsSnapshot.paymentDestinationReference} onChange={(event) => setSnapshotField("paymentDestinationReference", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-offline-action">
                  <span>Hành động khi máy offline vượt giới hạn *</span>
                  <input id="moderator-contract-offline-action" name="contractTermsSnapshot.offlineViolationAction" type="text" required maxLength={64} value={form.contractTermsSnapshot.offlineViolationAction} onChange={(event) => setSnapshotField("offlineViolationAction", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-buyback-valuation">
                  <span>Phương pháp định giá mua lại *</span>
                  <input id="moderator-contract-buyback-valuation" name="contractTermsSnapshot.buybackValuationMethod" type="text" required maxLength={64} value={form.contractTermsSnapshot.buybackValuationMethod} onChange={(event) => setSnapshotField("buybackValuationMethod", event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="moderator-contract-buyback-minimum">
                  <span>Số tháng tối thiểu để mua lại *</span>
                  <input id="moderator-contract-buyback-minimum" name="contractTermsSnapshot.buybackMinimumMonths" type="number" min="0" max="120" step="1" required value={form.contractTermsSnapshot.buybackMinimumMonths} onChange={(event) => setSnapshotField("buybackMinimumMonths", event.target.value)} />
                </label>
                <div className={styles.formField}>
                  <span>Loại máy thay thế được phép</span>
                  <div className={styles.contractCheckboxGroup}>
                    <label><input type="checkbox" name="contractTermsSnapshot.allowedReplacementMachineTypes" value="CONVENTIONAL" checked={form.contractTermsSnapshot.allowedReplacementMachineTypes.includes("CONVENTIONAL")} onChange={(event) => toggleReplacementMachineType("CONVENTIONAL", event.target.checked)} /><span>{T.MACHINES.CONVENTIONAL}</span></label>
                    <label><input type="checkbox" name="contractTermsSnapshot.allowedReplacementMachineTypes" value="SMART_IOT" checked={form.contractTermsSnapshot.allowedReplacementMachineTypes.includes("SMART_IOT")} onChange={(event) => toggleReplacementMachineType("SMART_IOT", event.target.checked)} /><span>{T.MACHINES.SMART}</span></label>
                  </div>
                </div>
                <label className={`${styles.formField} ${styles.contractCheckbox}`}>
                  <input type="checkbox" name="contractTermsSnapshot.buybackEnabled" checked={form.contractTermsSnapshot.buybackEnabled} onChange={(event) => setSnapshotField("buybackEnabled", event.target.checked)} />
                  <span>Cho phép mua lại máy</span>
                </label>
              </div>
            </div>
          </fieldset>

          {owners.data?.length === 0 && <p className={styles.contractNotice} role="status">{T.CONTRACTS.NO_OWNERS}</p>}
          {owners.isError && <p className={styles.contractNotice} role="alert">{T.CONTRACTS.UNKNOWN_OWNER}. {getApiErrorMessage(owners.error)} <ButtonBar type="button" onClick={() => void owners.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.isError && <p className={styles.contractNotice} role="alert">{getApiErrorMessage(machines.error)} <ButtonBar type="button" onClick={() => void machines.refetch()}>{T.COMMON.RETRY}</ButtonBar></p>}
          {machines.data && warehouseMachines.length === 0 && <p className={styles.contractNotice} role="status">{T.CONTRACTS.NO_WAREHOUSE_MACHINES}</p>}
          {requestError && <p className={`${styles.contractNotice} ${styles.contractError}`} role="alert">{requestError}</p>}
          {createdContractId && <p className={styles.contractNotice} role="status">{T.CONTRACTS.CREATED} Mã hợp đồng: {createdContractId}</p>}
          {blockResubmit && <p className={styles.contractNotice} role="status">Vì kết quả gửi yêu cầu chưa xác định, hãy kiểm tra danh sách hợp đồng trước khi thử tạo lại.</p>}
          <div className={styles.contractActions}>
            <ButtonBar type="submit" disabled={submitDisabled}>{create.isPending ? T.CONTRACTS.CREATING : createdContractId ? "Đã tạo" : T.CONTRACTS.CREATE_SUBMIT}</ButtonBar>
          </div>
        </form>
      </section>
    </div>
  );
}
