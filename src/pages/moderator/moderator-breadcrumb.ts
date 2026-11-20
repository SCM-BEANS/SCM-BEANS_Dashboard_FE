import { PATH_MODERATOR } from "@/routes/path";
import { isSupportedModeratorSection } from "@/routes/routes";

type BreadcrumbItem = { label: string; href?: string };

const labels: Record<string, string> = {
  new: "Tạo mới", register: "Đăng ký máy", stock: "Máy trong kho", customer: "Máy của khách hàng",
  models: "Mẫu máy", history: "Lịch sử", termination: "Chấm dứt hợp đồng",
  "installation-request": "Tạo lệnh lắp đặt", operations: "Giám sát vận hành",
  alerts: "Cảnh báo", assign: "Phân công", related: "Thông tin liên quan",
  requests: "Yêu cầu bảo trì", cases: "Hồ sơ sửa chữa", "cost-reviews": "Xem xét chi phí sửa chữa",
  tickets: "Phiếu bảo trì", expiry: "Hợp đồng sắp hết hạn", machines: "Máy",
  overdue: "Hóa đơn quá hạn", reconcile: "Đối soát hóa đơn", shortfall: "Thiếu thanh toán",
  excess: "Thanh toán dư", "late-cups": "Số ly chậm", "late-cups-final": "Chốt số ly chậm",
  payg: "Hóa đơn trả theo mức sử dụng", "first-invoice": "Hóa đơn đầu tiên",
  handover: "Bàn giao", standard: "Bàn giao máy thường", smart: "Bàn giao Smart IoT",
  retrieval: "Thu hồi máy", settlement: "Thanh lý hợp đồng", "early-termination": "Chấm dứt trước hạn",
  compensation: "Bồi thường", "deposit-refund": "Hoàn tiền đặt cọc", "refund-good": "Hoàn tiền",
  violations: "Vi phạm hợp đồng", loans: "Máy cho mượn", "repair-history": "Lịch sử sửa chữa",
  substitute: "Máy thay thế", return: "Trả máy thay thế", items: "Công thức pha chế",
  ingredients: "Nguyên liệu", add: "Thêm công thức", missing: "Bổ sung công thức thiếu",
  send: "Gửi công thức", sent: "Công thức đã gửi", espresso: "Espresso", "60": "Nước 60 ml",
  "20g": "Cà phê 20 g", repair: "Sửa chữa", documents: "Chứng từ thu mua",
  refurbishment: "Tân trang", exports: "Xuất danh sách", payment: "Thanh toán",
};

const detailLabels: Record<string, string> = {
  contracts: "Chi tiết hợp đồng", customers: "Hồ sơ khách hàng", invoices: "Chi tiết hóa đơn",
  machines: "Chi tiết máy", models: "Chi tiết mẫu máy", menu: "Chi tiết công thức",
  buyback: "Chi tiết thu mua", "coffee-packages": "Chi tiết đơn hàng",
  requests: "Chi tiết yêu cầu bảo trì", cases: "Chi tiết hồ sơ sửa chữa",
  "cost-reviews": "Chi tiết xem xét chi phí", tickets: "Chi tiết phiếu bảo trì",
  "technical-requests": "Chi tiết yêu cầu kỹ thuật", "machine-history": "Chi tiết lịch sử máy",
  repair: "Chi tiết sửa chữa", exports: "Chi tiết xuất danh sách",
};

export function getModeratorBreadcrumb(pathname: string, section: { HREF: string; LABEL: string }) {
  const items: BreadcrumbItem[] = [{ label: section.LABEL, href: section.HREF }];
  const base = pathname.startsWith(`${section.HREF}/`) ? section.HREF : `/moderator/${pathname.split("/")[2] ?? ""}`;
  const parts = pathname.slice(base.length).split("/").filter(Boolean);
  let path = base;
  let parent = base.split("/").pop() ?? "";
  for (const part of parts) {
    path += `/${part}`;
    if (part === "list") continue;
    const isIdentifier = /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(part) || /^(?:MB-[A-Z0-9-]+|C-\d{3}|[A-Z]{1,2}-\d{3}|YC-\d{3})$/i.test(part) || (parent === "customers" && part !== "new") || parent === "exports";
    const routeLabel = Object.prototype.hasOwnProperty.call(labels, part) ? labels[part] : undefined;
    let label = isIdentifier ? detailLabels[parent] ?? "Chi tiết" : routeLabel;
    if (part === "new") label = parent === "machines" ? "Tạo máy" : parent === "models" ? "Tạo mẫu máy" : parent === "contracts" ? "Tạo hợp đồng" : parent === "customers" ? "Tạo khách hàng" : "Tạo mới";
    if (part === "history" && parent === "contracts") label = "Lịch sử hợp đồng";
    if (part === "history" && parent === "invoices") label = "Lịch sử hóa đơn";
    if (part === "new" && parent === "menu") label = "Tạo công thức";
    if (part === "new" && parent === "buyback") label = "Tạo yêu cầu thu mua";
    if (label && items[items.length - 1].label !== label) {
      const sectionPath = path.slice(PATH_MODERATOR.ROOT.length + 1);
      items.push(isSupportedModeratorSection(sectionPath) ? { label, href: path } : { label });
    }
    if (!isIdentifier) parent = part;
  }
  return { intermediateItems: items.slice(0, -1), currentLabel: items[items.length - 1].label };
}
