import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { contractsApi } from "@/apis/contracts.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { useRepairCaseCostDispute } from "./use-repair-case-cost-dispute";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import type { RepairCase } from "@/schema/machines.schema";
import styles from "./repair-workflow.module.css";

export function ReplacementActions({ repairCase, refresh }: { repairCase: RepairCase; refresh: () => Promise<void> }) {
  const [dialog, setDialog] = useState<"offer" | "emergency" | null>(null);
  const [machineId, setMachineId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("");
  const dispute = useRepairCaseCostDispute(repairCase.id);
  const primary = useQuery({ queryKey: ["offer-primary", repairCase.primaryMachineId], queryFn: ({ signal }) => machinesApi.getById(repairCase.primaryMachineId, signal), enabled: dialog === "offer" });
  const contract = useQuery({ queryKey: ["offer-contract", repairCase.contractId], queryFn: ({ signal }) => contractsApi.getById(repairCase.contractId, signal), enabled: dialog === "offer" });
  const candidates = useQuery({ queryKey: ["offer-candidates", primary.data?.machineType], queryFn: ({ signal }) => machinesApi.listRentalCandidates(signal, { machineType: primary.data?.machineType === "CONVENTIONAL" ? "SMART_IOT" : "CONVENTIONAL", size: 100 }), enabled: dialog === "offer" && Boolean(primary.data?.machineType) });
  const mutation = useMutation({ mutationFn: async () => dialog === "offer" ? repairCasesApi.offerFallback(repairCase.id, { replacementMachineId: machineId, startAt: localSeconds(startAt || (contract.data?.startDate ? `${contract.data.startDate.slice(0, 10)}T00:00` : "")), endAt: localSeconds(endAt || (contract.data?.endDate ? `${contract.data.endDate.slice(0, 10)}T00:00` : "")), reason }) : repairCasesApi.authorizeEmergencyWork(repairCase.id, { reason, workScope: scope }), onSuccess: async () => { setDialog(null); setReason(""); setScope(""); await refresh(); } });
  const from = contract.data?.startDate?.slice(0, 10);
  const to = contract.data?.endDate?.slice(0, 10);
  const start = startAt || (from ? `${from}T00:00` : "");
  const end = endAt || (to ? `${to}T00:00` : "");
  const eligible = candidates.data?.filter(item => item.machineType && item.machineType !== primary.data?.machineType && item.machineId !== repairCase.primaryMachineId && item.status === "IN_WAREHOUSE") ?? [];
  const canOffer = ["WAITING_REPLACEMENT", "WAITING_OWNER_DECISION"].includes(repairCase.status);
  const canAuthorize = ["DIAGNOSIS", "REPAIR_IN_PROGRESS"].includes(repairCase.status) && dispute.isDisputed && dispute.review?.maintenanceTicketId === repairCase.maintenanceTicketId;
  return <>
    {canOffer && <ButtonBar type="button" onClick={() => { mutation.reset(); setDialog("offer"); }}>Đề xuất máy khác loại</ButtonBar>}
    {canAuthorize && <ButtonBar type="button" onClick={() => { mutation.reset(); setDialog("emergency"); }}>Cho phép xử lý khẩn cấp</ButtonBar>}
    {dialog && <NotificationDialog variant="confirm" title={dialog === "offer" ? "Đề xuất máy khác loại" : "Cho phép xử lý khẩn cấp"} description={dialog === "offer" ? "Chọn máy và thời gian trong thời hạn hợp đồng." : "Cho phép công việc trong phạm vi cụ thể khi chi phí đang tranh chấp."} onClose={() => setDialog(null)} primaryAction={{ label: "Xác nhận", pending: mutation.isPending, disabled: mutation.isPending || !reason.trim() || (dialog === "emergency" ? !scope.trim() : !machineId || !start || !end || start >= end || !from || !to || start < `${from}T00:00` || end > `${to}T00:00`), onClick: () => mutation.mutate() }} secondaryAction={{ label: "Hủy", disabled: mutation.isPending, onClick: () => setDialog(null) }}>
      <div className={styles.assignmentForm}>
        {dialog === "offer" && <>
          <label className={styles.formField}>Máy thay thế<select value={machineId} onChange={e => setMachineId(e.target.value)}><option value="">Chọn máy</option>{eligible.map(item => <option key={item.machineId} value={item.machineId}>{item.displayName || item.serialNumber || item.machineId}</option>)}</select></label>
          {(primary.isError || candidates.isError || contract.isError) && <p role="alert">Không thể tải máy hoặc hợp đồng. Vui lòng thử lại.</p>}
          <label className={styles.formField}>Bắt đầu<input type="datetime-local" min={from ? `${from}T00:00` : undefined} max={to ? `${to}T00:00` : undefined} value={start} onChange={e => setStartAt(e.target.value)} /></label>
          <label className={styles.formField}>Kết thúc<input type="datetime-local" min={start} max={to ? `${to}T00:00` : undefined} value={end} onChange={e => setEndAt(e.target.value)} /></label>
        </>}
        <label className={styles.formField}>Lý do<textarea maxLength={dialog === "offer" ? 1000 : 2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
        {dialog === "emergency" && <label className={styles.formField}>Phạm vi công việc<textarea maxLength={2000} value={scope} onChange={e => setScope(e.target.value)} /></label>}
        {mutation.isError && <p role="alert">{getRecipeApiErrorMessage(mutation.error, "mutation")}</p>}
      </div>
    </NotificationDialog>}
  </>;
}
function localSeconds(value: string) { return value.length === 16 ? `${value}:00` : value; }
