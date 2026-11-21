export const CONTRACT_LIST_MESSAGES = {
  PAGE_TITLE: "Hợp đồng",
  PAGE_DESCRIPTION: "Tra cứu và quản lý hợp đồng thuê máy.",
  PANEL_TITLE: "Danh sách hợp đồng",
  SEARCH_LABEL: "Tìm hợp đồng",
  STATUS_FILTER: "Lọc hợp đồng theo trạng thái",
  STATUS_ALL: "Tất cả trạng thái",
  STATUS_ACTIVE: "Đang hiệu lực",
  STATUS_DRAFT: "Bản nháp",
  STATUS_TERMINATED: "Đã chấm dứt",
  MACHINE_TYPE_FILTER: "Lọc hợp đồng theo loại máy",
  MACHINE_TYPE_ALL: "Tất cả loại máy",
  MACHINE_TYPE_CONVENTIONAL: "Máy thường",
  MACHINE_TYPE_SMART: "Smart IoT",
  SEARCH_SUBMIT: "Tìm kiếm",
  PREVIOUS: "Trang trước",
  NEXT: "Trang sau",
  PAGINATION_LABEL: "Phân trang hợp đồng",
  OWNER_SCOPE: "Bạn",
} as const;

export const ADMIN_CONTRACT_LIST_TITLE = CONTRACT_LIST_MESSAGES.PAGE_TITLE;
export const ADMIN_CONTRACT_LIST_DESCRIPTION = CONTRACT_LIST_MESSAGES.PAGE_DESCRIPTION;

export const CONTRACT_TABLE_HEADERS = {
  contract: "Mã hợp đồng",
  owner: "Khách hàng",
  machine: "Máy",
  machineType: "Loại máy",
  period: "Thời hạn",
  status: "Trạng thái",
} as const;

export const CONTRACT_EXPIRY_DECISION_LABELS: Record<string, string> = {
  CONTINUE: "Gia hạn hợp đồng",
  DO_NOT_CONTINUE: "Không gia hạn",
  NO_RESPONSE: "Chưa có phản hồi",
};

export function contractExpiryDecisionLabel(value: string | null | undefined): string {
  return value ? CONTRACT_EXPIRY_DECISION_LABELS[value] ?? "Quyết định khác" : "Chưa có quyết định";
}
