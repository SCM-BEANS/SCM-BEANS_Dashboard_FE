export const NOTIFICATION_INBOX_MESSAGES = {
  LIST_TITLE: "Danh sách thông báo",
  FILTER_LABEL: "Lọc thông báo",
  FILTER_ALL: "Tất cả",
  FILTER_UNREAD: "Chưa đọc",
  UNREAD_COUNT: "Thông báo chưa đọc",
  MARK_ALL: "Đánh dấu tất cả đã đọc",
  MARKING: "Đang cập nhật…",
  REFRESH: "Làm mới",
  READ: "Đã đọc",
  UNREAD: "Chưa đọc",
  OWNER_ID: "Mã chủ sở hữu",
  MARKED_ONE: "Đã đánh dấu thông báo là đã đọc.",
  MARKED_ALL: "Đã đánh dấu tất cả thông báo là đã đọc.",
  MARK_ERROR: "Không thể cập nhật thông báo.",
  LOAD_ERROR: "Không thể tải danh sách thông báo.",
  COUNT_ERROR: "Không thể tải số thông báo chưa đọc.",
  LOADING: "Đang tải thông báo…",
  EMPTY: "Không có thông báo để hiển thị.",
  RETRY: "Thử lại",
  CLOSE: "Đóng thông báo",
  VIEW_ALL: "Xem tất cả thông báo",
  BACK_TO_LIST: "Quay lại danh sách",
  DETAIL_NOT_FOUND: "Không tìm thấy thông báo này trong danh sách hiện tại.",
  ALERTS_PER_PAGE: "10 cảnh báo / trang",
  NOTIFICATIONS_PER_PAGE: "10 thông báo / trang",
  PAGINATE_ALERTS: "Phân trang cảnh báo",
  PAGINATE_NOTIFICATIONS: "Phân trang thông báo",
  SEARCH_NOTIFICATIONS: "Tìm thông báo",
  SEARCH_NOTIFICATIONS_PLACEHOLDER: "Tìm thông báo",
  FILTER_NOTIFICATION_TYPE: "Loại thông báo",
  FILTER_ALL_NOTIFICATION_TYPES: "Tất cả loại",
  FILTER_READ_STATE: "Trạng thái thông báo",
  PREVIOUS_PAGE: "Trang trước",
  NEXT_PAGE: "Trang sau",
} as const;

const TYPE_LABELS: Record<string, string> = {
  CONTRACT_EXPIRING: "Hợp đồng",
  INSTALLATION_WORK_ORDER: "Lắp đặt",
  REPAIR_COST_REVIEW: "Sửa chữa",
  MAINTENANCE: "Bảo trì",
  REFUND: "Hoàn tiền",
  RESPONSE: "Hợp đồng",
  INFO: "Thông báo",
};
const UUID = /\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export const ALERT_LEVEL_LABELS: Record<string, string> = { CRITICAL: "Nghiêm trọng", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp", INFO: "Thông tin", WASTAGE_ANOMALY: "Hao hụt bất thường" };

export function getAlertPresentation(alert: { level: string; message: string }) {
  const wastage = /^Wastage anomaly detected: ([\d.]+)% exceeds threshold ([\d.]+)%$/i.exec(alert.message);
  return {
    levelLabel: ALERT_LEVEL_LABELS[alert.level.toUpperCase()] ?? "Cảnh báo khác",
    message: alert.level.toUpperCase() === "WASTAGE_ANOMALY" && wastage
      ? `Tỷ lệ hao hụt ${wastage[1]}% vượt ngưỡng ${wastage[2]}%.`
      : alert.message,
  };
}

// Backend text is English/raw: show short ids, dd/MM/yyyy dates and Vietnamese role names.
function localizeText(text: string, keepFullIds: boolean) {
  const out = text
    .replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3/$2/$1")
    .replace(/\bOwner\b/g, "chủ sở hữu")
    .replace(/\bTechnician\b/g, "kỹ thuật viên");
  return keepFullIds ? out : out.replace(UUID, (_, head: string) => `#${head.toUpperCase()}`);
}

export function getNotificationPresentation(notification: { type: string; title: string; message: string }) {
  if (notification.type !== "MACHINE_GPS_SIGNAL_MISSING") {
    // REPAIR_COST_REVIEW keeps full ids so its profile link can use the Review ID.
    const keepFullIds = notification.type === "REPAIR_COST_REVIEW";
    return {
      title: localizeText(notification.title, true).replace(/^chủ sở hữu/, "Khách hàng"),
      message: localizeText(notification.message, keepFullIds)
        .replace(/\bCONTINUE\b/g, "tiếp tục sử dụng")
        .replace(/\bSubscription\b/g, "gói thuê")
        .replace(/^Refund (#[a-f0-9]+) requires Admin approval\.$/i, "Khoản hoàn tiền $1 đang chờ quản trị viên phê duyệt."),
      typeLabel: TYPE_LABELS[notification.type] ?? "Thông báo",
    };
  }
  const machineId = /\bMachine\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i.exec(notification.message)?.[1];
  return {
    title: `${machineId ? `Máy ${machineId.slice(0, 8).toUpperCase()}` : "Máy"} chưa gửi được vị trí GPS`,
    typeLabel: "Vị trí GPS",
    message: "Tại thời điểm cảnh báo, máy vẫn kết nối nhưng chưa gửi vị trí GPS hợp lệ. Hãy kiểm tra quyền truy cập vị trí trên thiết bị và anten GPS; liên hệ kỹ thuật viên nếu tình trạng này tiếp tục.",
  };
}

export function formatNotificationDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  // "08:00, 11/11/2026" — numeric month avoids vi-VN's "11 thg 11," form.
  const day = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${time}, ${day}`;
}
