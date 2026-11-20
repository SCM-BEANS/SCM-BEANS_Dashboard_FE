const labels: Record<string, string> = {
  CREATED: "Tạo lệnh thu hồi",
  ASSIGNED: "Phân công nhận máy",
  PICKUP_STARTED: "Bắt đầu nhận máy",
  EVIDENCE_UPLOADED: "Bổ sung chứng từ",
  PICKUP_CONFIRMED: "Xác nhận đã nhận máy",
  OWNER_HANDOVER_ACKNOWLEDGED: "Khách hàng xác nhận bàn giao",
  DEPOT_RECEIPT_SUBMITTED: "Gửi biên nhận kho",
  DEPOT_RECEIPT_APPROVED: "Duyệt tiếp nhận tại kho",
  DEPOT_RECEIPT_REJECTED: "Từ chối biên nhận kho",
  LEGACY_REVIEWED: "Rà soát hồ sơ cũ",
  CANCELLED: "Hủy lệnh thu hồi",
};

export function recallEventLabel(eventType: string) {
  return labels[eventType] || eventType.replaceAll("_", " ");
}
