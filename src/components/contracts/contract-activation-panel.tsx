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
  ContractTermsSnapshotResponseSchema,
  type Contract,
  type ContractTermsSnapshot,
} from "@/schema/contracts.schema";
import styles from "./contract-activation-panel.module.css";

function displayDate(value: string): string {
  return value.split("-").reverse().join("/");
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

    const response = ContractTermsSnapshotResponseSchema.safeParse(value);
    if (!response.success) continue;
    const parsed = ContractTermsSnapshotSchema.safeParse({
      ...response.data,
      paymentDestinationReference: response.data.paymentDestinationReference ?? undefined,
      offlineLimitMinutes: response.data.offlineLimitMinutes ?? undefined,
    });
    if (parsed.success) return parsed.data;
  }

  return null;
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
  const canCheckPrerequisites = contract.status === "DRAFT" && Boolean(contract.ownerId && contract.machineId);

  useEffect(() => {
    setIsAdmin(hasAdminRole(Cookies.get("access_token") ?? ""));
  }, []);

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
      ).sort((left, right) => Date.parse(right.completedAt ?? "") - Date.parse(left.completedAt ?? ""));

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
  const contractTermsSnapshot = parseContractTermsSnapshot(contract);
  const terms = getActivationTerms(contract);
  // Preserve the handover's calendar date, matching BE's OffsetDateTime.toLocalDate().
  const effectiveStartDate = completedWorkOrder.data?.completedAt?.slice(0, 10);
  const activationRequest = ActivateContractRequestSchema.safeParse({
    ...(effectiveStartDate ? { effectiveStartDate } : {}),
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
  const hasCompletedWorkOrder = Boolean(effectiveStartDate) || adminCanRelyOnServerCheck;
  const machineType = completedWorkOrder.data?.machineType ?? contract.machineTypeSnapshot;
  const policyIssue = contractTermsSnapshot && (
    contractTermsSnapshot.policyVersion !== 1
      ? "Phiên bản chính sách đã lưu chưa được hỗ trợ. Cần kiểm tra lại hồ sơ hợp đồng trước khi kích hoạt."
      : contractTermsSnapshot.maintenanceWindowDays < 1
        ? "Chính sách đã lưu cần có thời hạn thực hiện bảo trì ít nhất 1 ngày. Cần kiểm tra lại hồ sơ hợp đồng."
        : contractTermsSnapshot.allowedReplacementMachineTypes.length !== 1 || (
          machineType && contractTermsSnapshot.allowedReplacementMachineTypes[0] !== machineType
        )
          ? "Chính sách đã lưu chỉ được cho phép thay thế bằng đúng loại máy của hợp đồng. Cần kiểm tra lại hồ sơ hợp đồng."
          : null
  );
  const commercialIssue = machineType === "SMART_IOT" && !(Number(contract.paygUnitPrice) > 0)
    ? "Hợp đồng máy thông minh chưa có đơn giá PAYG lớn hơn 0. Cần bổ sung trong hồ sơ hợp đồng trước khi kích hoạt."
    : null;
  const dateIssue = effectiveStartDate && contract.endDate && effectiveStartDate >= contract.endDate.slice(0, 10)
    ? "Ngày bàn giao phải trước ngày kết thúc hợp đồng. Cần kiểm tra lại thời hạn hợp đồng."
    : null;
  const ready = canCheckPrerequisites && hasMainContract && hasCompletedWorkOrder && activationRequest.success && !policyIssue && !commercialIssue && !dateIssue;
  const isChecking = documents.isPending || completedWorkOrder.isPending;

  useEffect(() => {
    setConfirming(false);
  }, [contract.id, terms, contract.contractTermsSnapshot, effectiveStartDate]);

  if (contract.status === "ACTIVE") {
    return <section className={styles.panel} role="status"><h2>Hợp đồng đã kích hoạt</h2><p>Máy đã được triển khai theo hợp đồng này.</p></section>;
  }
  if (contract.status !== "DRAFT") return null;

  return (
    <section className={styles.panel} aria-labelledby="contract-activation-title">
      <h2 id="contract-activation-title">Kích hoạt hợp đồng</h2>
      <p className={styles.description}>Thông tin được lấy tự động từ hợp đồng đã lưu và lệnh lắp đặt đã hoàn tất. Admin hoặc Moderator kiểm tra và xác nhận kích hoạt.</p>
      <dl className={styles.summary}>
        <div><dt>Ngày bắt đầu hiệu lực</dt><dd>{effectiveStartDate ? displayDate(effectiveStartDate) : adminCanRelyOnServerCheck ? "Máy chủ tự xác định theo ngày bàn giao" : "Chờ xác nhận ngày bàn giao"}</dd></div>
        <div><dt>Điều khoản hợp đồng</dt><dd>{terms || "Chưa có điều khoản đã lưu"}</dd></div>
      </dl>
      {contractTermsSnapshot && <details className={styles.policy}>
        <summary>Chính sách vận hành đã lưu</summary>
        <dl className={styles.summary}>
          <div><dt>Chu kỳ bảo trì</dt><dd>{contractTermsSnapshot.maintenanceIntervalMonths} tháng</dd></div>
          <div><dt>Thời hạn thực hiện bảo trì</dt><dd>{contractTermsSnapshot.maintenanceWindowDays} ngày</dd></div>
          <div><dt>Loại máy được thay thế</dt><dd>{contractTermsSnapshot.allowedReplacementMachineTypes.map((type) => type === "SMART_IOT" ? "Máy thông minh" : "Máy thông thường").join(", ")}</dd></div>
          <div><dt>Bên chịu chi phí sửa chữa</dt><dd>{{ TENANT: "Khách hàng", COMPANY: "Công ty", UNKNOWN: "Chưa xác định" }[contractTermsSnapshot.repairCostResponsibility]}</dd></div>
          <div><dt>Thời hạn thanh toán</dt><dd>{contractTermsSnapshot.paymentDueEligibleDays} ngày</dd></div>
          <div><dt>Thông tin tham chiếu thanh toán</dt><dd>{contractTermsSnapshot.paymentDestinationReference || "Chưa có"}</dd></div>
          <div><dt>Xử lý mất kết nối</dt><dd>{contractTermsSnapshot.offlineViolationAction === "WARN_ONLY" ? "Cảnh báo" : "Rà soát thủ công"}</dd></div>
          <div><dt>Giới hạn mất kết nối</dt><dd>{contractTermsSnapshot.offlineLimitMinutes == null ? "Theo chính sách mặc định của hệ thống" : `${contractTermsSnapshot.offlineLimitMinutes} phút`}</dd></div>
          <div><dt>Cho phép mua lại máy</dt><dd>{contractTermsSnapshot.buybackEnabled ? "Có" : "Không"}</dd></div>
          {contractTermsSnapshot.buybackEnabled && <>
            <div><dt>Thời gian tối thiểu để mua lại</dt><dd>{contractTermsSnapshot.buybackMinimumMonths} tháng</dd></div>
            <div><dt>Phương pháp định giá mua lại</dt><dd>Thẩm định thủ công</dd></div>
          </>}
        </dl>
      </details>}
      {!terms && <p className={styles.error} role="alert">Hợp đồng chưa có điều khoản đã lưu hợp lệ. Cần bổ sung hồ sơ hợp đồng trước khi kích hoạt.</p>}
      {!contractTermsSnapshot && <p className={styles.error} role="alert">Hợp đồng chưa có chính sách vận hành đã lưu hợp lệ. Cần bổ sung hồ sơ hợp đồng trước khi kích hoạt.</p>}
      {policyIssue && <p className={styles.error} role="alert">{policyIssue}</p>}
      {commercialIssue && <p className={styles.error} role="alert">{commercialIssue}</p>}
      {dateIssue && <p className={styles.error} role="alert">{dateIssue}</p>}
      {!contract.machineId && <p className={styles.error} role="alert">Hợp đồng chưa có máy nên chưa thể kích hoạt.</p>}
      {isChecking && <p className={styles.hint} role="status">Đang kiểm tra hợp đồng chính và lệnh lắp đặt đã hoàn tất…</p>}
      {documents.isError && <div className={styles.error} role="alert"><p>{getApiErrorMessage(documents.error)}</p><ButtonBar type="button" onClick={() => void documents.refetch()}>Tải lại</ButtonBar></div>}
      {completedWorkOrder.isError && !adminCanRelyOnServerCheck && <div className={styles.error} role="alert"><p>{getApiErrorMessage(completedWorkOrder.error)}</p><ButtonBar type="button" onClick={() => void completedWorkOrder.refetch()}>Tải lại</ButtonBar></div>}
      {adminCanRelyOnServerCheck && <p className={styles.hint} role="status">Ngày hiệu lực sẽ được máy chủ xác định từ lệnh bàn giao đã hoàn tất khi kích hoạt.</p>}
      {completedWorkOrder.data && !effectiveStartDate && <p className={styles.error} role="alert">Lệnh lắp đặt đã hoàn tất nhưng chưa có ngày bàn giao. Cần kiểm tra lại lệnh lắp đặt.</p>}
      {!documents.isPending && !documents.isError && !hasMainContract && (
        <p className={styles.error} role="status">Cần tải lên ít nhất một tài liệu loại MAIN_CONTRACT chưa lưu trữ.</p>
      )}
      {!completedWorkOrder.isPending && !completedWorkOrder.isError && !completedWorkOrder.data && (
        <p className={styles.error} role="status">Chưa có lệnh COMPLETED khớp mã hợp đồng, máy và chủ sở hữu.</p>
      )}
      {activate.isError && <p className={styles.error} role="alert">{getApiErrorMessage(activate.error, "mutation")}</p>}
      {(!ready || !confirming) && (
        <div className={styles.actions}>
          <ButtonBar type="button" disabled={!ready || activate.isPending} aria-describedby={!ready ? "contract-activation-blocked-hint" : undefined} onClick={() => setConfirming(true)}>
            Kích hoạt hợp đồng
          </ButtonBar>
          {!ready && <p id="contract-activation-blocked-hint" className={styles.hint}>Cần xử lý các thông báo phía trên trước khi kích hoạt hợp đồng.</p>}
        </div>
      )}
      {ready && confirming && (
        <div className={styles.confirmation}>
          <p>Xác nhận kích hoạt hợp đồng với điều khoản và chính sách đã lưu{effectiveStartDate ? `, có hiệu lực từ ngày bàn giao ${displayDate(effectiveStartDate)}` : ", có hiệu lực từ ngày bàn giao do máy chủ xác định"}?</p>
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
