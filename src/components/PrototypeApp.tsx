"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronRight,
  CircleHelp, Clock3, CreditCard, Download, ExternalLink, FileCheck2, MapPin,
  Menu as MenuIcon, Plus, Search, Wifi, WifiOff, X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AppIcon } from "@/components/AppIcon";
import { isActive, roleInfo, type PageKind, type PageMeta, type Role } from "@/lib/prototype";
import { businessDueDate, formatDate, getDemoContractById, getMachineType, initialDemoStore, invoiceAmount, useDemoStore, type BuybackCase, type ContractRecord, type InvoiceRecord, type TechnicalTask } from "@/lib/demo-store";

type Props = { role: Role; segments: string[]; page: PageMeta };
type TableRowData = { cells: ReactNode[]; href?: string; tone?: "warning" | "danger" | "success" };

const money = (amount: number) => `${amount.toLocaleString("vi-VN")} đ`;
function showValidation(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("prototype-validation", { detail: message }));
}

function currentContractStatus(contract: ContractRecord): ContractRecord["status"] {
  if (contract.status === "Đã kết thúc") return contract.status;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(`${contract.endDate}T00:00:00`);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "Đã kết thúc";
  if (days <= 31) return "Sắp hết hạn";
  return "Còn hiệu lực";
}

function currentInvoiceBalance(invoice: InvoiceRecord) {
  if (invoice.status === "paid" || invoice.status === "refunded") return 0;
  const balance = invoice.outstanding ?? invoiceAmount(invoice);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const reference = new Date(`${invoice.outstandingAsOf ?? invoice.dueDate}T00:00:00`);
  const daysLate = Math.max(0, Math.floor((today.getTime() - reference.getTime()) / 86400000));
  return Math.ceil(balance * Math.pow(1.05, daysLate));
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  return <span className={`pill pill-${tone}`}><i />{children}</span>;
}

function Metric({ label, value, note, icon }: { label: string; value: string; note?: string; icon?: string }) {
  return <article className="metric-card"><span className="metric-label">{label}</span><strong>{value}</strong>{note && <span className="metric-note">{note}</span>}{icon && <span className="metric-icon"><AppIcon name={icon} size={16} /></span>}</article>;
}

function Metrics({ items, columns = 4 }: { items: { label: string; value: string; note?: string; icon?: string }[]; columns?: 2 | 3 | 4 }) {
  return <div className={`metrics-grid metrics-${columns}`}>{items.map((item) => <Metric key={item.label} {...item} />)}</div>;
}

function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children?: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: TableRowData[] }) {
  return <div className="table-wrap"><div className="data-table" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(115px, 1fr))` }}>
    {columns.map((column) => <div className="table-head" key={column}>{column}</div>)}
    {rows.map((row, rowIndex) => {
      const content = row.cells.map((cell, cellIndex) => <div className="table-cell" data-label={columns[cellIndex]} key={`${rowIndex}-${cellIndex}`}>{cell}</div>);
      return row.href ? <Link className={`table-row ${row.tone ? `row-${row.tone}` : ""}`} href={row.href} key={rowIndex}>{content}</Link> : <div className={`table-row ${row.tone ? `row-${row.tone}` : ""}`} key={rowIndex}>{content}</div>;
    })}
  </div></div>;
}

function ChartCard({ title, subtitle, values, unit = "" }: { title: string; subtitle: string; values: { month: string; value: number }[]; unit?: string }) {
  const max = Math.max(...values.map((v) => v.value));
  return <Panel title={title} subtitle={subtitle} className="chart-panel">
    <div className="chart-bars" role="img" aria-label={title}>
      {values.map((item) => <div className="chart-column" key={item.month}>
        <span className="chart-value">{item.value.toLocaleString("vi-VN")}{unit}</span>
        <div className="chart-track"><div className="chart-bar" style={{ height: `${Math.max(12, (item.value / max) * 100)}%` }} /></div>
        <span className="chart-month">{item.month}</span>
      </div>)}
    </div>
    <div className="chart-foot"><span><i className="legend-dot" /> Dữ liệu minh họa</span><span>Tháng 04–09/2026</span></div>
  </Panel>;
}

function MachineModel() {
  return <div className="machine-stage" aria-label="Mô hình minh họa máy pha cà phê Smart IoT">
    <span className="machine-orbit orbit-left" /><span className="machine-orbit orbit-right" />
    <div className="coffee-machine"><div className="machine-top"><span /></div><div className="machine-screen"><span>DOLORES</span><i /></div><div className="machine-body"><div className="machine-head"><i /><i /><i /></div><div className="machine-nozzle" /><div className="machine-cup"><span /></div></div><div className="machine-base" /></div>
    <span className="model-caption">Mô hình minh họa · Smart IoT</span>
  </div>;
}

function Overview({ role }: { role: Role }) {
  const { store } = useDemoStore();
  const activeContracts = store.contracts.filter((item) => item.status !== "Đã kết thúc");
  const paidInvoices = store.invoices.filter((item) => item.status === "paid" || item.status === "refunded");
  const actualRevenue = paidInvoices.reduce((sum, item) => sum + item.baseFee + item.validCups * item.paygRate + item.otherCharges, 0);
  const deposits = paidInvoices.reduce((sum, item) => sum + item.deposit, 0);
  const customerContracts = store.contracts.filter((item) => item.customerId === "C-204" && item.status !== "Đã kết thúc");
  const customerInvoices = store.invoices.filter((item) => item.customerId === "C-204");
  const customerOutstanding = customerInvoices.reduce((sum, item) => sum + (item.outstanding ?? (item.status === "paid" ? 0 : invoiceAmount(item))), 0);
  const customerCups = customerInvoices.reduce((sum, item) => sum + item.validCups, 0);
  if (role === "admin") return <>
    <Metrics items={[
      { label: "Doanh thu gộp · đã thu", value: money(actualRevenue + deposits) },
      { label: "Doanh thu thực tế · loại cọc", value: money(actualRevenue) },
      { label: "Tiền cọc thu trong kỳ", value: money(deposits) },
      { label: "Smart đang kết nối", value: `0 / ${activeContracts.filter((item) => item.machineType === "Smart IoT").length} máy` },
    ]} />
    <ChartCard title="Doanh thu thực tế theo tháng" subtitle="04–09/2026 · Triệu đồng · Không bao gồm tiền cọc" values={[{ month: "T4", value: 132 }, { month: "T5", value: 145 }, { month: "T6", value: 158 }, { month: "T7", value: 162 }, { month: "T8", value: 175 }, { month: "T9", value: 186.4 }]} />
    <Panel title="Thông tin chi tiết" subtitle="Thông số vận hành toàn hệ thống">
      <div className="details-grid"><Info label="Tổng máy đang thuê" value={`${activeContracts.length} máy · ${activeContracts.filter((item) => item.machineType === "Smart IoT").length} Smart IoT + ${activeContracts.filter((item) => item.machineType === "Máy thường").length} máy thường`} /><Info label="Máy Smart đang chờ đồng bộ" value={`${activeContracts.filter((item) => item.machineType === "Smart IoT").length} máy`} /><Info label="Khách hàng đang hoạt động" value={String(store.accounts.filter((item) => item.role === "Khách hàng" && item.status === "Đang hoạt động").length)} /><Info label="Hợp đồng" value={`${activeContracts.length} còn hạn · ${store.contracts.filter((item) => item.status === "Đã kết thúc").length} đã kết thúc`} /></div>
    </Panel>
  </>;
  if (role === "moderator") return <>
    <Metrics items={[
      { label: "Hợp đồng hiệu lực", value: String(activeContracts.length) },
      { label: "Chứng từ chờ đối chiếu", value: String(store.invoices.filter((item) => item.status === "awaiting_reconciliation").length), note: "Cần kiểm tra giao dịch" },
      { label: "Smart IoT đang thuê", value: String(activeContracts.filter((item) => item.machineType === "Smart IoT").length) },
      { label: "Máy IoT còn trong kho", value: "12 · dữ liệu kho minh họa" },
    ]} />
    <ChartCard title="Số ly Smart IoT theo tháng" subtitle="Ly hợp lệ đã đồng bộ · dữ liệu minh họa" values={[{ month: "T1", value: 76 }, { month: "T2", value: 91 }, { month: "T3", value: 83 }, { month: "T4", value: 124 }, { month: "T5", value: 110 }, { month: "T6", value: 142 }, { month: "T7", value: 132 }, { month: "T8", value: 166 }]} />
    <Panel title="Việc cần xử lý" subtitle="12 chứng từ chờ đối chiếu · 4 yêu cầu kỹ thuật đang theo dõi" action={<Link className="text-link" href="/moderator/invoices">Mở danh sách <ArrowRight size={15} /></Link>}>
      <div className="todo-list"><Todo icon="receipt" title="Đối chiếu chứng từ thanh toán" text="Tenant đã tải ảnh chuyển khoản; kiểm tra với tài khoản công ty." href="/moderator/invoices" /><Todo icon="wrench" title="Điều phối Technician" text="Máy S-018 báo sự cố; tạo yêu cầu kỹ thuật để kiểm tra." href="/moderator/technical-requests/new" /><Todo icon="clock" title="Hợp đồng sắp hết hạn" text="Nhắc khách hàng trước một tháng; không tự gia hạn." href="/moderator/contracts" /></div>
    </Panel>
  </>;
  if (role === "technician") return <>
    <div className="segmented"><button className="selected">Tất cả <span>{store.tasks.length}</span></button><button>Giao máy</button><button>Sửa chữa</button><button>Thu hồi</button></div>
    <Panel title="Công việc đang theo dõi" subtitle="Yêu cầu được Moderator điều phối; lịch bảo trì không tự động tạo.">
      <DataTable columns={["Loại việc", "Máy / hồ sơ", "Khách hàng", "Trạng thái", "Ghi nhận"]} rows={store.tasks.map((task) => ({ href: `/technician/tasks/${task.id}`, cells: [<b key="a">{task.kind} ›</b>, `${task.machineId} · ${task.contractId}`, task.customerName, <Pill key="b" tone={task.status === "Đã hoàn tất" ? "green" : "amber"}>{task.status}</Pill>, task.description] }))} />
    </Panel>
  </>;
  return <>
    <Metrics items={[
      { label: "Hợp đồng đang thuê", value: String(customerContracts.length) },
      { label: "Máy đang sử dụng", value: String(customerContracts.length) },
      { label: "Còn phải thanh toán", value: money(customerOutstanding) },
      { label: "Ly Smart hợp lệ", value: `${customerCups.toLocaleString("vi-VN")} ly` },
    ]} />
    <ChartCard title="Số ly đã bán thành công" subtitle="Tháng 04–09/2026 · Đơn vị: ly · Có tính ly hợp lệ của máy thay Smart IoT" values={[{ month: "T4", value: 1600 }, { month: "T5", value: 1820 }, { month: "T6", value: 1750 }, { month: "T7", value: 1900 }, { month: "T8", value: 3140 }, { month: "T9", value: 2160 }]} />
    <Panel title="Cần theo dõi" subtitle="Việc liên quan đến cửa hàng">
      <div className="todo-list"><Todo icon="receipt" title="Hóa đơn cần theo dõi" text={`Còn phải thanh toán ${money(customerOutstanding)} · chuyển khoản và tải chứng từ`} href="/customer/invoices" /><Todo icon="bell" title="Hợp đồng sắp hết hạn" text="Nếu muốn tiếp tục, hai bên ký hợp đồng mới; không tự gia hạn." href="/customer/contracts" /></div>
    </Panel>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="info-pair"><span>{label}</span><strong>{value}</strong></div>; }

function Todo({ icon, title, text, href }: { icon: string; title: string; text: string; href: string }) {
  return <Link href={href} className="todo-row"><span className="todo-icon"><AppIcon name={icon} size={17} /></span><span className="todo-copy"><strong>{title}</strong><small>{text}</small></span><ChevronRight size={17} className="todo-chevron" /></Link>;
}

function ScreenBody({ role, page, segments, notify }: { role: Role; page: PageMeta; segments: string[]; notify: (message: string) => void }) {
  switch (page.kind) {
    case "overview": return <Overview role={role} />;
    case "accounts": return <Accounts />;
    case "customers": return <Customers role={role} />;
    case "stores": return <Stores />;
    case "contracts": return <Contracts role={role} />;
    case "contract-form": return <ContractForm />;
    case "invoices": return <Invoices role={role} />;
    case "deposits": return <Deposits />;
    case "machines": return <Machines role={role} />;
    case "monitoring": return <Monitoring role={role} />;
    case "telemetry": return <Telemetry role={role} segments={segments} />;
    case "menu": return <MenuManagement role={role} notify={notify} />;
    case "reports": return <Reports />;
    case "technical": return <Technical role={role} segments={segments} notify={notify} />;
    case "history": return <HistoryPage role={role} />;
    case "buyback": return <Buyback role={role} />;
    case "support": return <Support notify={notify} />;
    case "notifications": return <Notifications role={role} />;
    case "detail": return <Detail role={role} segments={segments} />;
  }
}

function Accounts() {
  const { store, updateStore } = useDemoStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Khách hàng");
  const [shop, setShop] = useState("");
  const save = () => {
    if (!name.trim() || !email.trim() || (role === "Khách hàng" && !shop.trim())) return showValidation("Nhập họ tên, email và tên cửa hàng cho tài khoản khách hàng.");
    const id = `ACC-${Date.now()}`;
    updateStore((current) => ({ ...current, accounts: [{ id, name: name.trim(), email: email.trim(), role, store: role === "Khách hàng" ? shop.trim() : "—", status: "Đang hoạt động" }, ...current.accounts] }));
    setName(""); setEmail(""); setShop(""); setRole("Khách hàng"); setCreating(false);
  };
  return <>
    <Metrics columns={3} items={[{ label: "Tổng tài khoản", value: String(store.accounts.length) }, { label: "Khách hàng", value: String(store.accounts.filter((item) => item.role === "Khách hàng").length) }, { label: "Moderator · Technician", value: `${store.accounts.filter((item) => item.role === "Moderator").length} · ${store.accounts.filter((item) => item.role === "Technician").length}` }]} />
    <Panel title="Tài khoản hệ thống" subtitle="Admin tạo và quản lý đủ ba vai trò. Moderator chỉ tạo tài khoản khách hàng." action={<button className="button button-primary button-small" onClick={() => setCreating(!creating)}><Plus size={15} /> Tạo tài khoản</button>}>
      {creating && <div className="form-grid"><label>Họ và tên<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email đăng nhập<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Vai trò<select value={role} onChange={(event) => setRole(event.target.value)}><option>Khách hàng</option><option>Moderator</option><option>Technician</option></select></label>{role === "Khách hàng" && <label>Cửa hàng<input value={shop} onChange={(event) => setShop(event.target.value)} /></label>}<div className="form-wide"><button className="button button-primary" onClick={save}>Tạo tài khoản</button></div></div>}
      <div className="filter-line"><label className="search-box"><Search size={15} /><input placeholder="Tìm tên, email hoặc cửa hàng" /></label><button className="button button-light button-small">Tất cả vai trò <ChevronDown size={14} /></button></div>
      <DataTable columns={["Người dùng", "Cửa hàng", "Vai trò", "Trạng thái", ""]} rows={store.accounts.map((item) => ({ cells: [<b key="a">{item.name}</b>, item.store, item.role, <Pill key="b" tone="green">{item.status}</Pill>, <span key="c">{item.email}</span>] }))} />
    </Panel>
  </>;
}

function Customers({ role }: { role: Role }) {
  const { store, updateStore } = useDemoStore();
  const customers = store.accounts.filter((item) => item.role === "Khách hàng");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shop, setShop] = useState("");
  const save = () => {
    if (!name.trim() || !email.trim() || !shop.trim()) return showValidation("Nhập họ tên, email và tên cửa hàng.");
    updateStore((current) => ({ ...current, accounts: [{ id: `ACC-${Date.now()}`, name: name.trim(), email: email.trim(), role: "Khách hàng", store: shop.trim(), status: "Đang hoạt động" }, ...current.accounts] }));
    setName(""); setEmail(""); setShop(""); setCreating(false);
  };
  return <>
    <Metrics columns={3} items={[{ label: "Khách hàng", value: String(customers.length) }, { label: "Hợp đồng đang thuê", value: String(store.contracts.filter((item) => item.status !== "Đã kết thúc").length) }, { label: "Cửa hàng", value: String(new Set(customers.map((item) => item.store)).size) }]} />
    <Panel title="Danh sách khách hàng" subtitle="Mỗi khách hàng có thể có nhiều hợp đồng và nhiều máy." action={role === "moderator" ? <button className="button button-primary button-small" onClick={() => setCreating(!creating)}><Plus size={15} /> Tạo tài khoản khách</button> : undefined}>
      {creating && <div className="form-grid"><label>Họ và tên<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email đăng nhập<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Cửa hàng<input value={shop} onChange={(event) => setShop(event.target.value)} /></label><div className="form-wide"><button className="button button-primary" onClick={save}>Tạo tài khoản khách hàng</button></div></div>}
      <div className="filter-line"><label className="search-box"><Search size={15} /><input placeholder="Tìm khách hàng hoặc cửa hàng" /></label><button className="button button-light button-small">Đang hoạt động <ChevronDown size={14} /></button></div>
      <DataTable columns={["Khách hàng", "Cửa hàng", "Hợp đồng", "Máy đang dùng", "Theo dõi"]} rows={customers.map((item) => {
        const records = store.contracts.filter((contract) => contract.customerId === item.id);
        return { href: role === "admin" ? `/admin/customers/${item.id}` : "/moderator/contracts", cells: [<b key="a">{item.name}</b>, item.store, `${records.length} hợp đồng`, `${records.length} máy`, <Pill key="b" tone="green">{item.status}</Pill>] };
      })} />
    </Panel>
  </>;
}

function Stores() {
  return <Panel title="Cửa hàng" subtitle="Địa điểm lắp đặt được lưu theo hợp đồng. Vị trí giám sát trực tiếp chỉ có trên Smart IoT.">
    <DataTable columns={["Cửa hàng", "Khách hàng", "Địa chỉ hợp đồng", "Máy", "Loại máy"]} rows={[
      { href: "/admin/customers/C-204", cells: [<b key="a">Cà phê Mộc</b>, "Nguyễn Minh An", "Quận 3, TP. HCM", "2", "Smart IoT · Thông thường"] },
      { href: "/admin/customers/C-205", cells: [<b key="a">Góc Phố</b>, "Phạm Hoài Nam", "Bình Thạnh, TP. HCM", "1", "Thông thường"] },
    ]} />
  </Panel>;
}

function Contracts({ role }: { role: Role }) {
  const { store } = useDemoStore();
  const records = role === "customer" ? store.contracts.filter((item) => item.customerId === "C-204") : store.contracts;
  const active = records.filter((item) => currentContractStatus(item) !== "Đã kết thúc");
  const ending = records.filter((item) => currentContractStatus(item) === "Sắp hết hạn");
  return <>
    <Metrics columns={3} items={[{ label: "Đang hiệu lực", value: String(active.length) }, { label: "Sắp hết hạn trong 1 tháng", value: String(ending.length) }, { label: "Đã kết thúc", value: String(records.length - active.length) }]} />
    <Panel title="Hợp đồng" subtitle="Mỗi máy vật lý gắn với một hợp đồng. Khách tiếp tục thuê sẽ ký hợp đồng mới, không gia hạn hợp đồng cũ." action={role === "moderator" ? <Link href="/moderator/contracts/new" className="button button-primary button-small"><Plus size={15} /> Tạo hợp đồng</Link> : undefined}>
      <div className="filter-line"><label className="search-box"><Search size={15} /><input placeholder="Tìm mã hợp đồng, khách hàng hoặc máy" /></label><button className="button button-light button-small">Mọi trạng thái <ChevronDown size={14} /></button></div>
      <DataTable columns={["Mã hợp đồng", "Khách hàng", "Máy", "Thời hạn", "Trạng thái"]} rows={records.map((record) => ({
        href: `/${role}/contracts/${record.id}`,
        cells: [<b key="a">{record.id} ›</b>, record.storeName, `${record.machineId} · ${record.machineType}`, `${formatDate(record.startDate)}–${formatDate(record.endDate)}`, <Pill key="b" tone={currentContractStatus(record) === "Sắp hết hạn" ? "amber" : currentContractStatus(record) === "Đã kết thúc" ? "neutral" : "green"}>{currentContractStatus(record)}</Pill>],
      }))} />
    </Panel>
  </>;
}

function ContractForm() {
  const { store, updateStore } = useDemoStore();
  const router = useRouter();
  const customers = store.accounts.filter((item) => item.role === "Khách hàng");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "C-204");
  const [machineType, setMachineType] = useState<ContractRecord["machineType"]>("Smart IoT");
  const [machineId, setMachineId] = useState("CF-IOT-041");
  const [startDate, setStartDate] = useState("2026-10-02");
  const [endDate, setEndDate] = useState("2027-04-02");
  const [location, setLocation] = useState("");
  const [installationFee, setInstallationFee] = useState("1000000");
  const [maxOfflineDays, setMaxOfflineDays] = useState("5");
  const [signedFile, setSignedFile] = useState("");
  const customer = customers.find((item) => item.id === customerId);
  const inventory = machineType === "Smart IoT" ? ["CF-IOT-041", "S-024", "S-026"] : ["C-032", "C-034", "CF-STD-030"];
  const used = new Set(store.contracts.filter((item) => item.status !== "Đã kết thúc").map((item) => item.machineId));
  const available = inventory.filter((id) => !used.has(id));
  useEffect(() => { if (!available.includes(machineId)) setMachineId(available[0] ?? ""); }, [machineType, available.join(",")]);
  useEffect(() => { if (!location && customer?.store) setLocation(customer.store); }, [customer?.store]);
  const saveContract = () => {
    if (!customer || !machineId || !location.trim() || !startDate || !endDate || !signedFile) return showValidation("Chọn khách hàng, máy chưa có hợp đồng hiệu lực, điền thời hạn và tải bản hợp đồng đã ký lên.");
    if (endDate <= startDate) return showValidation("Ngày kết thúc phải sau ngày bắt đầu.");
    if (used.has(machineId)) return showValidation("Máy vật lý này đang gắn với hợp đồng hiệu lực khác.");
    const prefix = machineType === "Smart IoT" ? "DL-IOT-2026-" : "DL-R-2026-";
    const nextNumber = Math.max(42, ...store.contracts.filter((item) => item.id.startsWith(prefix)).map((item) => Number(item.id.split("-").at(-1)) || 0)) + 1;
    const id = `${prefix}${String(nextNumber).padStart(4, "0")}`;
    const record: ContractRecord = { id, customerId, customerName: customer.name, storeName: customer.store, machineId, machineType, startDate, endDate, location: `${customer.store} · ${location.trim()}`, monthlyRent: machineType === "Smart IoT" ? 750000 : 1500000, paygRate: machineType === "Smart IoT" ? 1000 : 0, deposit: 10000000, installationFee: Number(installationFee) || 0, maxOfflineDays: machineType === "Smart IoT" ? Math.max(0, Number(maxOfflineDays) || 0) : undefined, status: "Còn hiệu lực", signedFile };
    updateStore((current) => ({ ...current, contracts: [record, ...current.contracts] }));
    router.push(`/moderator/contracts/${id}`);
  };
  return <>
    <div className="buyback-steps">{["Khách hàng & máy", "Đàm phán điều khoản", "Ký hợp đồng bên ngoài", "Tải hợp đồng lên", "Bàn giao máy"].map((label, index) => <div className={`buyback-step ${index < 2 ? "step-done" : ""}`} key={label}><span>{index + 1}</span><small>{label}</small></div>)}</div>
    <Panel title="Thông tin hợp đồng" subtitle="Moderator ghi nhận điều khoản đã thỏa thuận và lưu bản hợp đồng ký bên ngoài.">
      <div className="form-grid"><label>Khách hàng<select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setLocation(customers.find((item) => item.id === event.target.value)?.store ?? ""); }}>{customers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.store}</option>)}</select></label><label>Loại máy<select value={machineType} onChange={(event) => setMachineType(event.target.value as ContractRecord["machineType"])}><option>Smart IoT</option><option>Máy thường</option></select></label><label>Mã máy chưa gắn hợp đồng<select value={machineId} onChange={(event) => setMachineId(event.target.value)}>{available.map((id) => <option key={id}>{id}</option>)}</select></label><label>Địa chỉ lắp đặt<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Địa chỉ theo thỏa thuận" /></label><label>Ngày bắt đầu<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Ngày kết thúc<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label>Tiền đặt cọc<input value="10.000.000 đ / hợp đồng / máy" readOnly /></label><label>Phí lắp đặt (đ)<input type="number" min="0" value={installationFee} onChange={(event) => setInstallationFee(event.target.value)} /></label>{machineType === "Smart IoT" && <><label>Ngày offline tối đa / tháng theo hợp đồng<input type="number" min="0" value={maxOfflineDays} onChange={(event) => setMaxOfflineDays(event.target.value)} /></label><p className="form-wide small-note">Mức tham khảo là tối đa 5 ngày offline/tháng; điều kiện cuối cùng thay đổi theo đàm phán và hợp đồng đã ký.</p></>}<label className="form-wide upload-box"><Download size={17} /><span>{signedFile || "Tải bản hợp đồng đã ký bên ngoài"}<input type="file" accept=".pdf,image/*" onChange={(event) => setSignedFile(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={saveContract}>Lưu hợp đồng & gắn máy <ArrowRight size={15} /></button></div></div>
    </Panel>
    <Panel title="Giá thuê theo loại máy" subtitle="Giá cơ bản theo baseline; phí lắp đặt có thể theo thỏa thuận hợp đồng"><div className="details-grid"><Info label="Smart IoT" value="750.000 đ / tháng + 1.000 đ / ly hợp lệ" /><Info label="Máy thông thường" value="1.500.000 đ / tháng" /><Info label="Phí đặt cọc" value="10.000.000 đ / hợp đồng / máy" /><Info label="Phí lắp đặt mặc định" value="1.000.000 đ / máy · có thể thỏa thuận" /></div><div className="notice notice-sand"><FileCheck2 size={17} /><div><strong>Không ký hợp đồng điện tử trên Dolores</strong><p>Hai bên ký hợp đồng bên ngoài; Moderator tải bản đã ký lên và gắn đúng một máy vật lý chưa có hợp đồng hiệu lực.</p></div></div></Panel>
  </>;
}

function Deposits() {
  const { store, updateStore } = useDemoStore();
  const [refundReference, setRefundReference] = useState("");
  const [refundProof, setRefundProof] = useState("");
  const assessment = store.depositAssessment;
  const settlement = store.depositSettlement;
  const deposit = 10_000_000;
  const saveSettlement = () => {
    if (!assessment?.collected) return;
    const now = new Date();
    const due = new Date(now); due.setDate(due.getDate() + 10);
    updateStore((current) => ({ ...current, depositSettlement: { amountToRefund: Math.max(0, deposit - assessment.damageAmount), customerOwes: Math.max(0, assessment.damageAmount - deposit), notifiedAt: now.toISOString(), dueAt: due.toISOString() } }));
  };
  return <>
    <Metrics columns={3} items={[{ label: "Tiền cọc theo hợp đồng", value: "10.000.000 đ / máy" }, { label: "Đang chờ Technician thu hồi & đánh giá", value: "Theo hồ sơ" }, { label: "Đã quyết toán", value: "Theo giao dịch đã đối soát" }]} />
    <Panel title="Hồ sơ quyết toán cọc" subtitle="Technician thu hồi và đánh giá trước; Moderator quyết toán và hoàn tiền sau.">
      <DataTable columns={["Hợp đồng / máy", "Khách hàng", "Tiền cọc", "Trạng thái", "Tác vụ"]} rows={[
        { cells: [<b key="a">DL-IOT-2026-0042 · S-018</b>, "Cà phê Mộc · Nguyễn Minh An", money(deposit), <Pill key="b" tone={settlement ? "green" : assessment?.collected ? "amber" : "neutral"}>{settlement ? "Đã quyết toán · chờ giao dịch" : assessment?.collected ? "Chờ Moderator quyết toán" : "Chờ Technician thu hồi & đánh giá"}</Pill>, <Link key="c" href="/moderator/technical-requests/YC-026" className="text-link">Mở yêu cầu <ArrowRight size={14} /></Link>] },
      ]} />
      {!assessment && <div className="notice notice-sand"><Clock3 size={17} /><div><strong>Đang chờ Technician thu hồi và đánh giá</strong><p>Moderator chỉ tiếp tục quyết toán sau khi Technician ghi nhận kết quả từ tài khoản Technician.</p></div></div>}
      {assessment?.collected && <div className="notice notice-sand"><Check size={17} /><div><strong>Đã thu hồi và ghi nhận kết quả</strong><p>{assessment.damageAmount ? `Thiệt hại ghi nhận: ${money(assessment.damageAmount)}.` : "Không ghi nhận hư hỏng."} Moderator có thể tiếp tục quyết toán theo điều khoản hợp đồng.</p></div></div>}
      <div className="deposit-flow"><Timeline number="01" title="Technician thu hồi và đánh giá tình trạng máy" text="Moderator điều phối; Technician ghi nhận tình trạng và thông báo có hư hỏng hay không." /><Timeline number="02" title="Moderator quyết toán theo kết quả và điều khoản" text="Không hư hỏng: Moderator thông báo khách hàng; hoàn tiền trong 10 ngày kể từ thông báo. Có hư hỏng: trừ phần thiệt hại vào cọc 10.000.000 đ; nếu vượt cọc, khách bồi hoàn phần còn thiếu theo điều khoản." /><Timeline number="03" title="Hoàn tiền qua giao dịch bên ngoài" text="Moderator hoàn theo khoản cọc đã đối soát và ghi nhận giao dịch hoàn tiền như giao dịch thanh toán bill. Không cộng tiền cọc vào doanh thu thực tế." /></div>
      <div className="action-strip"><Link className="button button-light" href="/moderator/technical-requests/YC-026">Xem yêu cầu thu hồi <ArrowRight size={15} /></Link>{!settlement && <button className="button button-primary" disabled={!assessment?.collected} onClick={saveSettlement}>Quyết toán sau đánh giá <ArrowRight size={15} /></button>}</div>
      {settlement && <div className="details-grid"><Info label="Số tiền hoàn" value={money(settlement.amountToRefund)} /><Info label="Khách cần bồi hoàn thêm" value={money(settlement.customerOwes)} /><Info label="Hạn hoàn tiền" value={formatDate(settlement.dueAt.slice(0, 10))} /><Info label="Trạng thái" value={store.depositRefund ? "Đã ghi nhận giao dịch hoàn" : "Moderator đã thông báo khách"} /></div>}
      {settlement && settlement.amountToRefund > 0 && !store.depositRefund && <div className="form-grid"><label>Mã giao dịch hoàn tiền<input value={refundReference} onChange={(event) => setRefundReference(event.target.value)} placeholder="Mã giao dịch ngân hàng" /></label><label className="upload-box"><Download size={17} /><span>{refundProof || "Tải chứng từ hoàn tiền"}<input type="file" accept="image/*,.pdf" onChange={(event) => setRefundProof(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => { if (!refundReference.trim() || !refundProof) return showValidation("Nhập mã giao dịch và tải chứng từ hoàn tiền lên."); updateStore((current) => ({ ...current, depositRefund: { amount: settlement.amountToRefund, reference: refundReference.trim(), proofFile: refundProof, completedAt: new Date().toISOString() } })); }}>Ghi nhận giao dịch hoàn tiền</button></div></div>}
    </Panel>
    <Panel title="Quy tắc tiền cọc" subtitle="Áp dụng theo hợp đồng và kết quả đánh giá">
      <div className="details-grid"><Info label="Mức cọc đã chốt" value="10.000.000 đ / hợp đồng / máy cho cả máy thường và Smart IoT" /><Info label="Điều kiện quyết toán" value="Chỉ sau khi Technician thu hồi và đánh giá tình trạng máy" /><Info label="Không có hư hỏng" value="Moderator thông báo khách; hoàn tiền trong 10 ngày kể từ ngày thông báo" /><Info label="Có hư hỏng" value="Khấu trừ theo điều khoản; nếu vượt tiền cọc, khách thanh toán phần chênh lệch" /></div>
    </Panel>
  </>;
}

function Invoices({ role }: { role: Role }) {
  const { store, updateStore } = useDemoStore();
  const [activeId, setActiveId] = useState("");
  const [proof, setProof] = useState("");
  const [companyProof, setCompanyProof] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [refundProof, setRefundProof] = useState("");
  const records = role === "customer" ? store.invoices.filter((item) => item.customerId === "C-204") : store.invoices;
  const pending = records.filter((item) => ["awaiting_payment", "awaiting_reconciliation", "partially_paid", "awaiting_overpayment_refund"].includes(item.status));
  const outstandingTotal = records.reduce((sum, item) => sum + currentInvoiceBalance(item), 0);
  const confirmCustomerPayment = (item: InvoiceRecord) => {
    if (!proof) return showValidation("Vui lòng tải ảnh giao dịch trước khi xác nhận đã thanh toán.");
    updateStore((current) => ({ ...current, invoices: current.invoices.map((invoice) => invoice.id === item.id ? { ...invoice, proofFile: proof, status: "awaiting_reconciliation", outstanding: invoice.outstanding ?? invoice.total } : invoice) }));
    setActiveId(""); setProof("");
  };
  const reconcile = (item: InvoiceRecord) => {
    const received = Number(amount);
    if (!companyProof) return showValidation("Tải ảnh hoặc chứng từ giao dịch đã nhận vào tài khoản công ty lên trước khi lưu đối soát.");
    if (!Number.isFinite(received) || received <= 0 || !reference.trim()) return showValidation("Nhập số tiền ngân hàng đã nhận và mã/nội dung giao dịch.");
    const due = currentInvoiceBalance(item);
    const balance = Math.max(0, due - received);
    const excess = Math.max(0, received - due);
    const recordedAt = new Date().toISOString();
    updateStore((current) => ({ ...current, invoices: current.invoices.map((invoice) => invoice.id === item.id ? { ...invoice, companyProofFile: companyProof, receivedAmount: (invoice.receivedAmount ?? 0) + received, bankReference: reference.trim(), outstanding: balance, outstandingAsOf: recordedAt.slice(0, 10), excess, status: balance > 0 ? "partially_paid" : excess > 0 ? "awaiting_overpayment_refund" : "paid", balanceRequestedAt: balance > 0 ? recordedAt : invoice.balanceRequestedAt } : invoice) }));
    setActiveId(""); setAmount(""); setReference(""); setCompanyProof("");
  };
  const recordExcessRefund = (item: InvoiceRecord) => {
    if (!reference.trim() || !refundProof) return showValidation("Nhập mã giao dịch và tải chứng từ hoàn phần thừa lên.");
    updateStore((current) => ({ ...current, invoices: current.invoices.map((invoice) => invoice.id === item.id ? { ...invoice, refundReference: reference.trim(), refundProof, status: "paid" } : invoice) }));
    setActiveId(""); setReference(""); setRefundProof("");
  };
  return <>
    <Metrics columns={3} items={[{ label: "Còn phải thanh toán", value: money(outstandingTotal) }, { label: "Chờ Moderator đối chiếu", value: String(records.filter((item) => item.status === "awaiting_reconciliation").length) }, { label: "Đang theo dõi", value: String(pending.length) }]} />
    <Panel title={role === "customer" ? "Hóa đơn của cửa hàng" : "Hóa đơn cần theo dõi"} subtitle="Bill phát hành ngày cuối tháng; hạn thanh toán 10 ngày làm việc (Thứ Hai đến Thứ Bảy).">
      <DataTable columns={["Kỳ hóa đơn", "Hợp đồng", "Khoản phải trả", "Hạn thanh toán", "Trạng thái", ""]} rows={records.map((item) => {
        const statusText: Record<InvoiceRecord["status"], string> = { awaiting_payment: "Chờ khách thanh toán", awaiting_reconciliation: "Chờ Moderator đối chiếu", partially_paid: "Còn thiếu một phần", paid: "Đã đối soát", awaiting_overpayment_refund: "Chờ hoàn phần thừa", refunded: "Đã hoàn tiền thừa" };
        const tone = item.status === "paid" || item.status === "refunded" ? "green" : item.status === "partially_paid" || item.status === "awaiting_overpayment_refund" ? "amber" : "neutral";
        const actionable = role === "customer" ? item.status === "awaiting_payment" || item.status === "partially_paid" : item.status === "awaiting_reconciliation" || item.status === "partially_paid" || item.status === "awaiting_overpayment_refund";
        const canOpen = actionable || role !== "customer" && Boolean(item.proofFile || item.companyProofFile);
        const action = role === "customer" ? (actionable ? "Báo đã thanh toán" : item.status === "awaiting_reconciliation" ? "Chờ đối chiếu" : "Đã thanh toán") : (item.status === "awaiting_overpayment_refund" ? "Ghi nhận hoàn thừa" : actionable ? "Đối chiếu ngân hàng" : item.companyProofFile ? "Xem đối soát" : item.status === "paid" || item.status === "refunded" ? "Đã đối soát" : "Chờ khách thanh toán");
        const rowAmount = item.status === "paid" || item.status === "refunded" || item.status === "awaiting_overpayment_refund" ? invoiceAmount(item) : currentInvoiceBalance(item);
        return { cells: [<b key="a">{item.period}</b>, `${item.contractId} · ${getDemoContractById(store, item.contractId)?.machineType ?? "Hợp đồng"}`, money(rowAmount), formatDate(item.dueDate), <Pill key="b" tone={tone}>{statusText[item.status]}</Pill>, <button key="c" className="text-link" disabled={!canOpen} onClick={() => { if (!canOpen) return; setActiveId(activeId === item.id ? "" : item.id); setAmount(String(currentInvoiceBalance(item))); setProof(""); setCompanyProof(""); setReference(""); setRefundProof(""); }}>{action}{canOpen && <ArrowRight size={14} />}</button>] };
      })} />
      {records.filter((item) => item.id === activeId).map((item) => <div className="notice notice-sand" key={`action-${item.id}`}>
        {role === "customer" ? <div className="form-grid"><strong className="form-wide">{item.status === "partially_paid" ? "Moderator đã yêu cầu thanh toán đủ số dư còn thiếu." : ""} {item.period} · {item.contractId} · {money(currentInvoiceBalance(item))}</strong><label className="form-wide upload-box"><Download size={17} /><span>{proof || "Tải ảnh giao dịch ngân hàng"}<input type="file" accept="image/*,.pdf" onChange={(event) => setProof(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => confirmCustomerPayment(item)}>Xác nhận đã thanh toán</button></div></div>
          : item.status === "awaiting_overpayment_refund" ? <div className="form-grid"><strong className="form-wide">Số tiền chuyển thừa cần hoàn: {money(item.excess ?? 0)}</strong><Info label="Ảnh giao dịch khách gửi" value={item.proofFile ?? "Chưa có"} /><Info label="Chứng từ nhận tiền của công ty" value={item.companyProofFile ?? "Chưa có"} /><Info label="Mã giao dịch đã đối chiếu" value={item.bankReference ?? "—"} /><label>Mã giao dịch hoàn tiền bên ngoài<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mã giao dịch ngân hàng" /></label><label className="upload-box"><Download size={17} /><span>{refundProof || "Tải chứng từ hoàn tiền"}<input type="file" accept="image/*,.pdf" onChange={(event) => setRefundProof(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => recordExcessRefund(item)}>Ghi nhận đã hoàn tiền</button></div></div>
          : item.companyProofFile && item.status !== "awaiting_reconciliation" && item.status !== "partially_paid" ? <div className="form-grid"><strong className="form-wide">Hồ sơ đối soát đã lưu · {item.period} · {item.contractId}</strong><Info label="Ảnh giao dịch khách gửi" value={item.proofFile ?? "Chưa có"} /><Info label="Chứng từ giao dịch tài khoản công ty" value={item.companyProofFile} /><Info label="Số tiền đã nhận" value={money(item.receivedAmount ?? 0)} /><Info label="Mã / nội dung giao dịch" value={item.bankReference ?? "—"} /></div>
          : <div className="form-grid"><strong className="form-wide">Đối chiếu giao dịch khách đã báo với tài khoản ngân hàng công ty. Ảnh khách gửi: {item.proofFile ?? "chưa có"}</strong><label>Số tiền đã nhận<input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Mã / nội dung giao dịch<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mã giao dịch ngân hàng" /></label><label className="form-wide upload-box"><Download size={17} /><span>{companyProof || "Tải ảnh/chứng từ giao dịch đã vào tài khoản công ty"}<input type="file" accept="image/*,.pdf" onChange={(event) => setCompanyProof(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => reconcile(item)}>Lưu kết quả đối soát</button></div></div>}
      </div>)}
      <div className="notice notice-soft-red"><CreditCard size={17} /><div><strong>Thanh toán ngoài hệ thống</strong><p>Khách chuyển khoản ngân hàng, tải ảnh giao dịch và bấm xác nhận đã thanh toán. Moderator đối chiếu với tài khoản công ty và xác nhận trong hệ thống.</p></div></div>
    </Panel>
    <Panel title="Quy tắc hóa đơn & dữ liệu ly" subtitle="Áp dụng theo điều khoản hợp đồng">
      <div className="rule-grid"><Info label="Máy Smart IoT" value="750.000 đ / tháng + 1.000 đ / ly hợp lệ" /><Info label="Máy thông thường" value="1.500.000 đ / tháng" /><Info label="Máy thuê mới" value="Bill đầu gồm tiền cọc 10.000.000 đ, tiền thuê, lắp đặt mặc định 1.000.000 đ và khoản đã thỏa thuận" /><Info label="Bill chưa phát hành" value="Cuối tháng chờ đủ điều kiện online ghi trong hợp đồng mới phát hành bill" /><Info label="Giới hạn offline" value="Tham khảo tối đa 5 ngày/tháng cho Smart IoT; con số được thương lượng và không cố định trên hệ thống" /><Info label="Ly đồng bộ muộn" value="Bill đã thanh toán/đối soát: cộng ly vào tháng sau. Bill còn điều chỉnh được: tính lại và gửi bill mới" /><Info label="Chậm thanh toán" value="Phí chậm trả cộng dồn 5% mỗi ngày trên số dư hiện tại; nhắc mỗi ngày đến khi thanh toán" /></div>
    </Panel>
  </>;
}

function Machines({ role }: { role: Role }) {
  const { store, updateStore } = useDemoStore();
  const [machineFilter, setMachineFilter] = useState<"Tất cả máy" | "Smart IoT" | "Máy thường" | "Trong kho">("Tất cả máy");
  const contracts = role === "customer" ? store.contracts.filter((item) => item.customerId === "C-204") : store.contracts;
  const machineHref = (id: string, isSmart = true, customerId = "C-204") => role === "customer"
    ? `/customer/machines/${id}`
    : role === "admin"
      ? `/admin/machines/${id}`
      : isSmart ? `/moderator/monitoring/${customerId}/${id}` : `/moderator/machines/${id}`;
  const smartCount = contracts.filter((item) => item.machineType === "Smart IoT").length;
  const regularCount = contracts.filter((item) => item.machineType === "Máy thường").length;
  const replacementCount = store.replacementAssignments.filter((item) => contracts.some((contract) => contract.id === item.contractId)).length;
  const metrics = role === "customer" ? [
    { label: "Máy của cửa hàng", value: `${contracts.length} máy` },
    { label: "Smart IoT", value: `${smartCount} máy` },
    { label: "Máy thông thường", value: `${regularCount} máy` },
    { label: "Máy thay trong kỳ", value: `${replacementCount} máy` },
  ] : [
    { label: "Smart IoT trong kho", value: "12 máy" },
    { label: "Máy đang cho thuê", value: `${store.contracts.filter((item) => item.status !== "Đã kết thúc").length} máy` },
    { label: "Máy đang được thay", value: `${store.replacementAssignments.filter((item) => !item.returnedAt).length} máy` },
    { label: "Đang tân trang", value: `${store.buybacks.filter((item) => item.status === "Đang tân trang & kiểm thử").length} máy` },
  ];
  const machineRows = contracts.map((contract) => ({
    machineType: contract.machineType,
    href: machineHref(contract.machineId, contract.machineType === "Smart IoT", contract.customerId),
    cells: [<b key="a">{contract.machineId} ›</b>, contract.machineType, contract.id, contract.location, contract.machineType === "Smart IoT" ? "Chờ đồng bộ · Cloud đến 29/30" : "Theo hồ sơ · không theo dõi GPS", <Pill key="b" tone={contract.status === "Đã kết thúc" ? "neutral" : "green"}>{contract.status === "Đã kết thúc" ? "Đã kết thúc" : "Máy chính"}</Pill>],
  }));
  const replacementRows = store.replacementAssignments.filter((item) => contracts.some((contract) => contract.id === item.contractId)).map((item) => ({
    machineType: item.machineType,
    href: machineHref(item.replacementMachineId, item.machineType === "Smart IoT", store.contracts.find((contract) => contract.id === item.contractId)?.customerId ?? "C-204"),
    cells: [<b key="a">{item.replacementMachineId} ›</b>, `${item.machineType} · tạm`, item.contractId, "Gắn với hợp đồng chính", item.validCups ? `${item.validCups} ly tính vào hợp đồng` : "Theo hồ sơ", <Pill key="b">{item.returnedAt ? `Đã trả ${formatDate(item.returnedAt)}` : "Đang thay thế"}</Pill>],
  }));
  const eligibleContracts = store.contracts.filter((item) => item.status !== "Đã kết thúc");
  const [replacementContractId, setReplacementContractId] = useState(eligibleContracts[0]?.id ?? "");
  const [replacementMachineId, setReplacementMachineId] = useState("S-022");
  const [replacementCups, setReplacementCups] = useState("");
  const selectedContract = store.contracts.find((item) => item.id === replacementContractId);
  const candidates = selectedContract?.machineType === "Smart IoT" ? ["S-022", "S-024", "S-026"] : ["CF-STD-027", "C-032", "C-034"];
  const assignReplacement = () => {
    if (!selectedContract || getMachineType(replacementMachineId) !== selectedContract.machineType) return showValidation("Máy thay thế phải cùng loại với máy chính.");
    if (store.replacementAssignments.some((item) => item.replacementMachineId === replacementMachineId && !item.returnedAt)) return showValidation("Máy này đang được gắn làm máy thay thế cho hợp đồng khác.");
    const validCups = selectedContract.machineType === "Smart IoT" ? Math.max(0, Number(replacementCups) || 0) : 0;
    const newAssignment = { id: `REP-${Date.now()}`, contractId: selectedContract.id, primaryMachineId: selectedContract.machineId, replacementMachineId, machineType: selectedContract.machineType, assignedAt: new Date().toISOString().slice(0, 10), validCups };
    updateStore((current) => ({ ...current, replacementAssignments: [newAssignment, ...current.replacementAssignments], machineHistory: [{ date: new Date().toLocaleDateString("vi-VN"), machineId: selectedContract.machineId, contractId: selectedContract.id, detail: `Thay tạm bằng máy cùng loại ${replacementMachineId}${validCups ? ` · ${validCups} ly hợp lệ từ máy thay` : ""}`, recordedBy: "Moderator" }, ...current.machineHistory] }));
  };
  const returnReplacement = (id: string) => updateStore((current) => {
    const assignment = current.replacementAssignments.find((item) => item.id === id);
    if (!assignment || assignment.returnedAt) return current;
    const today = new Date();
    const returnedAt = today.toISOString().slice(0, 10);
    const historyDate = today.toLocaleDateString("vi-VN");
    return {
      ...current,
      replacementAssignments: current.replacementAssignments.map((item) => item.id === id ? { ...item, returnedAt } : item),
      machineHistory: [
        { date: historyDate, machineId: assignment.replacementMachineId, contractId: assignment.contractId, detail: `Thu hồi máy thay thế ${assignment.replacementMachineId}; máy trở lại kho`, recordedBy: "Moderator" },
        { date: historyDate, machineId: assignment.primaryMachineId, contractId: assignment.contractId, detail: `Kết thúc thời gian thay thế bằng ${assignment.replacementMachineId}`, recordedBy: "Moderator" },
        ...current.machineHistory,
      ],
    };
  });
  const stockRows = role === "customer" ? [] : [{ machineType: "Smart IoT" as const, cells: [<b key="a">CF-IOT-041</b>, "Smart IoT", "Trong kho", "—", "Chưa gắn hợp đồng", <Pill key="b" tone="green">Sẵn sàng</Pill>] }];
  const machineFilters = role === "customer" ? ["Tất cả máy", "Smart IoT", "Máy thường"] as const : ["Tất cả máy", "Smart IoT", "Máy thường", "Trong kho"] as const;
  const allRows = [...machineRows, ...replacementRows];
  const visibleRows = machineFilter === "Trong kho"
    ? stockRows
    : [...allRows.filter((row) => machineFilter === "Tất cả máy" || row.machineType === machineFilter), ...stockRows.filter((row) => machineFilter === "Tất cả máy" || row.machineType === machineFilter)];
  return <>
    <Metrics columns={4} items={metrics} />
    <div className="segmented">{machineFilters.map((filter) => <button key={filter} className={machineFilter === filter ? "selected" : ""} aria-pressed={machineFilter === filter} onClick={() => setMachineFilter(filter)}>{filter}</button>)}</div>
    <Panel title={role === "customer" ? "Máy của cửa hàng" : "Máy, tồn kho & vị trí"} subtitle={role === "customer" ? "Danh sách chỉ gồm máy gắn với hợp đồng của cửa hàng. Kho máy do Dolores quản lý." : "Vị trí hợp đồng hiển thị cho mọi máy; GPS giám sát trực tiếp chỉ có với Smart IoT."}>
      {visibleRows.length ? <DataTable columns={["Mã máy", "Loại máy", "Hợp đồng", "Vị trí hợp đồng", "Kết nối / theo dõi", "Trạng thái"]} rows={visibleRows} /> : <p className="small-note">Không có máy trong nhóm này.</p>}
      {role !== "customer" && <div className="notice notice-sand"><AppIcon name="coffee" size={17} /><div><strong>Quản lý máy thay</strong><p>Máy thay bắt buộc cùng loại với máy chính. Máy Smart IoT thay thế ghi vào cùng hợp đồng theo thời gian sử dụng; máy thường không có dữ liệu số ly.</p></div></div>}
      {role === "moderator" && <><div className="form-grid"><label>Hợp đồng máy chính<select value={replacementContractId} onChange={(event) => setReplacementContractId(event.target.value)}>{eligibleContracts.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.machineId} · {item.machineType}</option>)}</select></label><label>Máy thay thế cùng loại<select value={replacementMachineId} onChange={(event) => setReplacementMachineId(event.target.value)}>{candidates.map((id) => <option key={id}>{id}</option>)}</select></label>{selectedContract?.machineType === "Smart IoT" && <label>Ly hợp lệ đã nhận từ máy thay (nếu có)<input type="number" min="0" value={replacementCups} onChange={(event) => setReplacementCups(event.target.value)} /></label>}<div className="form-wide"><button className="button button-primary" onClick={assignReplacement}>Gán máy thay vào hợp đồng</button></div></div><DataTable columns={["Máy thay", "Hợp đồng chính", "Loại", "Ly hợp lệ", "Trạng thái", ""]} rows={store.replacementAssignments.map((item) => ({ cells: [<b key="a">{item.replacementMachineId}</b>, item.contractId, item.machineType, item.validCups ?? 0, item.returnedAt ? `Đã trả ${formatDate(item.returnedAt)}` : "Đang gắn tạm", !item.returnedAt ? <button key="b" className="text-link" onClick={() => returnReplacement(item.id)}>Ghi nhận trả máy</button> : "—"] }))} /></>}
    </Panel>
    {role !== "customer" && <Panel title="Máy có thể điều phối" subtitle="Số lượng Smart IoT khả dụng trong kho"><div className="stock-summary"><span className="stock-number">12</span><div><strong>Máy Smart IoT sẵn sàng</strong><p>8 máy sẵn sàng · 2 máy đang bảo trì · 2 máy đang tân trang</p></div><Link href={role === "admin" ? "/admin/machines" : "/moderator/machines"} className="button button-light button-small">Xem kho <ArrowRight size={15} /></Link></div></Panel>}
  </>;
}

function Monitoring({ role }: { role: Role }) {
  const { store } = useDemoStore();
  const base = role === "admin" ? "/admin/monitoring" : "/moderator/monitoring";
  const smartContracts = store.contracts.filter((item) => item.machineType === "Smart IoT" && item.status !== "Đã kết thúc");
  const customers = store.accounts.filter((item) => item.role === "Khách hàng" && smartContracts.some((contract) => contract.customerId === item.id));
  const latestByContract = (id: string) => store.invoices.find((item) => item.contractId === id && item.period === "09/2026");
  const cardRows = smartContracts.map((contract) => {
    const customer = customers.find((item) => item.id === contract.customerId);
    return { name: contract.storeName, owner: customer?.name ?? contract.customerName, count: 1, status: `Cloud đến ngày 29 · ${contract.machineId} chờ đồng bộ`, href: `${base}/${contract.customerId}/${contract.machineId}` };
  });
  const assignedReplacement = store.replacementAssignments.filter((item) => !item.returnedAt);
  return <>
    <Metrics items={[{ label: "Khách hàng có máy IoT", value: String(customers.length) }, { label: "Smart IoT đang thuê", value: String(smartContracts.length) }, { label: "Đang kết nối", value: "0 máy" }, { label: "Chờ đồng bộ", value: String(smartContracts.length) }]} />
    <Panel title="Khách hàng & máy Smart IoT" subtitle="Chọn một khách hàng để xem máy, sau đó mở chi tiết để xem telemetry và vị trí GPS.">
      {cardRows.length ? <div className="customer-monitor-grid">{cardRows.map((item) => <Link href={item.href} className="customer-monitor-card" key={item.href}><div className="customer-card-top"><span className="customer-avatar">{item.name[0]}</span><span className="customer-machines"><b>{item.count}</b> máy Smart</span></div><strong>{item.name}</strong><small>{item.owner}</small><div className="card-divider" /><span className="monitor-status"><i />{item.status}<ChevronRight size={15} /></span></Link>)}</div> : <p className="small-note">Chưa có hợp đồng Smart IoT đang hoạt động.</p>}
    </Panel>
    <Panel title="Trạng thái kết nối" subtitle="Số ly của máy thay Smart IoT được cộng vào hợp đồng chính theo thời gian sử dụng.">
      <DataTable columns={["Khách hàng", "Máy", "Trạng thái", "Lần đồng bộ", "Ly hợp lệ"]} rows={smartContracts.map((contract) => {
        const invoice = latestByContract(contract.id);
        return { href: `${base}/${contract.customerId}/${contract.machineId}`, cells: [contract.storeName, <b key="a">{contract.machineId} ›</b>, <Pill key="b" tone="amber">Chờ đồng bộ</Pill>, "Cloud đến ngày 29 · dữ liệu ngày 30 còn chờ", `${invoice?.validCups ?? 0} ly · đã gộp máy thay`] };
      })} />
      {assignedReplacement.length > 0 && <p className="small-note">Máy thay đang hoạt động: {assignedReplacement.map((item) => `${item.replacementMachineId} → ${item.contractId}`).join(" · ")}</p>}
    </Panel>
  </>;
}

function Telemetry({ role, segments }: { role: Role; segments: string[] }) {
  const { store } = useDemoStore();
  const back = role === "customer" ? "/customer/machines" : role === "admin" ? "/admin/monitoring" : "/moderator/monitoring";
  const machine = segments.find((part) => /^(S-|CF-IOT-|IOT-)/.test(part)) ?? "S-018";
  const replacement = store.replacementAssignments.find((item) => item.replacementMachineId === machine);
  const contract = store.contracts.find((item) => item.machineId === machine || item.id === replacement?.contractId);
  const owned = role !== "customer" || contract?.customerId === "C-204";
  if (!contract || contract.machineType !== "Smart IoT" || !owned) return <Panel title="Không tìm thấy máy Smart IoT" subtitle="Máy không thuộc cửa hàng này hoặc không có telemetry trong Dolores."><Link href={back} className="button button-light">Quay lại danh sách máy</Link></Panel>;
  const invoice = store.invoices.find((item) => item.contractId === contract.id && item.period === "09/2026");
  const cups = invoice?.validCups ?? 0;
  const payg = cups * contract.paygRate;
  return <>
    <div className="detail-title-row"><div><Pill tone="amber">Smart IoT · Chờ đồng bộ</Pill><span className="machine-id">{machine} · {contract.id}</span></div><Link href={back} className="button button-light button-small">Quay lại danh sách</Link></div>
    <Metrics items={[{ label: "Ly hợp lệ trong kỳ", value: `${cups.toLocaleString("vi-VN")} ly`, note: "Bán thành công và máy gửi báo cáo thành công; gồm ly từ máy thay" }, { label: "Giá cơ bản", value: money(contract.monthlyRent) + " / tháng" }, { label: "Phí PAYG đã ghi nhận", value: money(payg) }, { label: "Cloud nhận đến", value: "Ngày 29 · còn chờ ngày 30" }]} />
    <div className="telemetry-grid">
      <div className="telemetry-main">
        <Panel title="Số ly gửi về theo ngày" subtitle="Chỉ tính ly bán thành công được máy ghi nhận và gửi báo cáo thành công.">
          <ChartCard title="Ly hợp lệ · 7 ngày gần nhất" subtitle="Dữ liệu minh họa trong bản prototype" values={[{ month: "T2", value: 68 }, { month: "T3", value: 74 }, { month: "T4", value: 60 }, { month: "T5", value: 82 }, { month: "T6", value: 77 }, { month: "T7", value: 91 }, { month: "CN", value: 70 }]} />
        </Panel>
        <Panel title="Tình trạng đồng bộ" subtitle="Máy Edge lưu dữ liệu bán hàng khi mất mạng và tự gửi lên Cloud khi kết nối trở lại.">
          <div className="sync-card"><div className="sync-icon"><WifiOff size={18} /></div><div className="sync-copy"><strong>Cloud đã nhận đến ngày 29</strong><p>Dữ liệu ngày 30 đang chờ máy kết nối lại. Nếu bill đã thanh toán hoặc đối soát, số ly muộn được cộng vào tháng sau. Nếu bill còn trong thời hạn điều chỉnh, Moderator có thể tính lại và gửi bill mới.</p></div><Pill tone="amber">Chờ đồng bộ</Pill></div>
          <p className="small-note">Điều kiện trong hợp đồng này: máy không offline quá {contract.maxOfflineDays ?? 5} ngày/tháng. Ngưỡng này có thể được thương lượng khác; bill cuối kỳ chờ đủ điều kiện online theo hợp đồng.</p>
        </Panel>
      </div>
      <div className="telemetry-side">
        <Panel title="Mô hình máy" subtitle="Hình minh họa thiết bị"><MachineModel /><div className="model-actions"><button className="button button-light button-small">Góc nhìn trước</button><button className="button button-light button-small">Góc nhìn bên</button></div></Panel>
        <Panel title="Vị trí & kết nối" subtitle="Vị trí giám sát GPS chỉ có với máy Smart IoT"><div className="map-card"><div className="map-lines" /><span className="map-pin"><MapPin size={19} fill="currentColor" /></span><span className="map-caption">{contract.location}</span></div><div className="details-grid details-one"><Info label="Vị trí theo hợp đồng" value={contract.location} /><Info label="Vị trí giám sát GPS" value="Vị trí máy gửi gần nhất · dữ liệu minh họa" /><Info label="Trạng thái mạng" value="Mất kết nối · dữ liệu Cloud đến ngày 29" /></div></Panel>
      </div>
    </div>
  </>;
}

function MenuManagement({ role, notify }: { role: Role; notify: (message: string) => void }) {
  const { store, updateStore } = useDemoStore();
  const tenant = role === "customer";
  const [draft, setDraft] = useState(store.menu.recipes);
  const [newName, setNewName] = useState("");
  const [newIngredients, setNewIngredients] = useState("");
  const [globalDraft, setGlobalDraft] = useState(store.globalMenu.recipes);
  const [addOpen, setAddOpen] = useState(false);
  const [globalAddOpen, setGlobalAddOpen] = useState(false);
  const [globalName, setGlobalName] = useState("");
  const [globalIngredients, setGlobalIngredients] = useState("");
  const [globalCoffeeGrams, setGlobalCoffeeGrams] = useState("18");
  const [globalWaterMl, setGlobalWaterMl] = useState("");
  const [globalMilkMl, setGlobalMilkMl] = useState("");
  useEffect(() => { setDraft(store.menu.recipes); }, [store.menu.recipes]);
  useEffect(() => { setGlobalDraft(store.globalMenu.recipes); }, [store.globalMenu.recipes]);
  const editPersonal = (name: string, field: "coffeeGrams" | "waterMl" | "milkMl", value: number) => setDraft((current) => current.map((recipe) => recipe.name === name ? { ...recipe, [field]: value } : recipe));
  const savePersonal = () => {
    updateStore((current) => ({ ...current, menu: { ...current.menu, recipes: draft.map((recipe) => {
      const base = current.globalMenu.recipes.find((item) => item.name === recipe.name);
      const isDefault = base && base.coffeeGrams === recipe.coffeeGrams && base.waterMl === recipe.waterMl && base.milkMl === recipe.milkMl;
      return { ...recipe, status: isDefault ? "Theo Global Menu" : "Chờ máy xác nhận" };
    }) } }));
    notify("Đã lưu công thức riêng. Trạng thái chờ máy Smart IoT xác nhận nhận và áp dụng.");
  };
  const addPersonal = () => {
    if (!newName.trim() || !newIngredients.trim()) return showValidation("Nhập tên món và các thành phần cần có.");
    updateStore((current) => ({ ...current, menu: { ...current.menu, proposals: [...current.menu.proposals, { name: newName.trim(), ingredients: newIngredients.trim(), status: "Chờ xác nhận máy hỗ trợ" }] } }));
    setNewName(""); setNewIngredients("");
    notify("Đã lưu đề xuất món riêng; cần xác nhận máy hỗ trợ trước khi sử dụng.");
  };
  const saveGlobal = () => {
    updateStore((current) => {
      const inheritedRecipes = current.menu.recipes.map((recipe) => {
        if (recipe.status !== "Theo Global Menu") return recipe;
        const base = globalDraft.find((item) => item.name === recipe.name);
        return base ? { name: base.name, coffeeGrams: base.coffeeGrams, waterMl: base.waterMl, milkMl: base.milkMl, status: "Theo Global Menu" } : recipe;
      });
      const existingNames = new Set(inheritedRecipes.map((recipe) => recipe.name.toLocaleLowerCase("vi")));
      const newlyPublished = globalDraft
        .filter((recipe) => !existingNames.has(recipe.name.toLocaleLowerCase("vi")))
        .map((recipe) => ({ name: recipe.name, coffeeGrams: recipe.coffeeGrams, waterMl: recipe.waterMl, milkMl: recipe.milkMl, status: "Theo Global Menu" }));
      return {
        ...current,
        globalMenu: { version: current.globalMenu.version + 1, recipes: globalDraft },
        menu: { ...current.menu, recipes: [...inheritedRecipes, ...newlyPublished] },
      };
    });
    notify("Đã lưu phiên bản Global Menu mới để đồng bộ tới máy Smart IoT.");
  };
  const addGlobalRecipe = () => {
    const ingredients = globalIngredients.split(",").map((item) => item.trim()).filter(Boolean);
    const coffeeGrams = Number(globalCoffeeGrams);
    const waterMl = globalWaterMl.trim() ? Number(globalWaterMl) : undefined;
    const milkMl = globalMilkMl.trim() ? Number(globalMilkMl) : undefined;
    if (!globalName.trim() || !ingredients.length || globalDraft.some((item) => item.name.toLocaleLowerCase("vi") === globalName.trim().toLocaleLowerCase("vi"))) return showValidation("Nhập tên món duy nhất và các thành phần bắt buộc.");
    if (!Number.isFinite(coffeeGrams) || coffeeGrams <= 0 || (globalWaterMl.trim() && (!Number.isFinite(waterMl) || (waterMl ?? 0) <= 0)) || (globalMilkMl.trim() && (!Number.isFinite(milkMl) || (milkMl ?? 0) <= 0))) return showValidation("Nhập định lượng lớn hơn 0 cho từng thành phần có sử dụng.");
    const normalizedIngredients = ingredients.map((item) => item.toLocaleLowerCase("vi"));
    if (normalizedIngredients.some((item) => item.includes("nước")) && !waterMl) return showValidation("Món có thành phần nước cần có định lượng nước.");
    if (normalizedIngredients.some((item) => item.includes("sữa")) && !milkMl) return showValidation("Món có thành phần sữa cần có định lượng sữa.");
    if (normalizedIngredients.some((item) => item.includes("cà phê")) && !coffeeGrams) return showValidation("Món có thành phần cà phê cần có định lượng cà phê.");
    setGlobalDraft((current) => [...current, { name: globalName.trim(), coffeeGrams, waterMl, milkMl, requiredIngredients: ingredients }]);
    setGlobalName(""); setGlobalIngredients(""); setGlobalCoffeeGrams("18"); setGlobalWaterMl(""); setGlobalMilkMl(""); setGlobalAddOpen(false);
  };
  return <>
    <div className="menu-intro"><div className="menu-intro-icon"><AppIcon name="coffee" size={21} /></div><div><strong>{tenant ? "Menu riêng từ Global Menu Dolores" : "Global Menu Dolores"}</strong><p>{tenant ? "Bạn chỉ tinh chỉnh công thức riêng từ menu Dolores đã có trên máy; không chỉnh sửa menu toàn cục." : "Chỉ Admin và Moderator quản lý menu toàn cục. Global Menu là công thức mặc định được cài sẵn trên máy Smart IoT."}</p></div></div>
    {tenant ? <Panel title="Tinh chỉnh công thức riêng" subtitle="Mỗi món lưu công thức riêng độc lập; thay đổi chỉ áp dụng cho cửa hàng của bạn.">
      {draft.map((recipe) => {
        const base = store.globalMenu.recipes.find((item) => item.name === recipe.name);
        return <div className="recipe-editor" key={recipe.name}><div className="recipe-editor-head"><span className="recipe-avatar"><AppIcon name="coffee" size={18} /></span><div><strong>{recipe.name}</strong><small>Global Menu · {base?.coffeeGrams ?? recipe.coffeeGrams} g cà phê{base?.waterMl ? ` · ${base.waterMl} ml nước` : ""}{base?.milkMl ? ` · ${base.milkMl} ml sữa` : ""}</small></div><Pill tone={recipe.status === "Chờ máy xác nhận" ? "amber" : "green"}>{recipe.status}</Pill></div><div className="recipe-fields"><label>Lượng cà phê (g)<input type="number" min="1" value={recipe.coffeeGrams} onChange={(event) => editPersonal(recipe.name, "coffeeGrams", Number(event.target.value))} /></label>{recipe.waterMl !== undefined && <label>Lượng nước (ml)<input type="number" min="1" value={recipe.waterMl} onChange={(event) => editPersonal(recipe.name, "waterMl", Number(event.target.value))} /></label>}{recipe.milkMl !== undefined && <label>Lượng sữa tươi (ml)<input type="number" min="1" value={recipe.milkMl} onChange={(event) => editPersonal(recipe.name, "milkMl", Number(event.target.value))} /></label>}</div></div>;
      })}
      {store.menu.proposals.length > 0 && <div className="details-grid">{store.menu.proposals.map((proposal) => <Info key={proposal.name} label={`${proposal.name} · ${proposal.status}`} value={proposal.ingredients} />)}</div>}
      <div className="action-strip"><button className="button button-primary" onClick={savePersonal}>Lưu & gửi công thức riêng <ArrowRight size={15} /></button><button className="button button-light" onClick={() => setAddOpen(!addOpen)}>Thêm món riêng</button></div>
      {addOpen && <div className="form-grid"><label>Tên món<input value={newName} onChange={(event) => setNewName(event.target.value)} /></label><label>Thành phần cần có<input value={newIngredients} onChange={(event) => setNewIngredients(event.target.value)} placeholder="Ví dụ: cà phê, sữa tươi" /></label><div className="form-wide"><button className="button button-primary" onClick={addPersonal}>Gửi đề xuất chờ xác nhận máy hỗ trợ</button></div></div>}
    </Panel> : <>
      <Metrics columns={3} items={[{ label: "Món trong Global Menu", value: `${store.globalMenu.recipes.length} món` }, { label: "Máy áp dụng", value: "Smart IoT" }, { label: "Phiên bản hiện tại", value: `v1.${store.globalMenu.version}` }]} />
      <Panel title="Danh sách món trong Global Menu" subtitle="Menu toàn cục chỉ áp dụng cho máy Smart IoT; máy thường không nhận menu Dolores." action={<button className="button button-light button-small" onClick={() => setGlobalAddOpen(!globalAddOpen)}><Plus size={14} /> Thêm món Global</button>}>
        {globalAddOpen && <div className="form-grid"><label>Tên món<input value={globalName} onChange={(event) => setGlobalName(event.target.value)} /></label><label>Thành phần bắt buộc<input value={globalIngredients} onChange={(event) => setGlobalIngredients(event.target.value)} placeholder="Cà phê, sữa tươi" /></label><label>Lượng cà phê (g)<input type="number" min="1" value={globalCoffeeGrams} onChange={(event) => setGlobalCoffeeGrams(event.target.value)} /></label><label>Lượng nước (ml), nếu có<input type="number" min="1" value={globalWaterMl} onChange={(event) => setGlobalWaterMl(event.target.value)} /></label><label>Lượng sữa tươi (ml), nếu có<input type="number" min="1" value={globalMilkMl} onChange={(event) => setGlobalMilkMl(event.target.value)} /></label><div className="form-wide"><button className="button button-light" onClick={addGlobalRecipe}>Thêm vào bản nháp Global Menu</button></div></div>}
        {globalDraft.map((recipe) => <div className="recipe-editor compact-editor" key={recipe.name}><div className="recipe-editor-head"><span className="recipe-avatar"><AppIcon name="coffee" size={18} /></span><div><strong>{recipe.name}</strong><small>Thành phần bắt buộc: {recipe.requiredIngredients.join(" + ")}</small></div><Pill tone="blue">Global Menu</Pill></div><div className="recipe-fields"><label>Lượng cà phê (g)<input type="number" min="1" value={recipe.coffeeGrams} onChange={(event) => setGlobalDraft((items) => items.map((item) => item.name === recipe.name ? { ...item, coffeeGrams: Number(event.target.value) } : item))} /></label>{recipe.waterMl !== undefined && <label>Lượng nước (ml)<input type="number" min="1" value={recipe.waterMl} onChange={(event) => setGlobalDraft((items) => items.map((item) => item.name === recipe.name ? { ...item, waterMl: Number(event.target.value) } : item))} /></label>}{recipe.milkMl !== undefined && <label>Lượng sữa tươi (ml)<input type="number" min="1" value={recipe.milkMl} onChange={(event) => setGlobalDraft((items) => items.map((item) => item.name === recipe.name ? { ...item, milkMl: Number(event.target.value) } : item))} /></label>}</div></div>)}
        <div className="action-strip"><button className="button button-primary" onClick={saveGlobal}>Lưu Global Menu & phát hành phiên bản <ArrowRight size={15} /></button><span className="small-note">Thay đổi được gửi tới máy Smart IoT; trạng thái áp dụng thực tế phụ thuộc xác nhận từ máy.</span></div>
      </Panel>
    </>}
    <Panel title="Menu trên máy" subtitle="Ứng dụng thật cần trạng thái xác nhận từ thiết bị; bản demo lưu trạng thái chờ xác nhận.">
      <DataTable columns={["Món", "Công thức gốc", tenant ? "Công thức riêng" : "Phiên bản Global", "Trạng thái"]} rows={(tenant ? draft : store.globalMenu.recipes.map((recipe) => ({ ...recipe, status: "Global Menu" }))).map((recipe) => ({ cells: [<b key="a">{recipe.name}</b>, (() => { const base = store.globalMenu.recipes.find((item) => item.name === recipe.name); return `${base?.coffeeGrams ?? recipe.coffeeGrams} g cà phê${base?.waterMl ? ` · ${base.waterMl} ml nước` : ""}${base?.milkMl ? ` · ${base.milkMl} ml sữa` : ""}`; })(), tenant ? `${recipe.coffeeGrams} g cà phê${recipe.waterMl ? ` · ${recipe.waterMl} ml nước` : ""}${recipe.milkMl ? ` · ${recipe.milkMl} ml sữa` : ""}` : `v1.${store.globalMenu.version}`, <Pill key="b" tone={recipe.status === "Chờ máy xác nhận" ? "amber" : "neutral"}>{recipe.status}</Pill>] }))} />
      {!tenant && <div className="notice notice-soft-red"><AppIcon name="menu" size={17} /><div><strong>Phạm vi quyền chỉnh sửa</strong><p>Admin và Moderator quản lý Global Menu. Khách hàng chỉ lưu công thức riêng từ menu Dolores đã nhận.</p></div></div>}
    </Panel>
  </>;
}

function Reports() {
  const { store } = useDemoStore();
  const paid = store.invoices.filter((item) => item.status === "paid" || item.status === "refunded");
  const actual = paid.reduce((sum, item) => sum + item.baseFee + item.validCups * item.paygRate + item.otherCharges, 0);
  const depositPaid = paid.reduce((sum, item) => sum + item.deposit, 0);
  const smartInvoices = store.invoices.filter((item) => getDemoContractById(store, item.contractId)?.machineType === "Smart IoT" && item.period === "09/2026");
  const cups = smartInvoices.reduce((sum, item) => sum + item.validCups, 0);
  const active = store.contracts.filter((item) => item.status !== "Đã kết thúc");
  return <>
    <Metrics items={[{ label: "Doanh thu gộp · đã thu", value: money(actual + depositPaid), note: "Bao gồm tiền cọc đã thu" }, { label: "Doanh thu thực tế", value: money(actual), note: "Không bao gồm tiền cọc" }, { label: "Tiền cọc", value: money(depositPaid), note: "Theo dõi riêng" }, { label: "Tổng ly Smart trong tháng", value: `${cups.toLocaleString("vi-VN")} ly` }]} />
    <ChartCard title="Doanh thu thực tế" subtitle="Không bao gồm tiền cọc · dữ liệu theo bill đã đối soát" values={[{ month: "T4", value: 0 }, { month: "T5", value: 0 }, { month: "T6", value: 0 }, { month: "T7", value: 0 }, { month: "T8", value: 3.89 }, { month: "T9", value: actual / 1000000 }]} unit="M" />
    <div className="two-column"><Panel title="Hợp đồng" subtitle="Số hồ sơ theo trạng thái"><div className="details-grid"><Info label="Còn hiệu lực" value={`${active.filter((item) => item.status === "Còn hiệu lực").length} hợp đồng`} /><Info label="Sắp hết hạn" value={`${active.filter((item) => item.status === "Sắp hết hạn").length} hợp đồng`} /><Info label="Máy Smart đang thuê" value={`${active.filter((item) => item.machineType === "Smart IoT").length} máy`} /><Info label="Máy thường đang thuê" value={`${active.filter((item) => item.machineType === "Máy thường").length} máy`} /></div></Panel><Panel title="Máy & sản lượng" subtitle="Thống kê theo dữ liệu đang có"><div className="details-grid"><Info label="Tổng máy hoạt động" value={`${active.length} máy`} /><Info label="Smart IoT đang chờ đồng bộ" value={`${active.filter((item) => item.machineType === "Smart IoT").length} máy`} /><Info label="Số ly hợp lệ tháng 09" value={`${cups.toLocaleString("vi-VN")} ly`} /><Info label="Smart IoT trong kho" value="12 · dữ liệu kho minh họa" /></div></Panel></div>
  </>;
}

function Technical({ role, segments, notify }: { role: Role; segments: string[]; notify: (message: string) => void }) {
  const { store, updateStore } = useDemoStore();
  const [contractId, setContractId] = useState(store.contracts[0]?.id ?? "");
  const [kind, setKind] = useState("Sửa chữa");
  const [technician, setTechnician] = useState("Lê Quốc Bảo");
  const [description, setDescription] = useState("");
  const saveTask = (contract = getDemoContractById(store, contractId), taskKind = kind, taskDescription = description) => {
    if (!contract || !taskDescription.trim()) return showValidation("Chọn hợp đồng/máy và nhập nội dung công việc.");
    const sequence = Math.max(32, ...store.tasks.map((task) => Number(task.id.replace("YC-", "")) || 0)) + 1;
    const task: TechnicalTask = { id: `YC-${String(sequence).padStart(3, "0")}`, kind: taskKind, machineId: contract.machineId, contractId: contract.id, customerId: contract.customerId, customerName: contract.storeName, technician, description: taskDescription.trim(), status: "Đã điều phối" };
    updateStore((current) => ({ ...current, tasks: [task, ...current.tasks] }));
    setDescription(""); notify(`Đã điều phối ${task.id} cho ${technician}.`);
  };
  const dispatchFromSupport = (requestId: string) => {
    const request = store.supportRequests.find((item) => item.id === requestId);
    const contract = store.contracts.find((item) => item.customerId === request?.customerId && item.machineId === request?.machineId);
    if (!request || !contract) return;
    const sequence = Math.max(32, ...store.tasks.map((task) => Number(task.id.replace("YC-", "")) || 0)) + 1;
    const task: TechnicalTask = { id: `YC-${String(sequence).padStart(3, "0")}`, kind: "Sửa chữa", machineId: request.machineId, contractId: contract.id, customerId: request.customerId, customerName: request.customerName, technician: "Lê Quốc Bảo", description: request.description, status: "Đã điều phối", source: "support" };
    updateStore((current) => ({ ...current, tasks: [task, ...current.tasks], supportRequests: current.supportRequests.map((item) => item.id === requestId ? { ...item, status: `Đã điều phối ${task.id}` } : item) }));
    notify(`Đã tạo ${task.id} từ yêu cầu hỗ trợ ${requestId}.`);
  };
  if (role === "technician" || segments[0] === "tasks") return <>
    <div className="notice notice-sand"><AppIcon name="clipboard" size={17} /><div><strong>Hồ sơ công việc được điều phối bởi Moderator</strong><p>Technician ghi nhận kết quả vào lịch sử máy. Tiêu chí đánh giá nội bộ không thuộc phạm vi vận hành của nền tảng.</p></div></div>
    <Panel title={segments.length > 1 ? `Yêu cầu ${segments[1]}` : "Công việc được giao"} subtitle="Mở yêu cầu để xem máy, hợp đồng và ghi nhận kết quả.">
      <DataTable columns={["Mã việc", "Loại việc", "Máy / hồ sơ", "Khách hàng", "Trạng thái"]} rows={store.tasks.map((task) => ({ href: `/technician/tasks/${task.id}`, cells: [<b key="a">{task.id} ›</b>, task.kind, `${task.machineId} · ${task.contractId}`, task.customerName, <Pill key="b" tone={task.status === "Đã hoàn tất" ? "green" : "amber"}>{task.status}</Pill>] }))} />
    </Panel>
  </>;
  return <>
    {store.supportRequests.some((request) => !request.status.startsWith("Đã điều phối")) && <Panel title="Yêu cầu khách hàng chờ xử lý" subtitle="Moderator xem mô tả rồi điều phối Technician khi cần."><DataTable columns={["Mã yêu cầu", "Khách hàng", "Máy", "Mô tả", "Trạng thái", ""]} rows={store.supportRequests.filter((request) => !request.status.startsWith("Đã điều phối")).map((request) => ({ cells: [<b key="a">{request.id}</b>, request.customerName, request.machineId, request.description, request.status, <button key="b" className="text-link" onClick={() => dispatchFromSupport(request.id)}>Điều phối <ArrowRight size={14} /></button>] }))} /></Panel>}
    {segments[1] === "new" && <Panel title="Điều phối công việc" subtitle="Chọn máy theo hợp đồng và mô tả nhiệm vụ cho Technician."><div className="form-grid"><label>Hợp đồng / máy<select value={contractId} onChange={(event) => setContractId(event.target.value)}>{store.contracts.filter((item) => item.status !== "Đã kết thúc").map((item) => <option key={item.id} value={item.id}>{item.id} · {item.machineId} · {item.storeName}</option>)}</select></label><label>Loại công việc<select value={kind} onChange={(event) => setKind(event.target.value)}><option>Sửa chữa</option><option>Lắp đặt máy</option><option>Kích hoạt Smart IoT</option><option>Thu hồi & đánh giá</option></select></label><label>Technician<select value={technician} onChange={(event) => setTechnician(event.target.value)}><option>Lê Quốc Bảo</option></select></label><label className="form-wide">Nội dung điều phối<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả việc cần thực hiện" /></label><div className="form-wide"><button className="button button-primary" onClick={() => saveTask()}>Gửi yêu cầu kỹ thuật <ArrowRight size={15} /></button></div></div></Panel>}
    <Panel title="Danh sách yêu cầu kỹ thuật" subtitle="Yêu cầu một lần được lưu để theo dõi; hệ thống không tự lên lịch bảo trì."><DataTable columns={["Mã việc", "Loại việc", "Máy / hợp đồng", "Technician", "Trạng thái"]} rows={store.tasks.map((task) => ({ href: `/moderator/technical-requests/${task.id}`, cells: [<b key="a">{task.id}</b>, task.kind, `${task.machineId} · ${task.contractId}`, task.technician, <Pill key="b" tone={task.status === "Đã hoàn tất" ? "green" : "amber"}>{task.status}</Pill>] }))} /></Panel>
  </>;
}

function TechnicianTaskDetail({ taskId }: { taskId: string }) {
  const { store, updateStore } = useDemoStore();
  const task = store.tasks.find((item) => item.id === taskId);
  const [workSummary, setWorkSummary] = useState("");
  const [partName, setPartName] = useState("");
  const [partCost, setPartCost] = useState("");
  const [damage, setDamage] = useState("0");
  const [collected, setCollected] = useState(false);
  if (!task) return <Panel title="Không tìm thấy yêu cầu" subtitle="Kiểm tra lại mã công việc hoặc quay về danh sách việc được giao."><Link href="/technician" className="button button-light">Về danh sách</Link></Panel>;
  const isRecovery = task.kind === "Thu hồi & đánh giá";
  const isBuybackAssessment = task.kind === "Đánh giá máy thu mua";
  const isBuybackCollection = task.kind === "Thu gom máy thu mua";
  const isBuybackTest = task.kind === "Tân trang & kiểm thử";
  const saveResult = () => {
    if (task.status === "Đã hoàn tất") return;
    if (isRecovery && !collected) return showValidation("Xác nhận đã thu hồi máy trước khi lưu kết quả.");
    if (!isRecovery && !workSummary.trim()) return showValidation("Nhập kết quả công việc trước khi lưu.");
    const now = new Date();
    const detail = isRecovery ? `Đã thu hồi; ${Number(damage) > 0 ? `thiệt hại ghi nhận ${money(Number(damage))}` : "không ghi nhận hư hỏng"}.` : `${workSummary.trim()}${partName.trim() ? ` · Linh kiện: ${partName.trim()}` : ""}${partCost ? ` · Chi phí ghi nhận: ${money(Number(partCost))}` : ""}`;
    updateStore((current) => {
      let next = { ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status: "Đã hoàn tất" } : item), machineHistory: [{ date: now.toLocaleDateString("vi-VN"), machineId: task.machineId, contractId: task.contractId, detail, recordedBy: "Technician" }, ...current.machineHistory] };
      if (isRecovery) next = { ...next, depositAssessment: { collected: true, damageAmount: Math.max(0, Number(damage) || 0), assessedAt: now.toISOString() } };
      if (isBuybackAssessment) next = { ...next, buybacks: next.buybacks.map((item) => item.id === task.contractId ? { ...item, technicianAssessed: true, status: "Chờ Moderator thỏa thuận" } : item) };
      if (isBuybackCollection) next = { ...next, buybacks: next.buybacks.map((item) => item.id === task.contractId ? { ...item, status: "Đang tân trang & kiểm thử" } : item), tasks: [{ id: `YC-${String(Math.max(32, ...current.tasks.map((entry) => Number(entry.id.replace("YC-", "")) || 0)) + 1).padStart(3, "0")}`, kind: "Tân trang & kiểm thử", machineId: task.machineId, contractId: task.contractId, customerId: task.customerId, customerName: task.customerName, technician: task.technician, description: "Tân trang và kiểm thử máy trước khi chuyển vào kho sẵn sàng cho thuê.", status: "Chờ kiểm thử", source: "buyback" }, ...next.tasks] };
      if (isBuybackTest) next = { ...next, buybacks: next.buybacks.map((item) => item.id === task.contractId ? { ...item, status: "Sẵn sàng cho thuê" } : item) };
      return next;
    });
  };
  return <><div className="detail-title-row"><span className="machine-id">{task.machineId} · {task.contractId}</span><Link href="/technician" className="button button-light button-small">Về danh sách việc</Link></div><Panel title={`${task.id} · ${task.kind}`} subtitle={`${task.machineId} · ${task.contractId} · ${task.customerName}`}><div className="details-grid"><Info label="Technician phụ trách" value={task.technician} /><Info label="Trạng thái" value={task.status} /><Info label="Nội dung Moderator giao" value={task.description} /></div>{task.status !== "Đã hoàn tất" ? <div className="form-grid">{isRecovery ? <><label>Thu hồi máy<select value={collected ? "yes" : "no"} onChange={(event) => setCollected(event.target.value === "yes")}><option value="no">Chưa thu hồi</option><option value="yes">Đã thu hồi</option></select></label><label>Thiệt hại ghi nhận (đ)<input type="number" min="0" value={damage} onChange={(event) => setDamage(event.target.value)} /></label></> : <><label className="form-wide">Kết quả đã thực hiện<textarea value={workSummary} onChange={(event) => setWorkSummary(event.target.value)} placeholder="Ghi nhận tình trạng và nội dung thực hiện" /></label>{!isBuybackAssessment && <><label>Linh kiện thay thế (nếu có)<input value={partName} onChange={(event) => setPartName(event.target.value)} placeholder="Tên linh kiện" /></label><label>Chi phí theo hợp đồng (đ)<input type="number" min="0" value={partCost} onChange={(event) => setPartCost(event.target.value)} /></label></>}</>}<div className="form-wide"><button className="button button-primary" onClick={saveResult}>Lưu kết quả & cập nhật lịch sử máy</button></div></div> : <div className="notice notice-sand"><Check size={17} /><div><strong>Đã ghi nhận hoàn tất</strong><p>Kết quả công việc đã được thêm vào lịch sử.</p></div></div>}</Panel></>;
}

function HistoryPage({ role }: { role: Role }) {
  const { store } = useDemoStore();
  const rows = store.machineHistory.map((item) => ({ cells: [item.date, <b key="a">{item.machineId}</b>, item.contractId, item.detail, item.recordedBy] }));
  const active = store.contracts.filter((item) => item.status !== "Đã kết thúc");
  return <>
    <div className="filter-line"><label className="search-box"><Search size={15} /><input placeholder="Tìm mã máy, linh kiện hoặc hợp đồng" /></label><button className="button button-light button-small">Tất cả máy <ChevronDown size={14} /></button></div>
    <Panel title="Lịch sử máy" subtitle="Nền tảng lưu và tra cứu các lần bàn giao, sửa chữa, bảo trì, thay linh kiện và máy thay.">
      <DataTable columns={["Ngày", "Máy", "Hợp đồng / hồ sơ", "Nội dung", "Ghi nhận bởi"]} rows={rows} />
      <div className="notice notice-sand"><Clock3 size={17} /><div><strong>Hệ thống hỗ trợ lưu và theo dõi</strong><p>Lịch bảo trì, sửa chữa, vật tư, linh kiện và chi phí được ghi nhận theo nội dung đã thỏa thuận. Tiêu chí đánh giá nội bộ và việc lên lịch nằm ngoài phạm vi nền tảng.</p></div></div>
    </Panel>
    {role === "admin" && <Panel title="Lọc theo máy" subtitle="Tổng quan từ các hợp đồng và máy thay trong dữ liệu demo"><div className="details-grid"><Info label="Máy trong hợp đồng" value={`${active.length} máy`} /><Info label="Trong kho Smart IoT" value="12 · dữ liệu minh họa" /><Info label="Đang cho mượn" value={String(store.replacementAssignments.filter((item) => !item.returnedAt).length)} /><Info label="Đang tân trang / kiểm thử" value={String(store.buybacks.filter((item) => item.status === "Đang tân trang & kiểm thử").length)} /></div></Panel>}
  </>;
}

function Buyback({ role }: { role: Role }) {
  const { store, updateStore } = useDemoStore();
  const customer = role === "customer";
  const cases = customer ? store.buybacks.filter((item) => item.customerId === "C-204") : store.buybacks;
  const [files, setFiles] = useState<Record<string, { contract?: string; proof?: string }>>({});
  const setFile = (caseId: string, key: "contract" | "proof", name: string) => setFiles((current) => ({ ...current, [caseId]: { ...current[caseId], [key]: name } }));
  const advance = (caseId: string, next: BuybackCase["status"], patch: Partial<BuybackCase> = {}) => updateStore((current) => ({ ...current, buybacks: current.buybacks.map((item) => item.id === caseId ? { ...item, ...patch, status: next } : item) }));
  const dispatchCollection = (item: BuybackCase) => {
    const sequence = Math.max(32, ...store.tasks.map((task) => Number(task.id.replace("YC-", "")) || 0)) + 1;
    const task: TechnicalTask = { id: `YC-${String(sequence).padStart(3, "0")}`, kind: "Thu gom máy thu mua", machineId: item.machineId, contractId: item.id, customerId: item.customerId, customerName: item.storeName, technician: "Lê Quốc Bảo", description: "Thu gom máy theo thỏa thuận mua bán; xác nhận riêng của khách không chặn việc điều phối.", status: "Đã điều phối", source: "buyback" };
    updateStore((current) => ({ ...current, tasks: [task, ...current.tasks], buybacks: current.buybacks.map((currentCase) => currentCase.id === item.id ? { ...currentCase, status: "Đã điều phối thu gom" } : currentCase) }));
  };
  return <>
    <div className="buyback-steps">{["Technician đánh giá", "Moderator thỏa thuận", "Ký hợp đồng mua", "Chuyển khoản & lưu chứng từ", "Thu gom · tân trang · kiểm thử"].map((label, index) => <div className={`buyback-step ${index === 0 ? "step-done" : ""}`} key={label}><span>{index + 1}</span><small>{label}</small></div>)}</div>
    <Panel title={customer ? "Hồ sơ thu mua máy cũ" : "Hồ sơ thu mua của khách đang thuê"} subtitle="Chỉ hỗ trợ khách đang thuê Dolores. Xác nhận đã xem chứng từ được theo dõi riêng và không chặn điều phối thu gom theo thỏa thuận.">
      {cases.map((item) => {
        const assessmentTask = store.tasks.find((task) => task.contractId === item.id && task.kind === "Đánh giá máy thu mua");
        const collectionTask = store.tasks.find((task) => task.contractId === item.id && task.kind === "Thu gom máy thu mua");
        const refurbishmentTask = store.tasks.find((task) => task.contractId === item.id && task.kind === "Tân trang & kiểm thử");
        return <article className="panel" key={item.id}>
        <div className="panel-heading"><div><h2>{item.id} · {item.storeName}</h2><p>{item.machineId} · {item.machineType} · Hợp đồng thuê {item.contractId}</p></div><Pill tone={item.status === "Sẵn sàng cho thuê" ? "green" : "amber"}>{item.status}</Pill></div>
        <div className="details-grid"><Info label="Technician đánh giá" value={item.technicianAssessed ? "Đã đánh giá" : "Chưa đánh giá"} /><Info label="Hợp đồng mua bên ngoài" value={item.purchaseContractFile ?? "Chưa tải lên"} /><Info label="Chứng từ chuyển khoản" value={item.paymentProofFile ?? "Chưa tải lên"} /><Info label="Khách xác nhận đã xem" value={item.customerAcknowledgedAt ? formatDate(item.customerAcknowledgedAt.slice(0, 10)) : "Chưa xác nhận · không chặn thu gom"} /></div>
        {customer && item.paymentProofFile && !item.customerAcknowledgedAt && <button className="button button-light button-small" onClick={() => advance(item.id, item.status, { customerAcknowledgedAt: new Date().toISOString() })}>Xác nhận đã xem chứng từ</button>}
        {!customer && item.status === "Chờ Technician đánh giá" && <div className="action-strip">{assessmentTask ? <Link className="button button-light" href={`/moderator/technical-requests/${assessmentTask.id}`}>Xem yêu cầu đánh giá · {assessmentTask.id} <ArrowRight size={15} /></Link> : <span className="small-note">Chưa có yêu cầu đánh giá Technician cho hồ sơ này.</span>}</div>}
        {!customer && item.status === "Chờ Moderator thỏa thuận" && <div className="action-strip"><button className="button button-primary" onClick={() => advance(item.id, "Chờ hợp đồng mua")}>Ghi nhận đã chốt thỏa thuận mua <ArrowRight size={15} /></button></div>}
        {!customer && item.status === "Chờ hợp đồng mua" && <div className="form-grid"><label className="form-wide upload-box"><Download size={17} /><span>{files[item.id]?.contract || "Tải hợp đồng mua đã ký bên ngoài"}<input type="file" accept=".pdf,image/*" onChange={(event) => setFile(item.id, "contract", event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => { const filename = files[item.id]?.contract; if (!filename) return showValidation("Tải hợp đồng mua đã ký lên trước."); advance(item.id, "Chờ chuyển khoản", { purchaseContractFile: filename }); }}>Lưu hợp đồng mua</button></div></div>}
        {!customer && item.status === "Chờ chuyển khoản" && <div className="form-grid"><label className="form-wide upload-box"><Download size={17} /><span>{files[item.id]?.proof || "Tải ảnh chứng từ chuyển khoản bên ngoài"}<input type="file" accept="image/*,.pdf" onChange={(event) => setFile(item.id, "proof", event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={() => { const filename = files[item.id]?.proof; if (!filename) return showValidation("Tải chứng từ chuyển khoản lên trước."); advance(item.id, "Chờ thu gom", { paymentProofFile: filename }); }}>Lưu chứng từ & chuyển sang chờ thu gom</button></div></div>}
        {!customer && item.status === "Chờ thu gom" && <div className="action-strip"><button className="button button-primary" onClick={() => dispatchCollection(item)}>Điều phối Technician thu gom <ArrowRight size={15} /></button><span className="small-note">Có thể điều phối theo thỏa thuận dù khách chưa xác nhận đã xem chứng từ.</span></div>}
        {!customer && item.status === "Đã điều phối thu gom" && <div className="action-strip">{collectionTask ? <Link className="button button-light" href={`/moderator/technical-requests/${collectionTask.id}`}>Xem công việc thu gom · {collectionTask.id} <ArrowRight size={15} /></Link> : <span className="small-note">Chưa có công việc thu gom được ghi nhận trong hệ thống.</span>}<span className="small-note">Việc thu gom không bị chặn bởi xác nhận đã xem chứng từ.</span></div>}
        {!customer && item.status === "Đang tân trang & kiểm thử" && <div className="action-strip">{refurbishmentTask ? <Link className="button button-light" href={`/moderator/technical-requests/${refurbishmentTask.id}`}>Xem yêu cầu tân trang · {refurbishmentTask.id} <ArrowRight size={15} /></Link> : <span className="small-note">Chưa có yêu cầu tân trang và kiểm thử trong hệ thống.</span>}</div>}
      </article>;
      })}
    </Panel>
    <div className="two-column"><Panel title="Trình tự xử lý" subtitle="Mua bán và chuyển khoản thực hiện bên ngoài Dolores"><div className="timeline-list"><Timeline number="01" title="Technician kiểm tra và đánh giá máy" text="Đánh giá nội bộ trước khi Moderator chốt điều kiện mua." /><Timeline number="02" title="Moderator thỏa thuận và lập hợp đồng mua" text="Hợp đồng mua bán được ký bên ngoài và bản đã ký tải lên hồ sơ." /><Timeline number="03" title="Chuyển khoản và lưu chứng từ" text="Moderator lưu chứng từ giao dịch; khách xác nhận đã xem riêng." /><Timeline number="04" title="Thu gom, tân trang và kiểm thử" text="Sau khi hoàn tất kiểm thử, máy mới chuyển sang trạng thái sẵn sàng cho thuê." /></div></Panel><Panel title="Máy chờ xử lý" subtitle="Tiến độ theo từng hồ sơ"><div className="todo-list">{cases.map((item) => <Todo key={item.id} icon="package" title={`${item.id} · ${item.machineId}`} text={item.status} href={customer ? "/customer/buyback" : "/moderator/buyback"} />)}</div></Panel></div>
  </>;
}

function Timeline({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="timeline-item"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>;
}

function Support({ notify }: { notify: (message: string) => void }) {
  const { store, updateStore } = useDemoStore();
  const contracts = store.contracts.filter((item) => item.customerId === "C-204" && item.status !== "Đã kết thúc");
  const [machineId, setMachineId] = useState(contracts[0]?.machineId ?? "");
  const [kind, setKind] = useState("Lỗi thiết bị");
  const [description, setDescription] = useState("");
  const [photoName, setPhotoName] = useState("");
  const submit = () => {
    if (!description.trim()) return showValidation("Mô tả tình trạng máy trước khi gửi yêu cầu.");
    const sequence = store.supportRequests.length + 1;
    const request = { id: `HT-${String(sequence).padStart(3, "0")}`, customerId: "C-204", customerName: "Nguyễn Minh An · Cà phê Mộc", machineId, kind, description: description.trim(), status: "Chờ Moderator xem xét", createdAt: new Date().toISOString(), photoName: photoName || undefined };
    updateStore((current) => ({ ...current, supportRequests: [request, ...current.supportRequests] }));
    setDescription(""); setPhotoName(""); notify(`Đã gửi yêu cầu ${request.id} đến Moderator.`);
  };
  return <>
    <Panel title="Gửi yêu cầu hỗ trợ" subtitle="Moderator tiếp nhận và điều phối Technician nếu cần xử lý máy.">
      <div className="form-grid"><label>Máy cần hỗ trợ<select value={machineId} onChange={(event) => setMachineId(event.target.value)}>{contracts.map((item) => <option key={item.id} value={item.machineId}>{item.machineId} · {item.machineType}</option>)}</select></label><label>Loại yêu cầu<select value={kind} onChange={(event) => setKind(event.target.value)}><option>Lỗi thiết bị</option><option>Yêu cầu kiểm tra</option><option>Khác</option></select></label><label className="form-wide">Mô tả tình trạng<textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả điều đang xảy ra với máy" /></label><label className="form-wide upload-box"><Download size={17} /><span>{photoName || "Đính kèm ảnh nếu có"}<input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")} /></span></label><div className="form-wide"><button className="button button-primary" onClick={submit}>Gửi yêu cầu hỗ trợ <ArrowRight size={15} /></button></div></div>
    </Panel>
    <Panel title="Yêu cầu gần đây" subtitle="Yêu cầu của cửa hàng được Moderator theo dõi."><DataTable columns={["Ngày gửi", "Mã yêu cầu", "Máy", "Nội dung", "Trạng thái"]} rows={store.supportRequests.filter((request) => request.customerId === "C-204").map((request) => ({ cells: [formatDate(request.createdAt.slice(0, 10)), <b key="a">{request.id}</b>, request.machineId, request.description, <Pill key="b" tone={request.status.startsWith("Đã điều phối") ? "green" : "amber"}>{request.status}</Pill>] }))} /></Panel>
  </>;
}

function Notifications({ role }: { role: Role }) {
  const { store } = useDemoStore();
  const items: { title: string; text: string; status: string; tone: "neutral" | "green" | "amber" | "red" | "blue" }[] = [];
  const pendingInvoices = store.invoices.filter((item) => item.status !== "paid" && item.status !== "refunded");
  if (role === "customer") {
    pendingInvoices.filter((item) => item.customerId === "C-204").forEach((item) => {
      const waiting = item.status === "awaiting_reconciliation";
      const daysLate = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(`${item.dueDate}T00:00:00`).getTime()) / 86400000);
      items.push({ title: `Hóa đơn ${item.period} · ${item.contractId}`, text: waiting ? "Đã gửi ảnh giao dịch; đang chờ Moderator đối chiếu với tài khoản ngân hàng công ty." : `Còn phải thanh toán ${money(currentInvoiceBalance(item))} · hạn ${formatDate(item.dueDate)}${daysLate > 0 ? " · phí trễ hạn cộng dồn 5% mỗi ngày" : ""}.`, status: waiting ? "Chờ đối chiếu" : daysLate > 0 ? "Nhắc thanh toán" : "Cần xử lý", tone: waiting ? "blue" : daysLate > 0 ? "red" : "amber" });
    });
    store.contracts.filter((item) => item.customerId === "C-204" && currentContractStatus(item) === "Sắp hết hạn").forEach((contract) => {
      const responded = store.expiryResponses.some((item) => item.contractId === contract.id);
      items.push({ title: `Hợp đồng ${contract.id} sắp hết hạn`, text: responded ? "Bạn đã đề nghị trao đổi để lập hợp đồng mới. Hợp đồng hiện tại vẫn kết thúc đúng hạn." : "Nếu không phản hồi, hồ sơ tiếp tục theo quy trình hết hạn; không tự gia hạn.", status: responded ? "Đã phản hồi" : "Nhắc trước hạn", tone: responded ? "green" : "neutral" });
    });
    store.buybacks.filter((item) => item.customerId === "C-204" && item.paymentProofFile && !item.customerAcknowledgedAt).forEach((item) => items.push({ title: `Chứng từ thu mua ${item.id}`, text: "Moderator đã lưu chứng từ chuyển khoản. Xác nhận đã xem được theo dõi riêng và không chặn thu gom theo thỏa thuận.", status: "Chờ xác nhận đã xem", tone: "amber" }));
    store.menu.recipes.filter((recipe) => recipe.status === "Chờ máy xác nhận").forEach((recipe) => items.push({ title: `Menu ${recipe.name} đang chờ xác nhận`, text: "Công thức riêng đã lưu; chờ máy Smart IoT báo nhận và áp dụng.", status: "Chờ máy", tone: "blue" }));
  } else if (role === "moderator") {
    store.invoices.filter((item) => item.status === "awaiting_reconciliation").forEach((item) => items.push({ title: `Đối chiếu bill ${item.id}`, text: `${item.customerName} đã tải chứng từ. So sánh với số liệu tài khoản ngân hàng công ty.`, status: "Cần đối chiếu", tone: "amber" }));
    store.invoices.filter((item) => item.status === "awaiting_overpayment_refund").forEach((item) => items.push({ title: `Hoàn phần chuyển thừa · ${item.id}`, text: `Ghi nhận giao dịch hoàn ${money(item.excess ?? 0)} sau khi thực hiện chuyển khoản bên ngoài.`, status: "Cần hoàn", tone: "amber" }));
    store.supportRequests.filter((request) => !request.status.startsWith("Đã điều phối")).forEach((request) => items.push({ title: `Yêu cầu hỗ trợ ${request.id}`, text: `${request.customerName} · ${request.machineId} · ${request.description}`, status: "Chờ xử lý", tone: "amber" }));
    store.contracts.filter((item) => currentContractStatus(item) === "Sắp hết hạn").forEach((contract) => items.push({ title: `Hợp đồng ${contract.id} sắp hết hạn`, text: store.expiryResponses.some((response) => response.contractId === contract.id) ? "Khách đã đề nghị trao đổi để ký hợp đồng mới." : "Khách chưa phản hồi; khi hết hạn tiến hành theo quy trình thông thường.", status: store.expiryResponses.some((response) => response.contractId === contract.id) ? "Khách đã phản hồi" : "Nhắc trước hạn", tone: "neutral" }));
    store.buybacks.filter((item) => item.status === "Chờ Technician đánh giá" || item.status === "Chờ Moderator thỏa thuận" || item.status === "Chờ chuyển khoản").forEach((item) => items.push({ title: `Thu mua máy cũ ${item.id}`, text: `${item.machineId} · ${item.status}`, status: "Theo dõi", tone: "blue" }));
  } else if (role === "technician") {
    store.tasks.filter((task) => task.status !== "Đã hoàn tất").forEach((task) => items.push({ title: `Công việc ${task.id} · ${task.kind}`, text: `${task.machineId} · ${task.customerName} · ${task.description}`, status: task.status, tone: "amber" }));
  } else {
    pendingInvoices.forEach((item) => items.push({ title: `Bill ${item.id} đang chờ xử lý`, text: `${item.customerName} · ${item.status} · ${money(currentInvoiceBalance(item))}`, status: "Theo dõi", tone: "blue" }));
    store.tasks.filter((task) => task.status !== "Đã hoàn tất").forEach((task) => items.push({ title: `${task.id} · ${task.kind}`, text: `${task.machineId} · ${task.status}`, status: "Theo dõi", tone: "neutral" }));
  }
  return <Panel title="Thông báo & nhắc nhở" subtitle="Danh sách sinh từ hóa đơn, hợp đồng, yêu cầu kỹ thuật và hồ sơ thu mua đang chờ xử lý.">
    {items.length ? <div className="notification-list">{items.map((item, index) => <article className="notification-row" key={`${item.title}-${index}`}><span className={`notification-mark mark-${item.tone}`}><Bell size={17} /></span><div className="notification-content"><div className="notification-heading"><strong>{item.title}</strong><span>{index === 0 ? "Cần theo dõi" : "Trong hồ sơ"}</span></div><p>{item.text}</p><Pill tone={item.tone}>{item.status}</Pill></div></article>)}</div> : <div className="notice notice-sand"><Check size={17} /><div><strong>Không có việc đang chờ</strong><p>Chưa có nhắc nhở cần xử lý theo dữ liệu hiện tại.</p></div></div>}
  </Panel>;
}

function ModeratorTechnicalTaskDetail({ taskId }: { taskId: string }) {
  const { store } = useDemoStore();
  const task = store.tasks.find((item) => item.id === taskId);
  if (!task) return <Panel title="Không tìm thấy yêu cầu kỹ thuật" subtitle="Yêu cầu này không có trong dữ liệu hiện tại."><Link href="/moderator/technical-requests" className="button button-light">Về danh sách yêu cầu</Link></Panel>;
  const machineHref = task.machineId.startsWith("S-") || task.machineId.startsWith("CF-IOT-") || task.machineId.startsWith("IOT-")
    ? `/moderator/monitoring/${task.customerId}/${task.machineId}`
    : `/moderator/machines/${task.machineId}`;
  const history = store.machineHistory.filter((item) => item.machineId === task.machineId && item.contractId === task.contractId);
  return <>
    <div className="detail-title-row"><div><Pill tone={task.status === "Đã hoàn tất" ? "green" : "amber"}>{task.status}</Pill><span className="machine-id">{task.id}</span></div><Link href="/moderator/technical-requests" className="button button-light button-small">Về danh sách yêu cầu</Link></div>
    <div className="two-column"><Panel title={`${task.id} · ${task.kind}`} subtitle="Hồ sơ theo dõi ở không gian Moderator; Technician cập nhật kết quả công việc."><div className="details-grid"><Info label="Máy" value={task.machineId} /><Info label="Hợp đồng / hồ sơ" value={task.contractId} /><Info label="Khách hàng" value={task.customerName} /><Info label="Technician phụ trách" value={task.technician} /><Info label="Trạng thái" value={task.status} /><Info label="Nội dung điều phối" value={task.description} /></div><div className="action-strip"><Link href={machineHref} className="button button-light">Mở hồ sơ máy <ArrowRight size={15} /></Link>{task.source === "buyback" && <Link href="/moderator/buyback" className="button button-light">Về hồ sơ thu mua <ArrowRight size={15} /></Link>}<Link href={`/technician/tasks/${task.id}`} className="button button-primary">Mở giao diện Technician <ArrowRight size={15} /></Link></div></Panel>
      <Panel title="Ghi nhận trong lịch sử máy" subtitle="Thông tin do Technician đã lưu sau khi thực hiện công việc.">{history.length ? <DataTable columns={["Ngày", "Ghi nhận", "Người thực hiện"]} rows={history.map((item) => ({ cells: [item.date, item.detail, item.recordedBy] }))} /> : <p className="small-note">Chưa có kết quả ghi nhận. Technician sẽ cập nhật sau khi hoàn thành công việc.</p>}</Panel></div>
  </>;
}

function Detail({ role, segments }: { role: Role; segments: string[] }) {
  const { store } = useDemoStore();
  const objectId = segments.at(-1) ?? "C-204";
  if (role === "moderator" && segments[0] === "technical-requests" && segments.length === 2) return <ModeratorTechnicalTaskDetail taskId={objectId} />;
  if (segments[0] === "contracts" && segments.length > 1) return <ContractDetail contractId={objectId} role={role} />;
  if (segments[0] === "machines" && segments.length > 1) {
    const replacement = store.replacementAssignments.find((item) => item.replacementMachineId === objectId);
    const contract = store.contracts.find((item) => item.machineId === objectId || item.id === replacement?.contractId);
    if (!contract || (role === "customer" && contract.customerId !== "C-204")) return <Panel title="Không tìm thấy máy" subtitle="Máy này không thuộc cửa hàng hiện tại hoặc không có trong hồ sơ Dolores."><Link href={`/${role}/machines`} className="button button-light">Quay lại danh sách máy</Link></Panel>;
    const machineType = replacement?.machineType ?? contract.machineType;
    if (machineType === "Máy thường") return <>
      <Metrics items={[{ label: "Phí thuê máy thường", value: `${money(contract.monthlyRent)} / tháng` }, { label: "Hợp đồng", value: contract.id }, { label: "Trạng thái máy", value: contract.status }, { label: "Vị trí hợp đồng", value: contract.location }]} />
      <Panel title={`Chi tiết máy thường · ${objectId}`} subtitle={`${contract.id} · ${contract.storeName}`}><div className="details-grid"><Info label="Vị trí lắp đặt theo hợp đồng" value={contract.location} /><Info label="Lịch sử máy" value={store.machineHistory.filter((item) => item.machineId === objectId).map((item) => item.detail).join(" · ") || "Chưa có lịch sử ghi nhận"} /><Info label="Theo dõi từ xa" value="Máy thường không có telemetry, số ly, GPS giám sát hoặc digital twin." /><Info label="Menu Dolores" value="Máy thường không nhận Global Menu Dolores." /></div><div className="action-strip"><Link href={`/${role}/contracts/${contract.id}`} className="button button-light">Xem hợp đồng</Link>{role === "customer" && <Link href="/customer/support" className="button button-primary">Báo sự cố <ArrowRight size={15} /></Link>}{role === "moderator" && <Link href="/moderator/technical-requests/new" className="button button-primary">Điều phối Technician <ArrowRight size={15} /></Link>}</div></Panel>
    </>;
    const cups = store.invoices.find((item) => item.contractId === contract.id && item.period === "09/2026")?.validCups ?? 0;
    return <>
      <Metrics items={[{ label: "Ly hợp lệ kỳ này", value: `${cups.toLocaleString("vi-VN")} ly` }, { label: "Phí cơ bản", value: money(contract.monthlyRent) }, { label: "Phí theo ly", value: money(cups * contract.paygRate) }, { label: "Đồng bộ gần nhất", value: "Cloud đến ngày 29" }]} />
      <div className="two-column"><Panel title="Thông tin & theo dõi" subtitle={`${objectId} · Smart IoT`}><div className="details-grid"><Info label="Hợp đồng" value={`${contract.id} · ${formatDate(contract.startDate)}–${formatDate(contract.endDate)}`} /><Info label="Vị trí hợp đồng" value={contract.location} /><Info label="Vị trí giám sát GPS" value="Vị trí máy gửi gần nhất · dữ liệu minh họa" /><Info label="Trạng thái kết nối" value="Mất kết nối · Cloud đã nhận đến ngày 29" /><Info label="Giới hạn offline trong hợp đồng" value={`Không quá ${contract.maxOfflineDays ?? 5} ngày/tháng · có thể thương lượng khác`} /><Info label="Máy thay thế" value={replacement ? `${replacement.replacementMachineId} · cùng loại ${replacement.machineType}${replacement.validCups ? ` · ${replacement.validCups} ly tính vào hợp đồng` : ""}` : store.replacementAssignments.find((item) => item.contractId === contract.id)?.replacementMachineId ?? "Không có máy thay đang hoạt động"} /><Info label="Offline" value="Máy Edge lưu dữ liệu và gửi lại khi có kết nối; ngày thiếu được xử lý theo kỳ hóa đơn." /></div><div className="action-strip"><Link href={role === "customer" ? `/customer/machines/${objectId}/telemetry` : `/${role}/monitoring/${contract.customerId}/${objectId}`} className="button button-primary">Xem dữ liệu vận hành <ArrowRight size={15} /></Link>{role === "customer" && <Link href="/customer/support" className="button button-light">Báo sự cố</Link>}{role === "moderator" && <Link href="/moderator/technical-requests/new" className="button button-light">Điều phối Technician</Link>}<Link href={`/${role}/contracts/${contract.id}`} className="button button-light">Xem hợp đồng</Link></div></Panel><Panel title="Mô hình máy" subtitle="Hình minh họa Smart IoT"><MachineModel /></Panel></div>
      <Panel title="Menu hiện tại" subtitle="Global Menu Dolores và công thức riêng được quản lý riêng biệt"><DataTable columns={["Món", "Công thức gốc", "Công thức riêng", "Trạng thái"]} rows={store.menu.recipes.map((recipe) => { const base = store.globalMenu.recipes.find((item) => item.name === recipe.name); return { cells: [<b key="a">{recipe.name}</b>, `${base?.coffeeGrams ?? recipe.coffeeGrams} g cà phê${base?.waterMl ? ` · ${base.waterMl} ml nước` : ""}${base?.milkMl ? ` · ${base.milkMl} ml sữa` : ""}`, `${recipe.coffeeGrams} g cà phê${recipe.waterMl ? ` · ${recipe.waterMl} ml nước` : ""}${recipe.milkMl ? ` · ${recipe.milkMl} ml sữa` : ""}`, <Pill key="b" tone={recipe.status === "Chờ máy xác nhận" ? "amber" : "green"}>{recipe.status}</Pill>] }; })} /><Link href="/customer/menu" className="button button-light button-small">Mở menu của tôi <ArrowRight size={15} /></Link></Panel>
    </>;
  }
  if (role === "technician" && segments[0] === "tasks") return <TechnicianTaskDetail taskId={objectId} />;
  if (role === "admin" && segments[0] === "customers") {
    const customer = store.accounts.find((item) => item.id === objectId && item.role === "Khách hàng");
    const contracts = store.contracts.filter((item) => item.customerId === objectId);
    if (!customer) return <Panel title="Không tìm thấy khách hàng" subtitle="Tài khoản không tồn tại hoặc đã bị xóa." />;
    return <><Metrics columns={3} items={[{ label: "Hợp đồng", value: String(contracts.length) }, { label: "Máy đang thuê", value: String(contracts.filter((item) => item.status !== "Đã kết thúc").length) }, { label: "Ly Smart kỳ này", value: String(contracts.filter((item) => item.machineType === "Smart IoT").reduce((sum, contract) => sum + (store.invoices.find((invoice) => invoice.contractId === contract.id && invoice.period === "09/2026")?.validCups ?? 0), 0)) }]} /><Panel title={`${customer.name} · ${customer.store}`} subtitle="Thông tin khách hàng và cửa hàng"><div className="details-grid"><Info label="Email" value={customer.email} /><Info label="Trạng thái tài khoản" value={customer.status} /><Info label="Cửa hàng" value={customer.store} /><Info label="Hợp đồng" value={contracts.map((item) => item.id).join(" · ") || "Chưa có hợp đồng"} /></div><DataTable columns={["Hợp đồng", "Máy", "Loại", "Thời hạn", "Trạng thái"]} rows={contracts.map((item) => ({ href: `/admin/contracts/${item.id}`, cells: [<b key="a">{item.id}</b>, item.machineId, item.machineType, `${formatDate(item.startDate)}–${formatDate(item.endDate)}`, item.status] }))} /></Panel></>;
  }
  if (role === "admin" && segments[0] === "machines") return <Panel title={`Lịch sử máy · ${objectId}`} subtitle="Lịch sử theo từng máy vật lý"><DataTable columns={["Ngày", "Hợp đồng", "Nội dung", "Ghi nhận bởi"]} rows={store.machineHistory.filter((item) => item.machineId === objectId).map((item) => ({ cells: [item.date, item.contractId, item.detail, item.recordedBy] }))} /></Panel>;
  return <Panel title="Hồ sơ không khả dụng" subtitle="Chọn hồ sơ từ danh sách để xem chi tiết." />;
}

function ContractDetail({ contractId, role }: { contractId: string; role: Role }) {
  const { store, updateStore } = useDemoStore();
  const [eventType, setEventType] = useState<"contract_violation" | "early_termination" | null>(null);
  const [eventNote, setEventNote] = useState("");
  const contract = store.contracts.find((item) => item.id === contractId);
  if (!contract || (role === "customer" && contract.customerId !== "C-204")) return <Panel title="Không tìm thấy hợp đồng" subtitle="Hợp đồng này không thuộc hồ sơ khách hàng hiện tại hoặc không còn trong hệ thống."><Link href={`/${role}/contracts`} className="button button-light">Quay lại danh sách</Link></Panel>;
  const invoice = store.invoices.find((item) => item.contractId === contract.id && item.period === "09/2026");
  const expiryResponse = store.expiryResponses.find((item) => item.contractId === contract.id);
  const daysToExpiry = Math.ceil((new Date(`${contract.endDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const expiring = contract.status === "Sắp hết hạn" || (daysToExpiry >= 0 && daysToExpiry <= 31);
  const machineHref = role === "moderator" && contract.machineType === "Smart IoT"
    ? `/moderator/monitoring/${contract.customerId}/${contract.machineId}`
    : `/${role}/machines/${contract.machineId}`;
  const saveContractEvent = () => {
    if (!eventType || !eventNote.trim()) return showValidation("Ghi rõ nội dung sự việc để lưu hồ sơ.");
    updateStore((current) => ({ ...current, contractEvents: [{ id: `EV-${Date.now()}`, contractId: contract.id, type: eventType, note: eventNote.trim(), recordedAt: new Date().toISOString() }, ...current.contractEvents] }));
    setEventType(null); setEventNote("");
  };
  const requestNewContract = () => updateStore((current) => ({ ...current, expiryResponses: current.expiryResponses.some((item) => item.contractId === contract.id) ? current.expiryResponses : [{ contractId: contract.id, response: "request_new_contract", respondedAt: new Date().toISOString() }, ...current.expiryResponses] }));
  return <>
    <Metrics items={[{ label: "Tình trạng hợp đồng", value: currentContractStatus(contract) }, { label: "Máy gắn hợp đồng", value: `${contract.machineId} · ${contract.machineType}` }, { label: "Tiền cọc", value: money(contract.deposit) }, { label: "Thời hạn", value: `Đến ${formatDate(contract.endDate)}` }]} />
    <div className="two-column"><Panel title={`${contract.id} · ${contract.storeName}`} subtitle="Hợp đồng được ký bên ngoài và lưu trong hồ sơ Dolores."><div className="details-grid"><Info label="Khách hàng" value={contract.customerName} /><Info label="Máy" value={`${contract.machineId} · ${contract.machineType}`} /><Info label="Thời hạn thuê" value={`${formatDate(contract.startDate)}–${formatDate(contract.endDate)}`} /><Info label="Vị trí hợp đồng" value={contract.location} /><Info label="Giá cơ bản" value={`${money(contract.monthlyRent)} / tháng`} /><Info label="PAYG" value={contract.paygRate ? `${money(contract.paygRate)} / ly hợp lệ` : "Không áp dụng"} />{contract.machineType === "Smart IoT" && <Info label="Giới hạn offline theo hợp đồng" value={`Không quá ${contract.maxOfflineDays ?? 5} ngày/tháng · có thể thương lượng khác`} />}<Info label="Phí lắp đặt" value={money(contract.installationFee)} /><Info label="Bill tháng 09/2026" value={invoice ? money(invoice.total) : "Chưa phát hành"} /><Info label="Hợp đồng đã ký" value={contract.signedFile ?? "Chưa tải bản ký lên"} /></div><div className="action-strip"><Link href={machineHref} className="button button-light">Mở chi tiết máy <ArrowRight size={15} /></Link>{role === "moderator" && <Link className="button button-light" href="/moderator/deposits">Quyết toán cọc</Link>}</div></Panel>
      <Panel title="Lịch sử & mốc hợp đồng" subtitle="Không có gia hạn tự động; nếu tiếp tục thuê thì lập hợp đồng mới."><div className="timeline-list"><Timeline number="01" title="Đàm phán điều khoản" text="Moderator ghi nhận mức thuê, đặt cọc, phí lắp đặt và các điều khoản áp dụng." /><Timeline number="02" title="Ký và tải hợp đồng" text="Hai bên ký ngoài hệ thống; Moderator lưu bản đã ký trong hồ sơ." /><Timeline number="03" title="Bàn giao & sử dụng máy" text="Máy vật lý gắn với hợp đồng này; lịch sử lắp đặt, sửa chữa và máy thay được lưu riêng." /><Timeline number="04" title="Nhắc trước khi hết hạn" text="Khách không phản hồi được xem là không tiếp tục; nếu tiếp tục, hai bên ký hợp đồng mới." /></div></Panel></div>
    {role === "moderator" && <Panel title="Thao tác hợp đồng" subtitle="Ghi nhận hồ sơ để theo dõi; điều khoản và mức xử lý do các bên thỏa thuận."><div className="action-strip"><button className="button button-light" onClick={() => setEventType("contract_violation")}>Ghi nhận vi phạm</button><button className="button button-light" onClick={() => setEventType("early_termination")}>Ghi nhận chấm dứt sớm</button><Link className="button button-primary" href="/moderator/technical-requests/new">Điều phối thu hồi <ArrowRight size={15} /></Link></div>{eventType && <div className="form-grid"><label className="form-wide">{eventType === "contract_violation" ? "Nội dung vi phạm và điều khoản liên quan" : "Ngày dừng thuê và nội dung yêu cầu"}<textarea value={eventNote} onChange={(event) => setEventNote(event.target.value)} placeholder="Ghi chú để Moderator xử lý theo hợp đồng" /></label><div className="form-wide"><button className="button button-primary" onClick={saveContractEvent}>Lưu ghi nhận</button></div>{eventType === "early_termination" && <p className="form-wide small-note">Tháng dừng vẫn tính đủ tiền thuê; PAYG tính theo thời gian thuê thực tế. Hệ thống lưu hồ sơ, còn quyết toán theo điều khoản hợp đồng.</p>}</div>}{store.contractEvents.filter((item) => item.contractId === contract.id).map((item) => <div className="notice notice-sand" key={item.id}><Clock3 size={17} /><div><strong>{item.type === "contract_violation" ? "Ghi nhận vi phạm" : "Yêu cầu chấm dứt sớm"} · {formatDate(item.recordedAt.slice(0, 10))}</strong><p>{item.note}</p></div></div>)}</Panel>}
    {expiring && <Panel title="Nhắc hợp đồng sắp hết hạn" subtitle="Không tự gia hạn. Nếu khách tiếp tục thuê, hai bên lập một hợp đồng mới."><div className="details-grid"><Info label="Ngày hết hạn" value={formatDate(contract.endDate)} /><Info label="Phản hồi của khách" value={expiryResponse ? "Muốn trao đổi để ký hợp đồng mới" : "Chưa phản hồi · hết hạn theo lịch nếu không tiếp tục"} /></div>{role === "customer" && !expiryResponse && <button className="button button-primary" onClick={requestNewContract}>Tôi muốn trao đổi để ký hợp đồng mới</button>}{role === "moderator" && expiryResponse && <Link className="button button-primary" href="/moderator/contracts/new">Tạo hợp đồng mới <ArrowRight size={15} /></Link>}</Panel>}
    {role === "customer" && <Panel title="Tiền cọc & hóa đơn" subtitle="Khoản cọc hiển thị riêng và chỉ quyết toán sau khi Technician thu hồi, đánh giá máy."><div className="details-grid"><Info label="Tiền đặt cọc" value={money(contract.deposit)} /><Info label="Hóa đơn" value={invoice ? `${invoice.period} · ${money(invoice.total)}` : "Chưa phát hành"} /></div><Link className="button button-light button-small" href="/customer/invoices">Xem hóa đơn <ArrowRight size={15} /></Link></Panel>}
  </>;
}

function ProfileIcon({ role }: { role: Role }) { return <span className="profile-avatar">{roleInfo[role].label.slice(0, 1)}</span>; }

export default function PrototypeApp({ role, segments, page }: Props) {
  const pathname = usePathname();
  const info = roleInfo[role];
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const [search, setSearch] = useState("");
  const isMobileMenu = useMemo(() => info.nav.slice(0, 4), [info.nav]);
  const notify = (message: string) => { setToastVariant("success"); setToast(message); window.setTimeout(() => setToast(""), 3000); };
  useEffect(() => {
    const handleValidation = (event: Event) => { setToastVariant("error"); setToast((event as CustomEvent<string>).detail); window.setTimeout(() => setToast(""), 4000); };
    window.addEventListener("prototype-validation", handleValidation);
    return () => window.removeEventListener("prototype-validation", handleValidation);
  }, []);

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand-word">dolores<span>.</span></Link><div className="sidebar-role">{info.label}</div>
      <nav className="side-nav" aria-label="Điều hướng chính">{info.nav.map((item) => <Link className={`nav-link ${isActive(pathname, item.href) ? "nav-active" : ""}`} href={item.href} key={item.href}><AppIcon name={item.icon} size={17} /><span>{item.label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><ProfileIcon role={role} /><div><strong>{info.scope}</strong><small>Dolores · Dữ liệu minh họa</small></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar">
        <div className="mobile-brand"><Link href="/" className="brand-word">dolores<span>.</span></Link><span>{info.label}</span></div>
        <div className="breadcrumbs"><span>{info.label}</span><ChevronRight size={13} /><strong>{page.trail ?? page.title}</strong>{page.trail && <><ChevronRight size={13} /><span>{page.title}</span></>}</div>
        <div className="topbar-actions"><label className="global-search"><Search size={15} /><input aria-label="Tìm nhanh" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhanh" /><kbd>⌘ K</kbd></label><Link href={`/${role}/notifications`} className="icon-button notification-button" aria-label="Thông báo"><Bell size={17} /><i /></Link><button className="profile-menu" aria-label="Tài khoản"><ProfileIcon role={role} /><ChevronDown size={13} /></button></div>
      </header>
      <main className="workspace-content">
        <div className="page-title-row"><div><span className="page-overline">{info.label} / {page.trail ?? (segments.length ? page.title : "Tổng quan")}</span><h1>{page.title}</h1><p>{page.description}</p></div><Link href={`/${role}/notifications`} className="button button-light notification-label"><Bell size={15} /> Thông báo <span className="notification-count">3</span></Link></div>
        {search.trim() && <div className="search-result-hint"><Search size={14} /> Đang tìm trong không gian {info.label}: <b>{search}</b><button onClick={() => setSearch("")}>Xóa</button></div>}
        <div className="screen-content"><ScreenBody role={role} page={page} segments={segments} notify={notify} /></div>
        <ActionFooter role={role} kind={page.kind} />
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
      {isMobileMenu.slice(0, 3).map((item) => <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "mobile-nav-active" : ""}><AppIcon name={item.icon} size={19} /><span>{item.label}</span></Link>)}
      <button className={moreOpen ? "mobile-nav-active" : ""} onClick={() => setMoreOpen(true)}><MenuIcon size={19} /><span>Khác</span></button>
    </nav>
    <AnimatePresence>{moreOpen && <><motion.button className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} aria-label="Đóng menu" /><motion.div className="mobile-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 280 }}><div className="sheet-handle" /><div className="sheet-title"><strong>Điều hướng</strong><button className="icon-button" onClick={() => setMoreOpen(false)}><X size={17} /></button></div><div className="sheet-links">{info.nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}><AppIcon name={item.icon} size={17} /><span>{item.label}</span><ChevronRight size={15} /></Link>)}</div></motion.div></>}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className={`toast-message ${toastVariant === "error" ? "toast-error" : ""}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{toastVariant === "error" ? <CircleHelp size={17} /> : <Check size={17} />}{toast}</motion.div>}</AnimatePresence>
  </div>;
}

function ActionFooter({ role, kind }: { role: Role; kind: PageKind }) {
  let actions: { label: string; href: string; primary?: boolean }[] = [];
  if (kind === "overview" && role === "admin") actions = [{ label: "Báo cáo doanh thu", href: "/admin/reports", primary: true }, { label: "Giám sát theo khách hàng", href: "/admin/monitoring" }, { label: "Xem kho máy", href: "/admin/machines" }];
  else if (kind === "overview" && role === "moderator") actions = [{ label: "Việc cần xử lý", href: "/moderator/invoices", primary: true }, { label: "Yêu cầu kỹ thuật", href: "/moderator/technical-requests" }];
  else if (kind === "overview" && role === "customer") actions = [{ label: "Xem máy của tôi", href: "/customer/machines", primary: true }, { label: "Xem hóa đơn", href: "/customer/invoices" }];
  else if (kind === "overview" && role === "technician") actions = [{ label: "Mở YC-017", href: "/technician/tasks/YC-017", primary: true }];
  else if (kind === "monitoring") actions = [{ label: "Mở giám sát máy S-018", href: role === "admin" ? "/admin/monitoring/C-204/S-018" : "/moderator/monitoring/C-204/S-018", primary: true }];
  else if (kind === "machines" && role === "customer") actions = [{ label: "Xem máy Smart IoT", href: "/customer/machines/S-018", primary: true }];
  else if (kind === "machines" && role === "admin") actions = [{ label: "Giám sát máy Smart IoT", href: "/admin/monitoring/C-204/S-018", primary: true }, { label: "Lịch sử máy", href: "/admin/machines/S-018" }];
  else if (kind === "machines" && role === "moderator") actions = [{ label: "Giám sát máy Smart IoT", href: "/moderator/monitoring/C-204/S-018", primary: true }, { label: "Lịch sử máy", href: "/moderator/machine-history" }];
  return actions.length ? <div className="action-footer">{actions.map((action) => <Link className={`button ${action.primary ? "button-primary" : "button-light"}`} href={action.href} key={action.label}>{action.label}<ArrowRight size={15} /></Link>)}</div> : null;
}

