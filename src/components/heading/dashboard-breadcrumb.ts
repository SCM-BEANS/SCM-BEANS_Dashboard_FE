import type { ComponentProps } from "react";
import type { AdminBreadcrumb } from "./admin-breadcrumb";
import { PATH_ADMIN, PATH_CUSTOMER } from "@/routes/path";

type Trail = Pick<ComponentProps<typeof AdminBreadcrumb>, "currentLabel" | "intermediateItems">;
type Section = { HREF: string; LABEL: string };

const adminViews: Record<string, Record<string, string>> = {
  [PATH_ADMIN.CONTRACTS]: {
    create: "Tạo hợp đồng", detail: "Chi tiết hợp đồng", history: "Lịch sử hợp đồng",
    "installation-request": "Tạo yêu cầu lắp đặt",
  },
  [PATH_ADMIN.MACHINES]: {
    create: "Tạo máy", detail: "Chi tiết máy", types: "Mẫu máy",
    "create-model": "Tạo mẫu máy", "model-detail": "Chi tiết mẫu máy",
  },
  [PATH_ADMIN.STORES]: { create: "Tạo cửa hàng", detail: "Chi tiết cửa hàng", edit: "Chỉnh sửa cửa hàng" },
  [PATH_ADMIN.USERS]: { create: "Tạo người dùng", detail: "Chi tiết người dùng", edit: "Chỉnh sửa người dùng" },
  [PATH_ADMIN.IOT]: { priority: "Cảnh báo ưu tiên", reviews: "Xem xét vi phạm offline" },
};

export function getAdminBreadcrumb(asPath: string, section: Section): Trail {
  const [rawPath, search] = asPath.split("#", 1)[0].split("?", 2);
  const pathname = rawPath.replace(/\/$/, "");
  const parts = pathname.slice(section.HREF.length + 1).split("/");
  if (pathname.startsWith(`${section.HREF}/`)) {
    const [id, action] = parts;
    if (section.HREF === PATH_ADMIN.CONTRACTS && action === "termination") {
      return getDashboardBreadcrumb(section, "Chấm dứt hợp đồng", [
        { label: "Chi tiết hợp đồng", href: `${section.HREF}?view=detail&id=${id}` },
      ]);
    }
    if (section.HREF === PATH_ADMIN.MACHINES && action === "operations") {
      return getDashboardBreadcrumb(section, "Giám sát vận hành", [
        { label: "Chi tiết máy", href: `${section.HREF}/${id}` },
      ]);
    }
    if (section.HREF === PATH_ADMIN.TECHNICAL_REQUESTS) {
      if (id === "list") return getDashboardBreadcrumb(section);
      if (id === "new") return getDashboardBreadcrumb(section, "Tạo yêu cầu kỹ thuật");
      if (id === "requests" && parts[2] === "assign") {
        return getDashboardBreadcrumb(section, "Phân công", [
          { label: "Chi tiết yêu cầu bảo trì", href: PATH_ADMIN.TECHNICAL_MAINTENANCE_REQUEST_DETAIL(action) },
        ]);
      }
      if (id === "requests") return getDashboardBreadcrumb(section, "Chi tiết yêu cầu bảo trì");
      if (id === "cost-reviews") return getDashboardBreadcrumb(section, "Chi tiết xem xét chi phí sửa chữa");
      return getPageBreadcrumb(pathname, section, id === "cases" ? "Chi tiết hồ sơ sửa chữa" : "Chi tiết lệnh lắp đặt");
    }
    const detailLabels: Record<string, string> = {
      [PATH_ADMIN.MACHINES]: "Chi tiết máy", [PATH_ADMIN.USERS]: "Chi tiết người dùng",
      [PATH_ADMIN.INVOICES]: "Chi tiết hóa đơn", [PATH_ADMIN.COFFEE_PACKAGES]: "Chi tiết đơn gói cà phê",
    };
    if (parts.length === 1) return getDashboardBreadcrumb(section, detailLabels[section.HREF]);
    if (section.HREF === PATH_ADMIN.INVOICES && id === "exports") {
      return getDashboardBreadcrumb(section, "Chi tiết xuất hóa đơn");
    }
  }
  const query = new URLSearchParams(search);
  const id = query.get("id");
  const view = query.get("view") ?? (pathname === PATH_ADMIN.STORES && id ? "detail" : "");
  const views = adminViews[pathname];
  const label = views && Object.prototype.hasOwnProperty.call(views, view) ? views[view] : undefined;
  const parents = [];
  if (pathname === PATH_ADMIN.CONTRACTS && id && (view === "history" || view === "installation-request")) {
    parents.push({ label: "Chi tiết hợp đồng", href: `${pathname}?view=detail&id=${encodeURIComponent(id)}` });
  }
  if (pathname === PATH_ADMIN.MACHINES && (view === "create-model" || view === "model-detail")) {
    parents.push({ label: "Mẫu máy", href: `${pathname}?view=types` });
  }
  if (pathname === PATH_ADMIN.STORES && view === "edit" && id) {
    query.set("view", "detail");
    parents.push({ label: "Chi tiết cửa hàng", href: `${pathname}?${query}` });
  }
  return getDashboardBreadcrumb(section, label, parents);
}

export function getPageBreadcrumb(pathname: string, section: Section, pageTitle: string): Trail {
  if (pathname === section.HREF) return getDashboardBreadcrumb(section);

  const parentPath = pathname.slice(0, pathname.lastIndexOf("/"));
  if (section.HREF === PATH_CUSTOMER.MACHINES && /^\/dashboard\/machines\/[^/]+\/operations$/.test(pathname)) {
    return getDashboardBreadcrumb(section, pageTitle, [{ label: "Chi tiết máy", href: parentPath }]);
  }
  if (pathname.endsWith("/termination") && section.HREF === PATH_CUSTOMER.CONTRACTS) {
    return getDashboardBreadcrumb(section, pageTitle, [{ label: "Chi tiết hợp đồng", href: parentPath }]);
  }
  if (/(?:\/repair-cases|\/technical-requests\/cases)\/[^/]+\/related$/.test(pathname)) {
    return getDashboardBreadcrumb(section, "Thông tin liên quan", [{ label: "Chi tiết hồ sơ sửa chữa", href: parentPath }]);
  }
  return getDashboardBreadcrumb(section, pageTitle);
}

export function getDashboardBreadcrumb(
  section: Section,
  currentLabel = section.LABEL,
  parents: NonNullable<Trail["intermediateItems"]> = [],
): Trail {
  if (currentLabel === section.LABEL && parents.length === 0) return { currentLabel };
  return {
    currentLabel,
    intermediateItems: [{ label: section.LABEL, href: section.HREF }, ...parents],
  };
}
