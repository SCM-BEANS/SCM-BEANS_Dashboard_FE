import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { StatusBadge } from "@/components/status-badge/status-badge";
import adminStyles from "@/pages/admin/admin-shell.module.css";
import type { Contract } from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";

function date(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
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

export function ContractOverviewPanel({ contract, ownerName }: { contract: Contract; ownerName: string }) {
  const machineId = contract.machineId;
  const contractMachineSerial = contract.machineSerialNumber;
  const serialNumber = typeof contractMachineSerial === "string" ? contractMachineSerial.trim() : "";
  const machine = useQuery({
    queryKey: ["dolores", "machines", "id", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId!, signal),
    enabled: Boolean(machineId) && !serialNumber,
    retry: false,
  });
  return (
    <section className={`${adminStyles.panel} ${adminStyles.contractOverviewPanel}`}>
      <div className={adminStyles.contractOverviewHeading}>
        <h2>{T.CONTRACTS.DETAIL}</h2>
        <StatusBadge status={contract.status}>{contractStatus(contract.status)}</StatusBadge>
      </div>
      <div className={adminStyles.operationsGrid}>
        <div><span>{T.COMMON.OWNER}</span><strong>{ownerName}</strong></div>
        <div><span>Serial</span><strong>{machineId ? (serialNumber || machine.data?.serialNumber || "—") : T.CONTRACTS.NO_MACHINE}</strong></div>
        <div><span>Thời hạn</span><strong>{date(contract.startDate)} – {date(contract.endDate)}</strong></div>
        <div><span>Loại máy</span><strong>{contract.machineTypeSnapshot ?? "—"}</strong></div>
        <div><span>Phí thuê hàng tháng</span><strong>{money(contract.monthlyRentalFee)}</strong></div>
        <div><span>Giá PAYG</span><strong>{money(contract.paygUnitPrice)}</strong></div>
        <div><span>Tiền cọc</span><strong>{money(contract.depositAmount)}</strong></div>
        <div><span>Phí lắp đặt</span><strong>{money(contract.installationFee)}</strong></div>
        <div><span>Giới hạn offline</span><strong>{contract.offlineLimitMinutes == null ? "—" : `${contract.offlineLimitMinutes} phút`}</strong></div>
        <div><span>Ngưỡng mất kết nối</span><strong>{contract.contractTermsSnapshot ? `${contract.contractTermsSnapshot.heartbeatToleranceSeconds ?? 45} giây` : "Chưa có chính sách"}</strong></div>
      </div>
      {(contract.termsSnapshot ?? contract.terms) && <p className={adminStyles.panelSubtitle}>{contract.termsSnapshot ?? contract.terms}</p>}
    </section>
  );
}
