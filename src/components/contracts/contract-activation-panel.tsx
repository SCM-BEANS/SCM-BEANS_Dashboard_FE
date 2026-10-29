import axios from "axios";
import Cookies from "js-cookie";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { contractsApi } from "@/apis/contracts.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { hasAdminRole } from "@/lib/auth-role";
import type { Contract } from "@/schema/contracts.schema";
import styles from "./contract-activation-panel.module.css";

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
      const workOrders = await installationWorkOrdersApi.listByTenant(contract.ownerId, signal);
      const candidates = workOrders.filter((workOrder) =>
        workOrder.status === "COMPLETED" &&
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
  const activate = useMutation({
    mutationFn: () => contractsApi.activate(contract.id),
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
  const ready = canCheckPrerequisites && hasMainContract && hasCompletedWorkOrder;
  const isChecking = documents.isPending || completedWorkOrder.isPending;

  if (contract.status === "ACTIVE") {
    return <section className={styles.panel} role="status"><h2>Hợp đồng đã kích hoạt</h2><p>Máy đã được triển khai theo hợp đồng này.</p></section>;
  }
  if (contract.status !== "DRAFT") return null;

  return (
    <section className={styles.panel} aria-labelledby="contract-activation-title">
      <h2 id="contract-activation-title">Kích hoạt hợp đồng</h2>
      <p className={styles.description}>Bước này dành cho Admin hoặc Moderator. Máy chủ chỉ kích hoạt khi hồ sơ và lệnh lắp đặt hợp lệ.</p>
      {!contract.machineId && <p className={styles.error} role="alert">Hợp đồng chưa có máy nên chưa thể kích hoạt.</p>}
      {isChecking && <p className={styles.hint} role="status">Đang kiểm tra hợp đồng chính và lệnh lắp đặt đã hoàn tất…</p>}
      {documents.isError && <div className={styles.error} role="alert"><p>{getApiErrorMessage(documents.error)}</p><ButtonBar type="button" onClick={() => void documents.refetch()}>Tải lại</ButtonBar></div>}
      {completedWorkOrder.isError && !adminCanRelyOnServerCheck && <div className={styles.error} role="alert"><p>{getApiErrorMessage(completedWorkOrder.error)}</p><ButtonBar type="button" onClick={() => void completedWorkOrder.refetch()}>Tải lại</ButtonBar></div>}
      {adminCanRelyOnServerCheck && <p className={styles.hint} role="status">API không cho Admin đọc danh sách lệnh; máy chủ sẽ kiểm tra lệnh đã hoàn tất trước khi kích hoạt.</p>}
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
          <p>Xác nhận chuyển hợp đồng sang ACTIVE và triển khai máy cho chủ sở hữu?</p>
          <div className={styles.actions}>
            <ButtonBar type="button" disabled={activate.isPending} onClick={() => setConfirming(false)}>Hủy</ButtonBar>
            <ButtonBar type="button" disabled={activate.isPending} onClick={() => activate.mutate()}>
              {activate.isPending ? "Đang kích hoạt…" : "Xác nhận kích hoạt"}
            </ButtonBar>
          </div>
        </div>
      )}
    </section>
  );
}
