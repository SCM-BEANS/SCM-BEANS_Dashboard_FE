import type { BuybackStatus } from "@/schema/buybacks.schema";

export const buybackStatusLabels: Record<BuybackStatus, string> = {
  REQUESTED: "Chờ tiếp nhận",
  INSPECTION_PENDING: "Chờ kiểm tra máy",
  VALUATION_PENDING: "Đang thẩm định giá",
  APPROVED: "Đã duyệt giá",
  PAYMENT_PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  COLLECTION_PENDING: "Chờ thu máy",
  COLLECTED: "Đã nhận máy",
  REFURBISHING: "Đang tân trang",
  QA_PENDING: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  READY_FOR_REGISTRATION: "Chờ đăng ký máy",
  REGISTERED: "Đã đăng ký máy",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

export function formatBuybackMoney(value: number | null | undefined, currency: string) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)} ${currency}`;
}

export function formatBuybackDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}
