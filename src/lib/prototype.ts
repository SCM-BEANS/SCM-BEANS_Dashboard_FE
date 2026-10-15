export type Role = "admin" | "moderator" | "technician" | "customer";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const roleInfo: Record<Role, { label: string; scope: string; nav: NavItem[] }> = {
  admin: {
    label: "Admin",
    scope: "Không gian Admin",
    nav: [
      { label: "Tổng quan", href: "/admin", icon: "grid" },
      { label: "Tài khoản", href: "/admin/accounts", icon: "users" },
      { label: "Khách hàng", href: "/admin/customers", icon: "store" },
      { label: "Cửa hàng", href: "/admin/stores", icon: "shop" },
      { label: "Hợp đồng", href: "/admin/contracts", icon: "file" },
      { label: "Máy & tồn kho", href: "/admin/machines", icon: "box" },
      { label: "Giám sát Smart IoT", href: "/admin/monitoring", icon: "pulse" },
      { label: "Global Menu", href: "/admin/global-menu", icon: "coffee" },
      { label: "Báo cáo vận hành", href: "/admin/reports", icon: "chart" },
      { label: "Thông báo", href: "/admin/notifications", icon: "bell" },
    ],
  },
  moderator: {
    label: "Moderator",
    scope: "Không gian Moderator",
    nav: [
      { label: "Tổng quan", href: "/moderator", icon: "grid" },
      { label: "Hợp đồng", href: "/moderator/contracts", icon: "file" },
      { label: "Tài khoản khách", href: "/moderator/customers", icon: "users" },
      { label: "Hóa đơn", href: "/moderator/invoices", icon: "receipt" },
      { label: "Hoàn cọc", href: "/moderator/deposits", icon: "receipt" },
      { label: "Máy & tồn kho", href: "/moderator/machines", icon: "box" },
      { label: "Giám sát Smart IoT", href: "/moderator/monitoring", icon: "pulse" },
      { label: "Global Menu", href: "/moderator/global-menu", icon: "coffee" },
      { label: "Yêu cầu kỹ thuật", href: "/moderator/technical-requests", icon: "wrench" },
      { label: "Lịch sử máy", href: "/moderator/machine-history", icon: "history" },
      { label: "Thu mua máy cũ", href: "/moderator/buyback", icon: "package" },
      { label: "Thông báo", href: "/moderator/notifications", icon: "bell" },
    ],
  },
  technician: {
    label: "Technician",
    scope: "Không gian Technician",
    nav: [
      { label: "Việc được giao", href: "/technician", icon: "clipboard" },
      { label: "Lịch sử máy", href: "/technician/history", icon: "history" },
      { label: "Thông báo", href: "/technician/notifications", icon: "bell" },
    ],
  },
  customer: {
    label: "Khách hàng",
    scope: "Không gian Khách hàng",
    nav: [
      { label: "Tổng quan", href: "/customer", icon: "grid" },
      { label: "Hợp đồng", href: "/customer/contracts", icon: "file" },
      { label: "Máy của tôi", href: "/customer/machines", icon: "coffee" },
      { label: "Menu của tôi", href: "/customer/menu", icon: "menu" },
      { label: "Hóa đơn", href: "/customer/invoices", icon: "receipt" },
      { label: "Yêu cầu hỗ trợ", href: "/customer/support", icon: "wrench" },
      { label: "Thu mua máy cũ", href: "/customer/buyback", icon: "package" },
      { label: "Thông báo", href: "/customer/notifications", icon: "bell" },
    ],
  },
};

export type PageKind =
  | "overview"
  | "accounts"
  | "customers"
  | "stores"
  | "contracts"
  | "invoices"
  | "deposits"
  | "contract-form"
  | "machines"
  | "monitoring"
  | "telemetry"
  | "menu"
  | "reports"
  | "technical"
  | "history"
  | "buyback"
  | "support"
  | "notifications"
  | "detail";

export type PageMeta = {
  title: string;
  description: string;
  kind: PageKind;
  activeHref: string;
  trail?: string;
};

const pages: Record<Role, Record<string, PageMeta>> = {
  admin: {
    "": { title: "Tổng quan vận hành", description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.", kind: "overview", activeHref: "/admin" },
    accounts: { title: "Tài khoản", description: "Quản lý tài khoản Khách hàng, Moderator và Technician.", kind: "accounts", activeHref: "/admin/accounts" },
    customers: { title: "Khách hàng", description: "Xem cửa hàng, hợp đồng và máy theo từng khách hàng.", kind: "customers", activeHref: "/admin/customers" },
    stores: { title: "Cửa hàng", description: "Thông tin địa điểm hợp đồng và các máy đang đặt tại cửa hàng.", kind: "stores", activeHref: "/admin/stores" },
    contracts: { title: "Hợp đồng", description: "Theo dõi hợp đồng thuê, thời hạn và lịch sử hồ sơ.", kind: "contracts", activeHref: "/admin/contracts" },
    machines: { title: "Máy & tồn kho", description: "Danh sách máy đang thuê, máy trong kho và lịch sử sử dụng.", kind: "machines", activeHref: "/admin/machines" },
    monitoring: { title: "Giám sát Smart IoT", description: "Chọn khách hàng và máy để xem trạng thái kết nối, số ly và vị trí được giám sát.", kind: "monitoring", activeHref: "/admin/monitoring" },
    "global-menu": { title: "Global Menu", description: "Quản lý menu Dolores được cài sẵn cho máy Smart IoT.", kind: "menu", activeHref: "/admin/global-menu" },
    reports: { title: "Báo cáo vận hành", description: "Doanh thu gộp, doanh thu thực tế, tiền cọc, hợp đồng và hoạt động máy.", kind: "reports", activeHref: "/admin/reports" },
    notifications: { title: "Thông báo", description: "Các nhắc nhở và hồ sơ cần theo dõi trên toàn hệ thống.", kind: "notifications", activeHref: "/admin/notifications" },
  },
  moderator: {
    "": { title: "Tổng quan hợp đồng & thanh toán", description: "Việc ưu tiên cho Moderator: hợp đồng, hóa đơn, máy IoT và phản hồi khách.", kind: "overview", activeHref: "/moderator" },
    contracts: { title: "Hợp đồng", description: "Theo dõi đàm phán, ký kết, bàn giao và thời hạn hợp đồng.", kind: "contracts", activeHref: "/moderator/contracts" },
    customers: { title: "Tài khoản khách hàng", description: "Tạo và quản lý tài khoản khách hàng trong phạm vi được giao.", kind: "customers", activeHref: "/moderator/customers" },
    invoices: { title: "Hóa đơn & đối soát", description: "Theo dõi bill, chứng từ chuyển khoản và kết quả đối chiếu ngân hàng.", kind: "invoices", activeHref: "/moderator/invoices" },
    deposits: { title: "Quyết toán & hoàn cọc", description: "Theo dõi thu hồi, đánh giá máy, quyết toán tiền cọc và giao dịch hoàn tiền.", kind: "deposits", activeHref: "/moderator/deposits" },
    machines: { title: "Máy & tồn kho", description: "Theo dõi máy đang thuê, máy sẵn sàng và máy thay thế cùng loại.", kind: "machines", activeHref: "/moderator/machines" },
    monitoring: { title: "Giám sát Smart IoT", description: "Xem tổng quan theo khách hàng, sau đó mở máy để xem dữ liệu chi tiết.", kind: "monitoring", activeHref: "/moderator/monitoring" },
    "global-menu": { title: "Global Menu", description: "Quản lý menu toàn cục nội bộ và công thức mặc định của máy Smart IoT.", kind: "menu", activeHref: "/moderator/global-menu" },
    "technical-requests": { title: "Yêu cầu kỹ thuật", description: "Điều phối Technician và theo dõi kết quả giao máy, bảo trì, sửa chữa, thu hồi.", kind: "technical", activeHref: "/moderator/technical-requests" },
    "machine-history": { title: "Lịch sử máy", description: "Tra cứu hợp đồng, sửa chữa, bảo trì, linh kiện và máy thay theo từng máy.", kind: "history", activeHref: "/moderator/machine-history" },
    buyback: { title: "Thu mua máy cũ", description: "Theo dõi đánh giá nội bộ, thỏa thuận mua, chứng từ và tình trạng máy.", kind: "buyback", activeHref: "/moderator/buyback" },
    notifications: { title: "Thông báo", description: "Nhắc hạn hóa đơn, hợp đồng sắp hết hạn và công việc cần xử lý.", kind: "notifications", activeHref: "/moderator/notifications" },
  },
  technician: {
    "": { title: "Việc được giao", description: "Danh sách yêu cầu do Moderator điều phối và trạng thái xử lý.", kind: "technical", activeHref: "/technician" },
    tasks: { title: "Việc được giao", description: "Danh sách yêu cầu do Moderator điều phối và trạng thái xử lý.", kind: "technical", activeHref: "/technician" },
    history: { title: "Lịch sử máy", description: "Xem thông tin máy và các ghi nhận công việc đã thực hiện.", kind: "history", activeHref: "/technician/history" },
    notifications: { title: "Thông báo", description: "Các yêu cầu mới và thông tin điều phối cần theo dõi.", kind: "notifications", activeHref: "/technician/notifications" },
  },
  customer: {
    "": { title: "Tổng quan cửa hàng", description: "Theo dõi máy, hợp đồng, hóa đơn và các thông báo cần xử lý.", kind: "overview", activeHref: "/customer" },
    contracts: { title: "Hợp đồng của tôi", description: "Theo dõi thời hạn thuê, bill và lịch sử hợp đồng của cửa hàng.", kind: "contracts", activeHref: "/customer/contracts" },
    machines: { title: "Máy của tôi", description: "Xem tình trạng, vị trí theo hợp đồng và lịch sử của từng máy.", kind: "machines", activeHref: "/customer/machines" },
    menu: { title: "Menu của tôi", description: "Tinh chỉnh công thức riêng từ Global Menu Dolores được gửi đến máy Smart IoT.", kind: "menu", activeHref: "/customer/menu" },
    invoices: { title: "Hóa đơn", description: "Xem bill, tải chứng từ chuyển khoản và xác nhận đã thanh toán.", kind: "invoices", activeHref: "/customer/invoices" },
    support: { title: "Yêu cầu hỗ trợ", description: "Gửi sự cố đến Moderator để được điều phối Technician.", kind: "support", activeHref: "/customer/support" },
    buyback: { title: "Thu mua máy cũ", description: "Theo dõi thỏa thuận thu mua, lịch thu gom và xác nhận chứng từ.", kind: "buyback", activeHref: "/customer/buyback" },
    notifications: { title: "Thông báo", description: "Nhắc hạn thanh toán, hợp đồng sắp hết hạn và cập nhật máy.", kind: "notifications", activeHref: "/customer/notifications" },
  },
};

export function resolvePage(role: Role, segments: string[]): PageMeta | null {
  const key = segments.join("/");
  if (role === "customer" && segments.length === 3 && segments[0] === "machines" && segments[2] === "telemetry") {
    return { title: "Giám sát dữ liệu máy", description: "Số ly hợp lệ được máy gửi lên Cloud; dữ liệu offline được đồng bộ khi có mạng.", kind: "telemetry", activeHref: "/customer/machines", trail: "Máy của tôi" };
  }
  if (role === "customer" && segments.length === 2 && segments[0] === "machines") {
    const machineId = segments[1];
    const conventional = machineId.includes("STD") || machineId.startsWith("C-");
    return { title: conventional ? "Chi tiết máy thường" : "Chi tiết máy Smart IoT", description: "Thông tin hợp đồng, vị trí, trạng thái và lịch sử của máy.", kind: "detail", activeHref: "/customer/machines", trail: "Máy của tôi" };
  }
  if (role === "admin" && segments.length === 2 && segments[0] === "customers") {
    return { title: "Chi tiết khách hàng", description: "Hợp đồng, cửa hàng và các máy thuộc khách hàng này.", kind: "detail", activeHref: "/admin/customers", trail: "Khách hàng" };
  }
  // Keep the static `new` route ahead of the dynamic contract detail matcher.
  if (role === "moderator" && key === "contracts/new") {
    return { title: "Tạo hợp đồng thuê mới", description: "Ghi nhận thỏa thuận, hợp đồng đã ký ngoài hệ thống và máy bàn giao.", kind: "contract-form", activeHref: "/moderator/contracts", trail: "Hợp đồng" };
  }
  if (role === "admin" && segments.length === 2 && segments[0] === "contracts") {
    return { title: "Chi tiết hợp đồng", description: "Điều khoản, máy gắn với hợp đồng và lịch sử thanh toán.", kind: "detail", activeHref: "/admin/contracts", trail: "Hợp đồng" };
  }
  if ((role === "moderator" || role === "customer") && segments.length === 2 && segments[0] === "contracts") {
    return { title: "Chi tiết hợp đồng", description: "Điều khoản, máy gắn với hợp đồng, thanh toán và thời hạn.", kind: "detail", activeHref: `/${role}/contracts`, trail: "Hợp đồng" };
  }
  if (role === "admin" && segments.length === 2 && segments[0] === "machines") {
    return { title: "Lịch sử máy", description: "Hợp đồng, lịch sử bảo trì, sửa chữa, thay thế và vị trí máy.", kind: "detail", activeHref: "/admin/machines", trail: "Máy & tồn kho" };
  }
  if (role === "moderator" && segments.length === 2 && segments[0] === "machines") {
    return { title: "Chi tiết máy", description: "Thông tin hợp đồng, vị trí, trạng thái và lịch sử của máy.", kind: "detail", activeHref: "/moderator/machines", trail: "Máy & tồn kho" };
  }
  if ((role === "moderator" || role === "admin") && segments.length === 3 && segments[0] === "monitoring") {
    return { title: "Giám sát máy Smart IoT", description: "Dữ liệu đồng bộ, số ly hợp lệ, kết nối và vị trí được giám sát.", kind: "telemetry", activeHref: `/${role}/monitoring`, trail: "Giám sát Smart IoT" };
  }
  if (role === "moderator" && key === "technical-requests/new") {
    return { title: "Tạo yêu cầu kỹ thuật", description: "Chọn máy và loại công việc, sau đó điều phối Technician.", kind: "technical", activeHref: "/moderator/technical-requests", trail: "Yêu cầu kỹ thuật" };
  }
  if (role === "moderator" && segments.length === 2 && segments[0] === "technical-requests") {
    return { title: "Chi tiết yêu cầu kỹ thuật", description: "Theo dõi công việc đã điều phối mà không rời không gian Moderator.", kind: "detail", activeHref: "/moderator/technical-requests", trail: "Yêu cầu kỹ thuật" };
  }
  if (role === "technician" && segments.length === 2 && segments[0] === "tasks") {
    return { title: "Chi tiết công việc", description: "Thông tin máy, hợp đồng và nội dung Moderator yêu cầu ghi nhận.", kind: "detail", activeHref: "/technician", trail: "Việc được giao" };
  }
  return pages[role][key] ?? null;
}

export function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/moderator" || href === "/technician" || href === "/customer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function roleFromPath(path: string): Role | null {
  const first = path.split("/").filter(Boolean)[0];
  return first === "admin" || first === "moderator" || first === "technician" || first === "customer" ? first : null;
}
