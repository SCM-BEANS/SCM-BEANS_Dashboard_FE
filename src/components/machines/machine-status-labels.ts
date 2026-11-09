import type { Machine } from "@/schema/machines.schema";

export const MACHINE_STATUS_LABELS: Record<NonNullable<Machine["status"]>, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

export function machineStatusLabel(status: Machine["status"]): string {
  return status ? MACHINE_STATUS_LABELS[status] : "—";
}

export function ownerMachineStatusLabel(status: Machine["status"]): string {
  if (status === "DEPLOYED_CONTRACT_OWNER" || status === "DEPLOYED_STORE_OWNER") return "Đang hoạt động";
  return machineStatusLabel(status);
}
