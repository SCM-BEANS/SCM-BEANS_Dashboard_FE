import axios from "axios";
import Cookies from "js-cookie";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { hasAdminRole } from "@/lib/auth-role";
import {
  ActivateContractRequestSchema,
  ContractTermsSnapshotSchema,
  type Contract,
  type ContractTermsSnapshot,
} from "@/schema/contracts.schema";
import styles from "./contract-activation-panel.module.css";

function localDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function parseContractTermsSnapshot(contract: Contract): ContractTermsSnapshot | null {
  const candidates: unknown[] = [contract.contractTermsSnapshot, contract.termsSnapshot];

  for (const candidate of candidates) {
    let value = candidate;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value) as unknown;
      } catch {
        continue;
      }
    }

    if (value && typeof value === "object" && "contractTermsSnapshot" in value) {
      value = (value as { contractTermsSnapshot?: unknown }).contractTermsSnapshot;
    }

    const parsed = ContractTermsSnapshotSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  }

  return null;
}

function parseContractTermsSnapshotInput(value: string): ContractTermsSnapshot | null {
  try {
    const parsed = ContractTermsSnapshotSchema.safeParse(JSON.parse(value) as unknown);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function getActivationTerms(contract: Contract): string {
  const terms = contract.terms?.trim();
  if (terms) return terms;

  const termsSnapshot = contract.termsSnapshot?.trim();
  if (!termsSnapshot) return "";
  try {
    const parsed = JSON.parse(termsSnapshot) as { terms?: unknown };
    if (typeof parsed.terms === "string" && parsed.terms.trim()) return parsed.terms.trim();
  } catch {
    // Older contract responses may store the terms snapshot as plain text.
  }
  return termsSnapshot;
}

export function ContractActivationPanel({ contract }: { contract: Contract }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [effectiveStartDate, setEffectiveStartDate] = useState(
    () => contract.startDate?.slice(0, 10) || localDate(),
  );
  const [termsInput, setTermsInput] = useState(() => getActivationTerms(contract));
  const [contractTermsSnapshotInput, setContractTermsSnapshotInput] = useState(() => {
    const snapshot = parseContractTermsSnapshot(contract);
    return snapshot ? JSON.stringify(snapshot, null, 2) : "";
  });
  const canCheckPrerequisites = contract.status === "DRAFT" && Boolean(contract.ownerId && contract.machineId);

  useEffect(() => {
    setIsAdmin(hasAdminRole(Cookies.get("access_token") ?? ""));
  }, []);

  useEffect(() => {
    setEffectiveStartDate(contract.startDate?.slice(0, 10) || localDate());
    setTermsInput(getActivationTerms(contract));
    const snapshot = parseContractTermsSnapshot(contract);
    setContractTermsSnapshotInput(snapshot ? JSON.stringify(snapshot, null, 2) : "");
  }, [contract.id, contract.startDate, contract.terms, contract.termsSnapshot, contract.contractTermsSnapshot]);

  const documents = useQuery({
    queryKey: ["dolores", "contract-documents", contract.id],
    queryFn: ({ signal }) => contractsApi.getDocuments(contract.id, signal),
    enabled: canCheckPrerequisites,
    retry: false,
  });
  const completedWorkOrder = useQuery({
    queryKey: ["dolores", "contract-activation-work-order", contract.id, contract.ownerId, contract.machineId],
    enabled: canCheckPrerequisites,
    retry: false,
    queryFn: async ({ signal }) => {
      const workOrders = await installationWorkOrdersApi.listByOwner(contract.ownerId, signal);
      const candidates = workOrders.filter((workOrder) =>
        workOrder.status === "COMPLETED" &&
        workOrder.ownerId === contract.ownerId &&
        workOrder.contractId === contract.id &&
        workOrder.machineId === contract.machineId,
      );

      for (const candidate of candidates) {
        const details = await installationWorkOrdersApi.getById(candidate.id, signal);
        const workOrder = details.workOrder;
        if (
          workOrder.status === "COMPLETED" &&
          workOrder.contractId === contract.id &&
          workOrder.machineId === contract.machineId &&
          workOrder.ownerId === contract.ownerId
        ) {
          return workOrder;
        }
      }
      return null;
    },
  });
  const contractTermsSnapshot = parseContractTermsSnapshotInput(contractTermsSnapshotInput);
  const terms = termsInput.trim();
  const activationRequest = ActivateContractRequestSchema.safeParse({
    effectiveStartDate,
    terms,
    contractTermsSnapshot,
  });
  const activate = useMutation({
    mutationFn: () => {
      if (!activationRequest.success) throw activationRequest.error;
      return contractsApi.activate(contract.id, activationRequest.data);
    },
    onSuccess: async () => {
      setConfirming(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract", contract.id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts", "id", contract.id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-documents", contract.id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-activation-work-order", contract.id] }),
      ]);
    },
  });

  const hasMainContract = documents.data?.some((document) =>
    document.documentType === "MAIN_CONTRACT" && !document.archivedAt,
  ) ?? false;
  const adminCanRelyOnServerCheck = isAdmin && axios.isAxiosError(completedWorkOrder.error) && completedWorkOrder.error.response?.status === 403;
  const hasCompletedWorkOrder = Boolean(completedWorkOrder.data) || adminCanRelyOnServerCheck;
  const ready = canCheckPrerequisites && hasMainContract && hasCompletedWorkOrder && activationRequest.success;
  const isChecking = documents.isPending || completedWorkOrder.isPending;

  if (contract.status === "ACTIVE") {
    return <section className={styles.panel} role="status"><h2>Hợp đồng đã kích hoạt</h2><p>Máy đã được triển khai theo hợp đồng này.</p></section>;
  }
  if (contract.status !== "DRAFT") return null;

  return (
    <section className={styles.panel} aria-labelledby="contract-activation-title">
      <h2 id="contract-activation-title">Kích hoạt hợp đồng</h2>
      <p className={styles.description}>Bước này dành cho Admin hoặc Moderator. Máy chủ chỉ kích hoạt khi hồ sơ và lệnh lắp đặt hợp lệ.</p>
      <div className={styles.requestFields}>
        <label className={styles.activationField} htmlFor="contract-effective-start-date">
          <span>Ngày bắt đầu hiệu lực</span>
          <input
            id="contract-effective-start-date"
            name="effectiveStartDate"
            type="date"
            required
            value={effectiveStartDate}
            disabled={activate.isPending}
            onChange={(event) => setEffectiveStartDate(event.target.value)}
          />
        </label>
        <label className={styles.activationField} htmlFor="contract-activation-terms">
          <span>Điều khoản hợp đồng</span>
          <textarea
            id="contract-activation-terms"
            name="terms"
            required
            rows={3}
            value={termsInput}
            disabled={activate.isPending}
            onChange={(event) => setTermsInput(event.target.value)}
          />
        </label>
        <label className={styles.activationField} htmlFor="contract-activation-terms-snapshot">
          <span>Bản chụp điều khoản (JSON)</span>
          <textarea
            id="contract-activation-terms-snapshot"
            name="contractTermsSnapshot"
            required
            rows={10}
            spellCheck={false}
            value={contractTermsSnapshotInput}
            disabled={activate.isPending}
            onChange={(event) => setContractTermsSnapshotInput(event.target.value)}
          />
        </label>
      </div>
      {!terms && <p className={styles.error} role="alert">Hợp đồng chưa có điều khoản hợp lệ để gửi khi kích hoạt.</p>}
      {!contractTermsSnapshot && <p className={styles.error} role="alert">Bản chụp điều khoản phải là JSON hợp lệ và có đủ trường theo yêu cầu kích hoạt.</p>}
      {!contract.machineId && <p className={styles.error} role="alert">Hợp đồng chưa có máy nên chưa thể kích hoạt.</p>}
      {isChecking && <p className={styles.hint} role="status">Đang kiểm tra hợp đồng chính và lệnh lắp đặt đã hoàn tất…</p>}
      {documents.isError && <div className={styles.error} role="alert"><p>{getApiErrorMessage(documents.error)}</p><ButtonBar type="button" onClick={() => void documents.refetch()}>Tải lại</ButtonBar></div>}
      {completedWorkOrder.isError && !adminCanRelyOnServerCheck && <div className={styles.error} role="alert"><p>{getApiErrorMessage(completedWorkOrder.error)}</p><ButtonBar type="button" onClick={() => void completedWorkOrder.refetch()}>Tải lại</ButtonBar></div>}
      {adminCanRelyOnServerCheck && <p className={styles.hint} role="status">API không cho Admin đọc danh sách lệnh; máy chủ sẽ kiểm tra lệnh đã hoàn tất trước khi kích hoạt.</p>}
      {!activationRequest.success && Boolean(terms && contractTermsSnapshot) && <p className={styles.error} role="alert">Ngày bắt đầu hiệu lực không hợp lệ.</p>}
      {!documents.isPending && !documents.isError && !hasMainContract && (
        <p className={styles.error} role="status">Cần tải lên ít nhất một tài liệu loại MAIN_CONTRACT chưa lưu trữ.</p>
      )}
      {!completedWorkOrder.isPending && !completedWorkOrder.isError && !completedWorkOrder.data && (
        <p className={styles.error} role="status">Chưa có lệnh COMPLETED khớp mã hợp đồng, máy và chủ sở hữu.</p>
      )}
      {activate.isError && <p className={styles.error} role="alert">{getApiErrorMessage(activate.error, "mutation")}</p>}
      {ready && !confirming && (
        <ButtonBar type="button" disabled={activate.isPending} onClick={() => setConfirming(true)}>
          Kích hoạt hợp đồng
        </ButtonBar>
      )}
      {ready && confirming && (
        <div className={styles.confirmation}>
          <p>Xác nhận gửi yêu cầu kích hoạt với ngày hiệu lực {effectiveStartDate}, điều khoản hợp đồng và bản chụp điều khoản?</p>
          <div className={styles.actions}>
            <ButtonBar type="button" disabled={activate.isPending} onClick={() => setConfirming(false)}>Hủy</ButtonBar>
            <ButtonBar type="button" disabled={activate.isPending || !activationRequest.success} onClick={() => activate.mutate()}>
              {activate.isPending ? "Đang kích hoạt…" : "Xác nhận kích hoạt"}
            </ButtonBar>
          </div>
        </div>
      )}
    </section>
  );
}
