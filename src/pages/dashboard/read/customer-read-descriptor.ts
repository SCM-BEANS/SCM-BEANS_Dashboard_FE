import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";

type Availability = "unavailable" | "pending";

export interface CustomerScreenDescriptor {
  title: string;
  description: string;
  availability: Availability;
  actions: ActionBarAction[];
  back: BackButtonDestination | null;
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
  sectionPath: string,
  title: string,
  description: string,
  availability: Availability = "unavailable",
  actions: ActionBarAction[] = [],
): CustomerScreenDescriptor {
  return { title, description, availability, actions, back: getCustomerReadBack(sectionPath) };
}

function backTo(label: string, fallbackHref: string): BackButtonDestination {
  return { label, fallbackHref };
}

function getCustomerReadBack(sectionPath: string): BackButtonDestination | null {
  if (sectionPath === "contracts") return null;
  if (sectionPath.startsWith("contracts/")) return backTo("Danh sách hợp đồng", "/dashboard/contracts");

  if (sectionPath === "machines") return null;
  if (sectionPath === "machines/history" || sectionPath === "machines/substitute") {
    return backTo("Danh sách máy của tôi", "/dashboard/machines");
  }
  const machineModelMatch = sectionPath.match(/^machines\/([^/]+)\/model$/);
  if (machineModelMatch) {
    return backTo("Chi tiết máy", `/dashboard/machines/${encodeURIComponent(machineModelMatch[1])}`);
  }
  if (/^machines\/[^/]+$/.test(sectionPath)) {
    return backTo("Danh sách máy của tôi", "/dashboard/machines");
  }

  if (sectionPath === "invoices") return null;
  if (sectionPath === "invoices/standard" || /^invoices\/\d{4}-\d{2}$/.test(sectionPath)) {
    return backTo("Danh sách hóa đơn", "/dashboard/invoices");
  }
  if (/^invoices\/[^/]+$/.test(sectionPath)) {
    return backTo("Danh sách hóa đơn", "/dashboard/invoices");
  }

  if (sectionPath === "menu") return null;
  if (/^menu\/[^/]+$/.test(sectionPath)) return backTo("Menu của tôi", "/dashboard/menu");
  return null;
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
    return [link("Xem hoàn cọc đã thực hiện", "/dashboard/contracts/deposit-complete")];
  }
  if (sectionPath === "contracts/deposit-complete") {
    return [link("Xem quyết toán", "/dashboard/contracts/end")];
  }
  if (sectionPath.startsWith("contracts/")) {
    return [
      link("Đề nghị kết thúc sớm", "/dashboard/contracts/end-early", "secondary"),
      link("Trao đổi hợp đồng mới", "/dashboard/contracts/new", "secondary"),
      link("Theo dõi hoàn cọc", "/dashboard/contracts/end", "secondary"),
    ];
  }

  if (sectionPath === "machines") {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history"), link("Xem hợp đồng", "/dashboard/contracts", "secondary")];
  }
  if (sectionPath === "machines/history") {
    return [link("Gửi yêu cầu hỗ trợ", "/dashboard/support/new")];
  }
  if (sectionPath === "machines/substitute") {
    return [link("Xem lịch sử máy", "/dashboard/machines/history", "secondary")];
  }
  if (sectionPath.endsWith("/model")) {
    return [link("Xem menu", "/dashboard/menu", "secondary")];
  }
  if (sectionPath.startsWith("machines/")) {
    return [link("Xem lịch sử bảo trì", "/dashboard/machines/history")];
  }

  if (sectionPath === "invoices") {
    return [
      link("Gửi chứng từ chuyển khoản", "/dashboard/invoices/payment"),
      blocked("Xem hóa đơn chi tiết", "secondary"),
      link("Nhắc thanh toán", "/dashboard/invoices/reminder", "secondary"),
    ];
  }
  if (sectionPath === "invoices/standard") {
    return [link("Gửi chứng từ bổ sung", "/dashboard/invoices/standard-payment")];
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
    return [link("Thêm món riêng", "/dashboard/menu/add-dish", "secondary")];
  }

  return [link("Về tổng quan", "/dashboard")];
}

export function getCustomerScreenDescriptor(sectionPath: string): CustomerScreenDescriptor {
  if (!sectionPath) {
    return descriptor(sectionPath, messages.OVERVIEW_TITLE, messages.OVERVIEW_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (phaseThreeSections.has(sectionPath)) {
    return descriptor(
      sectionPath,
      CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
      CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
      "pending",
      getCustomerReadActions(sectionPath),
    );
  }

  if (sectionPath === "contracts") {
    return descriptor(sectionPath, messages.CONTRACTS_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/expiry") {
    return descriptor(sectionPath, messages.CONTRACT_EXPIRY_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/end") {
    return descriptor(sectionPath, messages.CONTRACT_END_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "contracts/deposit-complete") {
    return descriptor(sectionPath, messages.DEPOSIT_COMPLETE_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("contracts/")) {
    return descriptor(sectionPath, messages.CONTRACT_DETAIL_TITLE, messages.CONTRACTS_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "machines") {
    return descriptor(sectionPath, messages.MACHINES_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/history") {
    return descriptor(sectionPath, messages.MACHINE_HISTORY_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "machines/substitute") {
    return descriptor(sectionPath, messages.MACHINE_SUBSTITUTE_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/") && sectionPath.endsWith("/model")) {
    return descriptor(sectionPath, messages.MACHINE_MODEL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.startsWith("machines/")) {
    return descriptor(sectionPath, messages.MACHINE_DETAIL_TITLE, messages.MACHINES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "invoices") {
    return descriptor(sectionPath, messages.INVOICES_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath === "invoices/standard") {
    return descriptor(sectionPath, messages.STANDARD_INVOICE_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (/^invoices\/\d{4}-\d{2}$/.test(sectionPath)) {
    return descriptor(sectionPath, messages.INVOICE_PERIOD_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("invoices/")) {
    return descriptor(sectionPath, messages.INVOICE_DETAIL_TITLE, messages.INVOICES_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  if (sectionPath === "menu") {
    return descriptor(sectionPath, messages.MENU_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("menu/")) {
    return descriptor(sectionPath, messages.RECIPE_DETAIL_TITLE, messages.MENU_DESCRIPTION, "unavailable", getCustomerReadActions(sectionPath));
  }

  return descriptor(
    sectionPath,
    CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
    CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    "pending",
    getCustomerReadActions(sectionPath),
  );
}
