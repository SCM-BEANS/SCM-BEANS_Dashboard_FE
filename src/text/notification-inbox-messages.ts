export const NOTIFICATION_INBOX_MESSAGES = {
  LIST_TITLE: "Danh sách thông báo",
  FILTER_LABEL: "Lọc thông báo",
  FILTER_ALL: "Tất cả",
  FILTER_UNREAD: "Chưa đọc",
  UNREAD_COUNT: "Thông báo chưa đọc",
  MARK_ALL: "Đánh dấu tất cả đã đọc",
  MARK_ONE: "Đánh dấu đã đọc",
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
} as const;

export function getNotificationPresentation(notification: { type: string; title: string; message: string }) {
  if (notification.type !== "MACHINE_GPS_SIGNAL_MISSING") {
    return { title: notification.title, message: notification.message, typeLabel: notification.type };
  }
  const machineId = /\bMachine\s+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i.exec(notification.message)?.[1];
  return {
    title: `${machineId ? `Máy ${machineId.slice(0, 8).toUpperCase()}` : "Máy"} chưa gửi được vị trí GPS`,
    typeLabel: "Vị trí GPS",
    message: "Tại thời điểm cảnh báo, máy vẫn kết nối nhưng chưa gửi vị trí GPS hợp lệ. Hãy kiểm tra quyền truy cập vị trí trên thiết bị và anten GPS; liên hệ kỹ thuật viên nếu tình trạng này tiếp tục.",
  };
}
