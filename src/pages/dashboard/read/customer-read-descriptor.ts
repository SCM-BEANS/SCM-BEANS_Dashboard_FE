import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";

type Availability = "unavailable" | "pending";

export interface CustomerScreenDescriptor {
  title: string;
  description: string;
  availability: Availability;
  actions: ActionBarAction[];
}

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const phaseThreeSections = new Set([
  "contracts/new",
  "contracts/end-early",
  "invoices/payment",
  "invoices/shortfall",
  "invoices/refund",
  "invoices/reminder",
  "invoices/standard-payment",
  "menu/espresso",
  "menu/fresh-milk",
  "menu/add-dish",
  "menu/sent",
  "menu/applied",
]);

function descriptor(
  title: string,
  description: string,
  availability: Availability = "unavailable",
  actions: ActionBarAction[] = [],
): CustomerScreenDescriptor {
  return { title, description, availability, actions };
}

const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  href,
  variant,
});

const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  variant,
  disabled: true,
  describedBy: "customer-read-reason",
});

function getCustomerReadActions(sectionPath: string): ActionBarAction[] {
  if (!sectionPath) {
    return [
      link("Xem máy của tôi", "/dashboard/machines"),
      link("Xem hóa đơn", "/dashboard/invoices", "secondary"),
    ];
  }

  if (sectionPath === "contracts") return [link("Trao đổi hợp đồng mới", "/dashboard/contracts/new")];
  if (sectionPath === "contracts/expiry") {
    return [link("Trao đổi hợp đồng mới", "/dashboard/contracts/new"), blocked("Không tiếp tục thuê", "secondary")];
  }
  if (sectionPath === "contracts/end") {
    return [link("Xem hoàn cọc đã thực hiện", "/dashboard/contracts/deposit-complete"), link("Xem hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath === "contracts/deposit-complete") {
    return [link("Xem quyết toán", "/dashboard/contracts/end"), link("Về hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath.startsWith("contracts/")) {
    return [
      link("Xem hợp đồng", "/dashboard/contracts"),
      link("Đề nghị kết thúc sớm", "/dashboard/contracts/end-early", "secondary"),
      link("Trao đổi hợp đồng mới", "/dashboard/contracts/new", "secondary"),
      link("Theo dõi hoàn cọc", "/dashboard/contracts/end", "secondary"),
    ];
  }

  if (sectionPath === "machines") {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history"), link("Xem hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath === "machines/history") {
    return [link("Gửi yêu cầu hỗ trợ", "/dashboard/support/new"), link("Về máy của tôi", "/dashboard/machines", "secondary")];
  }
  if (sectionPath === "machines/substitute") {
    return [link("Về máy của tôi", "/dashboard/machines"), link("Xem lịch sử máy", "/dashboard/machines/history", "secondary")];
  }
  if (sectionPath.endsWith("/model")) {
    return [link("Về danh sách máy", "/dashboard/machines"), link("Xem menu", "/dashboard/menu", "secondary")];
  }
  if (sectionPath.startsWith("machines/")) {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history"), link("Về máy của tôi", "/dashboard/machines", "secondary")];
  }

  if (sectionPath === "invoices") {
    return [
      link("Gửi chứng từ chuyển khoản", "/dashboard/invoices/payment"),
      blocked("Xem hóa đơn chi tiết", "secondary"),
      link("Nhắc thanh toán", "/dashboard/invoices/reminder", "secondary"),
    ];
  }
  if (sectionPath === "invoices/standard") {
    return [link("Gửi chứng từ bổ sung", "/dashboard/invoices/standard-payment"), link("Về hóa đơn", "/dashboard/invoices", "secondary")];
  }
  if (sectionPath.startsWith("invoices/")) {
    return [link("Gửi chứng từ bổ sung", "/dashboard/invoices/payment"), link("Xem khoản còn thiếu", "/dashboard/invoices/shortfall", "secondary"), link("Xem hoàn tiền thừa", "/dashboard/invoices/refund", "secondary")];
  }

  if (sectionPath === "menu") {
    return [
      link("Thêm món riêng", "/dashboard/menu/add-dish"),
      link("Chỉnh Espresso", "/dashboard/menu/espresso", "secondary"),
      link("Chỉnh cà phê sữa tươi", "/dashboard/menu/fresh-milk", "secondary"),
      link("Về máy của tôi", "/dashboard/machines", "secondary"),
    ];
  }
  if (sectionPath.startsWith("menu/")) {
    return [link("Về menu của tôi", "/dashboard/menu"), link("Thêm món riêng", "/dashboard/menu/add-dish", "secondary")];
  }

  return [link("Về tổng quan", "/dashboard")];
}

export function getCustomerScreenDescriptor(sectionPath: string): CustomerScreenDescriptor {
  if (!sectionPath) {
    return descriptor(messages.OVERVIEW_TITLE, messages.OVERVIEW_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (phaseThreeSections.has(sectionPath)) {
    return descriptor(
      CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
      CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
      "pending",
      getCustomerReadActions(sectionPath),
    );
  }

  if (sectionPath === "contracts") {
    return descriptor(messages.CONTRACTS_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/expiry") {
    return descriptor(messages.CONTRACT_EXPIRY_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/end") {
    return descriptor(messages.CONTRACT_END_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/deposit-complete") {
    return descriptor(messages.DEPOSIT_COMPLETE_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("contracts/")) {
    return descriptor(messages.CONTRACT_DETAIL_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "machines") {
    return descriptor(messages.MACHINES_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/history") {
    return descriptor(messages.MACHINE_HISTORY_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/substitute") {
    return descriptor(messages.MACHINE_SUBSTITUTE_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/") && sectionPath.endsWith("/model")) {
    return descriptor(messages.MACHINE_MODEL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/")) {
    return descriptor(messages.MACHINE_DETAIL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "invoices") {
    return descriptor(messages.INVOICES_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "invoices/standard") {
    return descriptor(messages.STANDARD_INVOICE_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (/^invoices\/\d{4}-\d{2}$/.test(sectionPath)) {
    return descriptor(messages.INVOICE_PERIOD_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("invoices/")) {
    return descriptor(messages.INVOICE_DETAIL_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "menu") {
    return descriptor(messages.MENU_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("menu/")) {
    return descriptor(messages.RECIPE_DETAIL_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  return descriptor(
    CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
    CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    "pending",
    getCustomerReadActions(sectionPath),
  );
}
