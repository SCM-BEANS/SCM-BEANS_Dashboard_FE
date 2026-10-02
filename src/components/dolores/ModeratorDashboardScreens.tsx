"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresMetric,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { readDemoFlow, writeDemoFlow } from "@/components/dolores/demoFlowStore";

const BASE = "/moderator";
type Row = ReactNode[];

function ActionBar({ items }: { items: [string, string, "primary" | "secondary"][] }) {
  return <>{items.map(([label, href, variant]) => <DoloresButton key={href + label} href={href} variant={variant}>{label}</DoloresButton>)}</>;
}

function Dashboard() {
  const bars = [["T1", 76], ["T2", 91], ["T3", 83], ["T4", 124], ["T5", 110], ["T6", 142], ["T7", 132], ["T8", 166]] as const;
  return <DoloresPage title="Tổng quan hợp đồng & thanh toán" description="Việc ưu tiên cho Moderator: hợp đồng, hóa đơn, máy IoT và phản hồi khách." actions={<DoloresButton href={`${BASE}/invoices`}>Việc cần xử lý</DoloresButton>}>
    <div className="grid grid-cols-4 gap-4">
      <DoloresMetric label="Hợp đồng hiệu lực" value="98" />
      <DoloresMetric label="Chứng từ chờ đối chiếu" value="12" />
      <DoloresMetric label="Smart IoT đang thuê" value="56" />
      <DoloresMetric label="Máy IoT còn trong kho" value="12" />
    </div>
    <DoloresPanel>
      <DoloresPanelTitle>Số ly Smart IoT theo tháng</DoloresPanelTitle>
      <p className="-mt-3 text-[13px] leading-[1.45] text-[#706561]">Ly hợp lệ đã đồng bộ · dữ liệu minh họa</p>
      <div className="mt-6 grid grid-cols-[32px_1fr] gap-4">
        <div className="flex h-[186px] flex-col justify-between pb-5 text-[10px] text-[#706561]"><span>166</span><span>83</span><span>0</span></div>
        <div className="grid grid-cols-8 items-end gap-3">
          {bars.map(([month, value]) => <div className="flex h-[186px] flex-col items-stretch justify-end" key={month}>
            <span className="mb-1 text-center text-[11px] font-medium">{value}</span>
            <div className="rounded-t-[5px] bg-[#F4E9E3]" style={{ height: `${Math.round((value / 166) * 132)}px` }} />
            <span className="pt-2 text-[10px] text-[#706561]">{month}</span>
          </div>)}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-[1.45] text-[#706561]">Máy thường không gửi telemetry hoặc số ly lên Dolores.</p>
    </DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Việc cần xử lý</DoloresPanelTitle><p className="text-sm font-semibold">12 chứng từ thanh toán</p><p className="mt-1 text-[13px] text-[#706561]">Tenant tải ảnh chuyển khoản; Moderator so khớp tài khoản công ty.</p></DoloresPanel>
  </DoloresPage>;
}

function SceneTable({ title, description, headers, rows, actions, notice }: { title: string; description: string; headers: string[]; rows: Row[]; actions: [string, string, "primary" | "secondary"][]; notice?: [string, string] }) {
  return <DoloresPage title={title} description={description} actions={<ActionBar items={actions} />}>
    {notice && <DoloresNotice title={notice[0]}>{notice[1]}</DoloresNotice>}
    <DoloresPanel><DoloresPanelTitle>{title}</DoloresPanelTitle><DoloresTable headers={headers} rows={rows} /></DoloresPanel>
  </DoloresPage>;
}

function DecisionDialog({ title, message, onCancel, onConfirm, success = false, nextHref }: { title: string; message: string; onCancel: () => void; onConfirm: () => void; success?: boolean; nextHref?: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-6" role="presentation"><section aria-labelledby="moderator-dialog-title" aria-modal="true" className="w-full max-w-[580px] rounded-[20px] border border-[#E9E2DC] bg-white p-8 shadow-xl" role="dialog"><p className="text-[11px] font-medium leading-4 text-[#706561]">{success ? "Bản xem trước · dữ liệu cục bộ" : "Kiểm tra trước khi tiếp tục"}</p><h2 className="mt-3 text-xl font-semibold leading-7" id="moderator-dialog-title">{title}</h2><p className="mt-3 text-sm leading-6 text-[#706561]">{message}</p><div className="mt-5 grid gap-5">{success ? <><DoloresButton onClick={onConfirm}>Đóng</DoloresButton>{nextHref && <DoloresButton href={nextHref} variant="secondary">Tiếp tục</DoloresButton>}</> : <><DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton><DoloresButton variant="secondary" onClick={onCancel}>Hủy</DoloresButton></>}</div></section></div>;
}

function ActionForm({ title, description, fields, recordKey, action, returnHref, nextHref, notice }: { title: string; description: string; fields: [string, string, "text" | "file" | "select"][]; recordKey: string; action: string; returnHref: string; nextHref?: string; notice?: [string, string] }) {
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const saveDemo = () => {
    writeDemoFlow(recordKey, "submitted-demo");
    setDialog("success");
  };
  return <>
    <DoloresPage title={title} description={description} actions={<><DoloresButton onClick={() => setDialog("confirm")}>{action}</DoloresButton><DoloresButton href={returnHref} variant="secondary">Quay lại</DoloresButton></>}>
      {notice && <DoloresNotice title={notice[0]}>{notice[1]}</DoloresNotice>}
      <DoloresPanel><DoloresPanelTitle>Thông tin xử lý</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value, type]) => <DoloresField key={label} label={label} required={type === "file"}>
        {type === "file" ? <input className="text-sm" type="file" aria-label={label} onChange={(event) => setLocalValues((current) => ({ ...current, [label]: event.target.files?.[0]?.name ?? "" }))} /> : type === "select" ? <select aria-label={label} className="bg-transparent text-sm outline-none" value={localValues[label] ?? value} onChange={(event) => setLocalValues((current) => ({ ...current, [label]: event.target.value }))}><option>{value}</option><option>Đã xác nhận</option><option>Chờ xử lý</option><option>Đã hoàn tất</option></select> : <input aria-label={label} className="w-full bg-transparent text-sm outline-none" defaultValue={value} />}
      </DoloresField>)}</DoloresFieldGrid></DoloresPanel>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} nextHref={dialog === "success" ? nextHref : undefined} title={dialog === "success" ? "Đã ghi nhận trên bản xem trước" : `Xác nhận · ${title}`} message={dialog === "success" ? "Trạng thái được lưu trong trình duyệt để minh họa flow. Chưa có chứng từ, khoản tiền hay lệnh thiết bị nào được gửi lên hệ thống." : `${action}. Hãy kiểm tra lại thông tin trước khi tiếp tục.`} onCancel={() => setDialog(null)} onConfirm={() => dialog === "success" ? setDialog(null) : saveDemo()} />}
  </>;
}

function ContractScreens({ path }: { path: string }) {
  if (path === "contracts" || path === "contracts/list") return <SceneTable title="Danh sách hợp đồng thuê" description="Theo dõi loại máy, khách hàng, thời hạn và hồ sơ hợp đồng." headers={["Hợp đồng", "Khách hàng", "Loại bàn giao", "Thời hạn", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={`${BASE}/contracts/C-204`} key="c204">C-204</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Smart IoT · S-018", "31/10/2026", "Sắp hết hạn", "Đã ký"],
    [<Link href={`${BASE}/contracts/C-205`} key="c205">C-205</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Máy thường · C-031", "14/11/2026", "Đang hiệu lực", "Đã ký"],
  ]} actions={[["Tạo hồ sơ hợp đồng", `${BASE}/contracts/new`, "primary"], ["Nhắc hợp đồng sắp hết hạn", `${BASE}/contracts/expiry`, "secondary"]]} />;
  if (path === "contracts/C-204" || path === "contracts/C-205") return <DoloresPage title={`Hồ sơ hợp đồng ${path.endsWith("204") ? "C-204" : "C-205"}`} description="Thông tin cửa hàng, thiết bị, điều khoản và các sự kiện liên quan." actions={<ActionBar items={[["Xem hóa đơn", `${BASE}/invoices`, "primary"], ["Lịch sử phiên bản", `${BASE}/invoices/history`, "secondary"], ["Danh sách hợp đồng", `${BASE}/contracts`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin hợp đồng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Khách hàng" value="Nguyễn Minh Anh" /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Loại máy" value={path.endsWith("204") ? "Smart IoT · S-018" : "Máy thường · C-031"} /><DoloresField label="Thời hạn" value={path.endsWith("204") ? "31/10/2026" : "14/11/2026"} /><DoloresField label="Hợp đồng đã ký" value="Có · hồ sơ minh họa" /><DoloresField label="Trạng thái" value="Đang hiệu lực" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  if (path === "contracts/expiry") return <ActionForm title="Nhắc hợp đồng sắp hết hạn" description="Gửi thông báo để khách hàng phản hồi về hợp đồng C-204." fields={[["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Khách hàng", "Nguyễn Minh Anh", "text"], ["Hết hạn", "31/10/2026", "text"], ["Kết quả phản hồi", "Chưa phản hồi", "select"]]} recordKey="M11-C-204" action="Gửi nhắc hợp đồng" returnHref={`${BASE}/contracts`} notice={["Theo dõi phản hồi riêng", "Hồ sơ C-204 và trạng thái hợp đồng được giữ lại trong bản xem trước."]} />;
  if (path === "contracts/settlement") return <SettlementScreen />;
  if (path === "contracts/compensation" || path === "contracts/deposit-refund" || path === "contracts/refund-good") return <DepositActionScreen path={path} />;
  const pathConfigs: Record<string, [string, string, [string, string, "text" | "file" | "select"][], string, string, string, [string, string]?]> = {
    "contracts/new": ["Đàm phán & lập hợp đồng thuê", "Ghi nhận thỏa thuận để chuyển sang bước lập và ký hợp đồng ngoài Dolores.", [["Khách hàng", "Nguyễn Minh Anh", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Loại máy", "Máy thường / Smart IoT", "select"], ["Điều khoản đã thống nhất", "Nhập theo thỏa thuận", "text"]], "M02", "Lưu thông tin đàm phán", `${BASE}/contracts`, ["Ký hợp đồng ở ngoài Dolores", "Ứng dụng chỉ lưu trạng thái hồ sơ minh họa, không thay thế bước thương lượng hoặc ký kết."]],
    "contracts/first-invoice": ["Hóa đơn tháng đầu", "Rà soát tiền đặt cọc và các khoản tháng đầu trước khi ghi nhận.", [["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Tiền đặt cọc", "Theo hợp đồng", "text"], ["Khoản thuê kỳ đầu", "750.000 đ", "text"], ["Chứng từ", "Chọn chứng từ", "file"]], "M05", "Ghi nhận hóa đơn tháng đầu", `${BASE}/contracts`],
    "contracts/handover/standard": ["Bàn giao & lắp đặt máy thường", "Gửi yêu cầu kỹ thuật để hoàn thành việc bàn giao máy thường.", [["Hợp đồng", "C-205", "text"], ["Máy", "C-031 · máy thường", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Ngày bàn giao", "Theo lịch thỏa thuận", "text"]], "M03", "Gửi yêu cầu Technician", `${BASE}/technical-requests/new/install-standard`],
    "contracts/handover/smart": ["Bàn giao & kích hoạt Smart IoT", "Gửi yêu cầu kích hoạt thiết bị Smart theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Máy Smart IoT", "S-018", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Kết nối / kích hoạt", "Chờ Technician", "select"]], "M04", "Gửi yêu cầu Technician", `${BASE}/technical-requests/new/install-smart`, ["Trạng thái kích hoạt", "Chỉ ghi nhận hoàn tất sau khi có kết quả Technician và phản hồi thiết bị."]],
    "contracts/retrieval": ["Thu hồi trước quyết toán cọc", "Gửi Technician thu hồi và đánh giá máy theo hợp đồng C-204.", [["Hợp đồng", "C-204", "text"], ["Máy", "S-018 · Smart IoT", "text"], ["Ngày thu hồi", "Chọn lịch", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"]], "M12", "Gửi yêu cầu thu hồi", `${BASE}/technical-requests/YC-017`, ["Thứ tự xử lý", "Quyết toán tiền cọc chỉ mở sau khi Technician gửi kết quả thu hồi và đánh giá."]],
    "contracts/settlement": ["Quyết toán & hoàn cọc sau đánh giá", "Ghi nhận quyết toán khi kết quả thu hồi của Technician đã có.", [["Hợp đồng", "C-204", "text"], ["Máy đã thu hồi", "S-018", "text"], ["Kết quả đánh giá", "Chờ Technician", "select"], ["Khoản quyết toán", "Theo hồ sơ hợp đồng", "text"]], "M13", "Ghi nhận quyết toán", `${BASE}/contracts`, ["Cần kết quả Technician", "Chỉ tiếp tục sau khi technician báo thu hồi và tình trạng máy. Các khoản thanh toán không thực hiện trong bản demo."]],
    "contracts/early-termination": ["Chấm dứt sớm & vi phạm", "Ghi nhận trường hợp chấm dứt sớm theo hợp đồng và chứng từ liên quan.", [["Hợp đồng", "C-204", "text"], ["Lý do", "Chọn lý do", "select"], ["Khoản phí / bồi thường", "Theo hợp đồng", "text"], ["Tài liệu chứng minh", "Chọn tệp", "file"]], "M14", "Ghi nhận tình huống", `${BASE}/contracts`],
    "contracts/compensation": ["Bồi thường vượt tiền đặt cọc", "Theo dõi khoản bồi thường vượt giá trị tiền đặt cọc trong hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tiền đặt cọc", "Theo hồ sơ", "text"], ["Mức bồi thường", "Theo đánh giá", "text"], ["Chứng từ", "Chọn tệp", "file"]], "M30", "Ghi nhận khoản bồi thường", `${BASE}/contracts`],
    "contracts/deposit-refund": ["Ghi nhận hoàn cọc", "Ghi nhận trạng thái hoàn cọc sau khi đã đối chiếu điều kiện hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Số tiền cọc", "Theo hồ sơ", "text"], ["Trạng thái Technician", "Chưa có kết quả", "select"], ["Xác nhận thanh toán ngoài hệ thống", "Chọn chứng từ", "file"]], "M31", "Ghi nhận hoàn cọc", `${BASE}/contracts`, ["Hoàn cọc là khoản riêng", "Không gộp hoàn cọc với hoàn tiền thanh toán thừa hoặc thu khoản thiếu."]],
    "contracts/refund-good": ["Hoàn cọc · máy được đánh giá tốt", "Ghi nhận nhánh hoàn đủ cọc khi máy được đánh giá tốt.", [["Hợp đồng", "C-204", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"], ["Số tiền hoàn", "Theo hợp đồng", "text"], ["Chứng từ hoàn", "Chọn tệp", "file"]], "M35", "Ghi nhận hoàn cọc", `${BASE}/contracts`],
    "contracts/violations": ["Theo dõi vi phạm hợp đồng", "Theo dõi thông báo, phản hồi và bước xử lý theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tình trạng vi phạm", "Chọn trạng thái", "select"], ["Phản hồi khách hàng", "Chưa phản hồi", "text"], ["Ghi chú", "Nhập nội dung", "text"]], "M36", "Ghi nhận trạng thái", `${BASE}/contracts`],
  };
  const config = pathConfigs[path];
  if (!config) return <ContractsIndexFallback />;
  const [title, description, fields, key, action, back, notice] = config;
  return <ActionForm title={title} description={description} fields={fields} recordKey={key} action={action} returnHref={back} notice={notice} />;
}

function ContractsIndexFallback() { return <SceneTable title="Hợp đồng thuê" description="Hồ sơ và quy trình hợp đồng trong Dolores." headers={["Hợp đồng", "Khách hàng", "Thiết bị", "Trạng thái"]} rows={[["C-204", "Nguyễn Minh Anh", "S-018 · Smart IoT", "Đang hiệu lực"], ["C-205", "Nguyễn Minh Anh", "C-031 · máy thường", "Đang hiệu lực"]]} actions={[["Hợp đồng", `${BASE}/contracts`, "primary"]]} />; }

function CustomerScreens({ path }: { path: string }) {
  if (path === "customers" || path === "customers/list") return <SceneTable title="Tài khoản khách hàng" description="Moderator tạo và quản lý tài khoản Customer trong phạm vi nghiệp vụ." headers={["Khách hàng", "Cửa hàng", "Hợp đồng", "Tài khoản", "Hồ sơ"]} rows={[[<Link href={`${BASE}/customers/nguyen-minh-anh`} key="customer">Nguyễn Minh Anh ›</Link>, "Cà phê Mộc", "C-204 · C-205", "Đang hoạt động", "Xem hồ sơ"]]} actions={[["Tạo tài khoản khách hàng", `${BASE}/customers/new`, "primary"]]} notice={["Giới hạn vai trò", "Moderator chỉ tạo tài khoản Customer. Quản lý tài khoản Admin, Moderator hoặc Technician thuộc phạm vi Admin."]} />;
  if (path === "customers/new") return <ActionForm title="Tạo tài khoản khách hàng" description="Tạo hồ sơ truy cập cho một khách hàng." fields={[["Họ và tên", "Nguyễn Minh Anh", "text"], ["Email", "minhanh@example.com", "text"], ["Số điện thoại", "0900000000", "text"], ["Cửa hàng", "Cà phê Mộc", "text"]]} recordKey="M48" action="Tạo tài khoản khách hàng" returnHref={`${BASE}/customers`} />;
  return <DoloresPage title="Hồ sơ khách hàng Nguyễn Minh Anh" description="Thông tin tài khoản khách, cửa hàng và các hợp đồng liên quan." actions={<ActionBar items={[["Xem hợp đồng C-204", `${BASE}/contracts/C-204`, "primary"], ["Danh sách khách hàng", `${BASE}/customers`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin khách hàng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Họ tên" value="Nguyễn Minh Anh" /><DoloresField label="Email" value="minhanh@example.com" /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Trạng thái tài khoản" value="Đang hoạt động" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
}

function InvoiceScreens({ path }: { path: string }) {
  if (path === "invoices" || path === "invoices/list") return <InvoicesList />;
  if (path === "invoices/reconcile") return <InvoiceReconcileScreen />;
  if (path === "invoices/shortfall") return <ActionForm title="Yêu cầu thanh toán phần còn thiếu" description="Gửi thông báo bổ sung cho phần còn thiếu của hóa đơn HD-09-204." fields={[["Hóa đơn", "HD-09-204", "text"], ["Tổng phải trả", "2.750.000 đ", "text"], ["Đã đối soát", "1.750.000 đ", "text"], ["Còn thiếu", "1.000.000 đ", "text"], ["Hạn thanh toán", "12/10/2026", "text"]]} recordKey="HD-09-204-shortfall" action="Gửi yêu cầu bổ sung" returnHref={`${BASE}/invoices/reconcile`} notice={["Nhắc hằng ngày", "Thông báo nhắc tiếp tục theo trạng thái thanh toán trên hóa đơn."]} />;
  if (path === "invoices/excess") return <ActionForm title="Hoàn khoản thanh toán thừa" description="Đối chiếu phản hồi khách hàng và ngân hàng trước khi ghi nhận khoản thừa." fields={[["Hóa đơn", "HD-09-205", "text"], ["Số phải trả", "1.500.000 đ", "text"], ["Đã nhận", "1.700.000 đ", "text"], ["Tiền thừa", "200.000 đ", "text"], ["Xác nhận khách hàng / ngân hàng", "Chờ đối chiếu", "select"]]} recordKey="HD-09-205-excess" action="Ghi nhận đã hoàn tiền thừa" returnHref={`${BASE}/invoices`} notice={["Điều kiện ghi nhận", "Chờ khách hàng xác nhận và khớp giao dịch ngân hàng; đây là khoản hoàn thừa, không phải hoàn cọc."]} />;
  if (path === "invoices/late-cups" || path === "invoices/late-cups-final") return <ActionForm title={path.endsWith("final") ? "Ly gửi muộn · hóa đơn đã hoàn tất" : "Xử lý số ly gửi về muộn"} description="Chọn nhánh phù hợp với trạng thái hóa đơn và kỳ đối chiếu." fields={[["Hóa đơn", path.endsWith("final") ? "HD-09-204 · đã hoàn tất" : "HD-09-204 · chưa chốt", "text"], ["Ngày nhận dữ liệu", "02/10/2026", "text"], ["Số ly gửi muộn", "120 ly", "text"], ["Giá trị bổ sung", "120.000 đ", "text"], ["Trạng thái hóa đơn", path.endsWith("final") ? "Đã hoàn tất" : "Chưa thanh toán · còn trong hạn", "select"]]} recordKey="late-cups-120" action={path.endsWith("final") ? "Ghi nhận cộng kỳ sau" : "Tính lại & gửi bản mới"} returnHref={`${BASE}/invoices`} notice={["Điều kiện cập nhật", "Chỉ tính lại/gửi bản mới khi hóa đơn chưa thanh toán, còn trong hạn và còn chỉnh sửa. Nếu đã chốt hoặc quá điều kiện, chuyển số ly sang kỳ tiếp theo."]} />;
  if (path === "invoices/overdue") return <SceneTable title="Dư nợ quá hạn & phí cộng dồn" description="Theo dõi khoản quá hạn theo hóa đơn và kỳ phát sinh." headers={["Khách hàng", "Hóa đơn", "Gốc", "Phí cộng dồn", "Hạn thanh toán", "Trạng thái"]} rows={[["Cà phê Mộc", "HD-08-204", "1.000.000 đ", "Theo điều khoản", "11/09/2026", "Quá hạn"]]} actions={[["Mở hóa đơn", `${BASE}/invoices/reconcile`, "primary"], ["Danh sách hóa đơn", `${BASE}/invoices`, "secondary"]]} notice={["Không tự tính mức phạt", "Mức phí chỉ lấy theo điều khoản hợp đồng; bản xem trước không tự suy ra lãi hoặc phí."]} />;
  if (path === "invoices/history") return <SceneTable title="Lịch sử phiên bản hóa đơn" description="Theo dõi các bản hóa đơn đã phát hành và thay đổi." headers={["Hóa đơn", "Phiên bản", "Ngày", "Thay đổi", "Trạng thái"]} rows={[["HD-09-204", "v2", "02/10/2026", "Thêm 120 ly gửi muộn", "Bản cập nhật minh họa"], ["HD-09-204", "v1", "30/09/2026", "Phát hành kỳ tháng 09", "Đã gửi"]]} actions={[["Mở đối soát", `${BASE}/invoices/reconcile`, "primary"], ["Về hóa đơn", `${BASE}/invoices`, "secondary"]]} />;
  if (path === "invoices/payg") return <SceneTable title="PAYG & số ly gửi về muộn" description="Đối chiếu dữ liệu theo máy, hợp đồng và chu kỳ." headers={["Máy", "Hợp đồng", "Loại", "Ly trong kỳ", "Giá/ly", "Thành tiền"]} rows={[["S-018", "C-204", "Smart IoT", "1.000", "2.000 đ", "2.000.000 đ"], ["S-022", "C-204", "Máy thay tạm", "120", "Theo hợp đồng", "Gộp C-204"]]} actions={[["Xử lý ly gửi muộn", `${BASE}/invoices/late-cups`, "primary"], ["Hóa đơn", `${BASE}/invoices`, "secondary"]]} notice={["Gắn đúng hợp đồng", "Usage máy thay thế được phân bổ theo kỳ cho hợp đồng chính; không tạo hợp đồng thanh toán riêng."]} />;
  return <InvoicesList />;
}

function InvoicesList() {
  return <SceneTable title="Hóa đơn định kỳ & đối soát" description="Theo dõi chứng từ, khoản nhận, phần thiếu hoặc thừa và hóa đơn quá hạn." headers={["Khách hàng", "Kỳ bill", "Số tiền", "Chứng từ / đối soát", "Trạng thái", "Xem"]} rows={[
    ["Cà phê Mộc", "09/2026", "2.750.000 đ", "1.750.000 đ · có chứng từ", "Chờ đối soát", <Link href={`${BASE}/invoices/reconcile`} key="m21">Đối soát ›</Link>],
    ["Cà phê Mộc", "09/2026", "1.500.000 đ", "Nhận 1.700.000 đ", "Thừa 200.000 đ", <Link href={`${BASE}/invoices/excess`} key="m23">Hoàn thừa ›</Link>],
    ["Góc Phố", "08/2026", "1.200.000 đ", "Chưa nhận đủ", "Quá hạn", <Link href={`${BASE}/invoices/overdue`} key="m34">Mở ›</Link>],
  ]} actions={[["Đối soát chứng từ", `${BASE}/invoices/reconcile`, "primary"], ["PAYG", `${BASE}/invoices/payg`, "secondary"], ["Lịch sử phiên bản", `${BASE}/invoices/history`, "secondary"]]} />;
}

function MachineScreens({ path }: { path: string }) {
  if (path === "machines" || path === "machines/list") return <SceneTable title="Máy & tồn kho" description="Quản lý máy trong kho, máy đang cho thuê, cho mượn và hồ sơ sửa chữa." headers={["Mã máy", "Loại", "Khách hàng / vị trí", "Hợp đồng", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={`${BASE}/machines/S-022`} key="s022">S-022</Link>, "Smart IoT", "Kho Dolores", "—", "Sẵn sàng", "Chi tiết"],
    ["S-018", "Smart IoT", "Cà phê Mộc", "C-204", "Đang sử dụng", <Link href={`${BASE}/iot/machines`} key="iot">Smart IoT</Link>],
    ["C-031", "Máy thường", "Cà phê Mộc", "C-205", "Đang sử dụng", "Hồ sơ máy"],
  ]} actions={[["Máy chưa cho thuê", `${BASE}/machines/stock`, "primary"], ["Máy của khách hàng", `${BASE}/machines/customer`, "secondary"], ["Máy cho mượn", `${BASE}/machines/loans`, "secondary"], ["Lịch sử sửa chữa", `${BASE}/machines/repair-history`, "secondary"]]} />;
  if (path === "machines/customer") return <SceneTable title="Máy của Nguyễn Minh Anh" description="Thiết bị của khách hàng và trạng thái theo hợp đồng." headers={["Mã máy", "Loại", "Hợp đồng", "Cửa hàng / vị trí", "Trạng thái", "Mở"]} rows={[["S-018", "Smart IoT", "C-204", "Cà phê Mộc · Quận 3", "Đang thuê", <Link href={`${BASE}/iot/machines`} key="smart">Dữ liệu Smart ›</Link>], ["C-031", "Máy thường", "C-205", "Cà phê Mộc · Quận 3", "Đang thuê", <Link href={`${BASE}/contracts/C-205`} key="std">Hồ sơ ›</Link>], ["S-022", "Smart IoT · máy thay", "C-204", "Đã trả", "Đã kết thúc", <Link href={`${BASE}/machines/loans`} key="loan">Lịch sử ›</Link>]]} actions={[["Hồ sơ khách hàng", `${BASE}/customers/nguyen-minh-anh`, "primary"], ["Danh sách máy", `${BASE}/machines`, "secondary"]]} />;
  if (path === "machines/stock") return <SceneTable title="Máy trong kho · chưa cho thuê" description="Xem máy theo loại và tình trạng sẵn sàng." headers={["Mã máy", "Loại máy", "Nguồn nhập", "Tình trạng", "Thao tác"]} rows={[["S-022", "Smart IoT", "Kho Dolores", "Sẵn sàng cho thuê", <Link href={`${BASE}/machines/S-022`} key="detail">Hồ sơ ›</Link>], ["C-034", "Máy thường", "Tồn kho", "Chờ kiểm tra", "Mở hồ sơ"]]} actions={[["Máy & tồn kho", `${BASE}/machines`, "primary"]]} />;
  if (path === "machines/loans") return <SceneTable title="Máy cho mượn & lịch sử sử dụng" description="Theo dõi máy tạm, hợp đồng chính và thời gian sử dụng." headers={["Máy tạm", "Loại", "Hợp đồng chính", "Bàn giao", "Trả máy"]} rows={[["S-022", "Smart IoT", "C-204 · S-018", "12/09/2026", "Đã trả 12/09/2026"]]} actions={[["Gán máy thay", `${BASE}/machines/substitute`, "primary"], ["Danh sách máy", `${BASE}/machines`, "secondary"]]} notice={["Máy thay cùng loại", "Ghép Smart IoT với Smart IoT và máy thường với máy thường; usage vẫn tính theo hợp đồng chính."]} />;
  if (path === "machines/repair-history") return <SceneTable title="Lịch sử sửa chữa, bảo trì & linh kiện" description="Xem kết quả Technician đã gửi theo từng thiết bị." headers={["Ngày", "Máy", "Công việc", "Linh kiện", "Kết quả Technician"]} rows={[["01/10/2026", "S-018", "Kiểm tra kết nối", "Không ghi nhận", "Đã gửi YC-017"]]} actions={[["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "primary"]]} />;
  if (path === "machines/substitute") return <ActionForm title="Máy thay thế & phân bổ số ly" description="Gán máy thay tạm cùng loại vào hợp đồng chính." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "select"], ["Kỳ sử dụng", "Theo hợp đồng", "text"], ["Ngày bàn giao", "Chọn ngày", "text"]]} recordKey="C-204-substitute" action="Ghi nhận máy thay thế" returnHref={`${BASE}/machines/loans`} notice={["Không tạo hợp đồng mới", "Usage máy thay được gộp vào hợp đồng chính theo kỳ."]} />;
  if (path === "machines/substitute/return") return <ActionForm title="Kết thúc sử dụng máy thay" description="Ghi nhận trả máy thay thế tạm thời về kho." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "text"], ["Ngày trả", "12/09/2026", "text"], ["Usage theo kỳ", "Gộp vào C-204", "text"]]} recordKey="C-204-substitute-return" action="Ghi nhận trả máy thay" returnHref={`${BASE}/machines/loans`} notice={["Đúng loại thiết bị", "Máy Smart IoT được trả về kho Smart IoT; usage tiếp tục gắn với hợp đồng chính."]} />;
  if (path.startsWith("machines/")) return <DoloresPage title={`Hồ sơ máy ${path.split("/")[1]}`} description="Thông tin thiết bị và lịch sử gắn với hợp đồng." actions={<ActionBar items={[["Máy & tồn kho", `${BASE}/machines`, "primary"], ["Lịch sử sửa chữa", `${BASE}/machines/repair-history`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Mã máy" value={path.split("/")[1]} /><DoloresField label="Loại máy" value="Smart IoT" /><DoloresField label="Trạng thái" value="Sẵn sàng cho thuê" /><DoloresField label="Lịch sử" value="Chưa ghi nhận cho thuê trong bản demo" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <MachineScreens path="machines" />;
}

function IoTScreens({ path }: { path: string }) {
  const customerHref = `${BASE}/iot/customer`;
  return <DoloresPage title={path === "iot/machines" ? "Chi tiết dữ liệu & mô hình máy" : "Giám sát Smart IoT · theo khách hàng"} description="Chỉ thiết bị Smart IoT có dữ liệu vận hành trực tiếp; máy thường chỉ hiển thị vị trí theo hợp đồng." actions={<ActionBar items={[["Danh sách máy Smart", `${BASE}/iot/machines`, "primary"], ["Hồ sơ khách hàng", customerHref, "secondary"]]} />}>
    <DoloresPanel><DoloresPanelTitle>{path === "iot/machines" ? "S-018 · dữ liệu gần nhất" : "Khách hàng có máy Smart"}</DoloresPanelTitle>{path === "iot/machines" ? <div className="grid grid-cols-3 gap-4"><DoloresMetric label="Trạng thái kết nối" value="Theo dữ liệu gần nhất" /><DoloresMetric label="Số ly trong kỳ" value="1.000" /><DoloresMetric label="Menu / phiên bản" value="Mùa hè · v3" /></div> : <DoloresTable headers={["Khách hàng", "Máy Smart", "Cửa hàng", "Dữ liệu", "Mở"]} rows={[["Nguyễn Minh Anh", "S-018", "Cà phê Mộc", "Đã đồng bộ 09:42", <Link href={`${BASE}/iot/machines`} key="open">Chi tiết ›</Link>]]} />}</DoloresPanel>
    <DoloresNotice title="Giới hạn dữ liệu">Số liệu hiển thị là dữ liệu demo. Không thay đổi trạng thái máy hoặc gửi lệnh IoT từ bản frontend này.</DoloresNotice>
  </DoloresPage>;
}

function TechnicalScreens({ path }: { path: string }) {
  if (path === "technical-requests" || path === "technical-requests/list") return <SceneTable title="Yêu cầu kỹ thuật & kết quả" description="Theo dõi yêu cầu được gửi đến Technician và kết quả đã báo." headers={["Mã", "Máy / cửa hàng", "Công việc", "Technician", "Trạng thái", "Kết quả"]} rows={[
    ["YC-017", "S-018 · Cà phê Mộc", "Thu hồi & đánh giá", "Nguyễn Văn Nam", "Đã báo kết quả", <Link href={`${BASE}/technical-requests/YC-017`} key="r17">Mở ›</Link>],
    ["YC-018", "S-030 · Cà phê Mộc", "Sửa lỗi kết nối", "Nguyễn Văn Nam", "Đang xử lý", "Chờ báo cáo"],
    ["YC-019", "MB-017", "Đánh giá máy thu mua", "Chưa giao", "Chờ điều phối", "—"],
  ]} actions={[["Gửi yêu cầu mới", `${BASE}/technical-requests/new`, "primary"], ["Kết quả thu hồi YC-017", `${BASE}/technical-requests/YC-017`, "secondary"]]} />;
  if (path === "technical-requests/YC-017") return <TechResult />;
  if (path === "technical-requests/new") return <DoloresPage title="Gửi yêu cầu cho Technician" description="Chọn đúng loại công việc để mở biểu mẫu phù hợp." actions={<DoloresButton href={`${BASE}/technical-requests`}>Về yêu cầu kỹ thuật</DoloresButton>}><DoloresPanel><DoloresPanelTitle>Loại công việc</DoloresPanelTitle><div className="grid grid-cols-2 gap-4">{[["Lắp đặt máy thường", "install-standard"], ["Lắp đặt & kích hoạt Smart IoT", "install-smart"], ["Sửa chữa / lỗi kết nối", "repair"], ["Thu hồi & đánh giá", "retrieval"], ["Đánh giá máy khách đề nghị bán", "buyback"], ["Thu gom máy đã thu mua", "collection"]].map(([label, slug]) => <DoloresButton key={slug} href={`${BASE}/technical-requests/new/${slug}`} variant="secondary">{label}</DoloresButton>)}</div></DoloresPanel></DoloresPage>;
  if (path.startsWith("technical-requests/new/")) {
    const kind = path.slice("technical-requests/new/".length);
    const label = ({ "install-standard": "Lắp đặt máy thường", "install-smart": "Lắp đặt & kích hoạt Smart IoT", repair: "Sửa chữa / lỗi kết nối", retrieval: "Thu hồi & đánh giá", buyback: "Đánh giá máy khách đề nghị bán", collection: "Thu gom máy đã thu mua" } as Record<string, string>)[kind] ?? "Gửi yêu cầu cho Technician";
    const isSmart = kind === "install-smart";
    return <ActionForm title={`Gửi yêu cầu: ${label}`} description="Ghi nhận đúng thông tin thiết bị, hợp đồng và công việc cần thực hiện." fields={[["Loại công việc", label, "text"], ["Hợp đồng / hồ sơ", isSmart ? "C-204" : "Chọn hồ sơ liên quan", "select"], ["Máy", isSmart ? "S-018 · Smart IoT" : "Chọn máy", "select"], ["Địa điểm", "Cà phê Mộc · Quận 3", "text"], ["Ghi chú", "Nhập mô tả công việc", "text"]]} recordKey={`M19-${kind}`} action="Gửi yêu cầu cho Technician" returnHref={`${BASE}/technical-requests`} nextHref={`${BASE}/technical-requests`} notice={isSmart ? ["Bàn giao Smart IoT", "Chỉ xác nhận kích hoạt sau khi Technician báo hoàn tất và thiết bị xác nhận trạng thái."] : undefined} />;
  }
  if (path === "machine-history/S-018") return <DoloresPage title="Chi tiết lịch sử sửa chữa / bảo trì" description="Lịch sử xử lý thiết bị S-018 · C-204." actions={<ActionBar items={[["Danh sách lịch sử máy", `${BASE}/machine-history`, "primary"], ["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Ghi nhận Technician</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Ngày" value="01/10/2026" /><DoloresField label="Mã máy / hợp đồng" value="S-018 · C-204" /><DoloresField label="Loại công việc" value="Thu hồi & đánh giá" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Tình trạng" value="Đã thu hồi · có hư hại vỏ" /><DoloresField label="Kết quả" value="Đã báo Moderator" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <SceneTable title="Lịch sử bảo trì & sửa chữa" description="Lọc và mở lịch sử công việc theo máy." headers={["Ngày", "Mã máy", "Khách hàng", "Loại", "Trạng thái", "Chi tiết"]} rows={[["01/10/2026", "S-018", "Cà phê Mộc", "Thu hồi / đánh giá", "Đã ghi nhận", <Link href={`${BASE}/machine-history/S-018`} key="s18">Chi tiết ›</Link>], ["12/09/2026", "C-031", "Cà phê Mộc", "Sửa chữa", "Hoàn tất", <Link href={`${BASE}/machine-history/S-018`} key="c31">Mở hồ sơ ›</Link>]]} actions={[["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "primary"], ["Cảnh báo", `${BASE}/notifications`, "secondary"]]} />;
}

function TechResult() {
  const [status, setStatus] = useState<string | undefined>(undefined);
  useEffect(() => {
    const update = () => setStatus(readDemoFlow("YC-017"));
    update();
    window.addEventListener("dolores-demo-flow", update);
    return () => window.removeEventListener("dolores-demo-flow", update);
  }, []);
  const assessed = status === "retrieved-assessed";
  return <DoloresPage title="Kết quả Technician · YC-017" description="Kết quả thu hồi máy và đánh giá được gửi từ Technician." actions={<ActionBar items={[["Mở giao diện Technician", "/technician/tasks/YC-017", "primary"], ["Hợp đồng C-204", `${BASE}/contracts/C-204`, "secondary"], ["Danh sách yêu cầu", `${BASE}/technical-requests`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thu hồi & đánh giá máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng" value="C-204" /><DoloresField label="Máy" value="S-018 · Smart IoT" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Trạng thái" value={assessed ? "Đã gửi kết quả từ màn Technician trong trình duyệt này" : "Đang chờ Technician gửi kết quả"} /><DoloresField label="Tình trạng" value={assessed ? "Đã thu hồi và đánh giá · bản xem trước" : "Chưa có kết quả"} /><DoloresField label="Chứng cứ" value="Ảnh / dữ liệu chưa đồng bộ" /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Bước quyết toán">{assessed ? "Kết quả demo đã nhận. Kiểm tra hồ sơ và xử lý quyết toán theo hợp đồng; không thực hiện thanh toán trong giao diện frontend." : "Chưa mở quyết toán. Gửi YC-017 qua Technician trước khi xử lý tiền cọc."}</DoloresNotice>{assessed && <DoloresButton href={`${BASE}/contracts/settlement`}>Mở quyết toán sau đánh giá</DoloresButton>}</DoloresPage>;
}

function InvoiceReconcileScreen() {
  const [dialog, setDialog] = useState<"confirm" | "success" | "preview" | null>(null);

  return <>
    <DoloresPage
      title="Đối soát chứng từ thanh toán"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<>
        <DoloresButton onClick={() => setDialog("confirm")}>Xác nhận khoản đã nhận</DoloresButton>
        <DoloresButton href={`${BASE}/invoices/shortfall`} variant="secondary">Yêu cầu thanh toán thiếu</DoloresButton>
        <DoloresButton href={`${BASE}/invoices/excess`} variant="secondary">Trường hợp tiền thừa</DoloresButton>
          <DoloresButton variant="secondary" onClick={() => setDialog("preview")}>Xem chứng từ</DoloresButton>
      </>}
    >
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <DoloresFieldGrid>
          <DoloresField label="Hóa đơn" value="HD-09-204" />
          <DoloresField label="Tổng phải trả" value="2.750.000 đ" />
          <DoloresField label="Ảnh khách đã gửi" value="CK-204-01.jpg" />
          <DoloresField label="Số tiền ngân hàng công ty nhận" value="1.750.000 đ" required />
          <DoloresField label="Ngày giao dịch" value="01/10/2026" />
          <DoloresField label="Ghi chú đối chiếu" value="Nội dung chuyển khoản khớp C-204" />
        </DoloresFieldGrid>
      </DoloresPanel>

      <DoloresPanel>
        <DoloresPanelTitle>Thông tin đối chiếu</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          <div>
            <p className="text-xs text-[#706561]">Đã nhận trước đó</p>
            <p className="mt-1 text-sm font-semibold text-[#302927]">0 đ</p>
          </div>
          <div>
            <p className="text-xs text-[#706561]">Còn thiếu</p>
            <p className="mt-1 text-sm font-semibold text-[#302927]">1.000.000 đ</p>
          </div>
          <div>
            <p className="text-xs text-[#706561]">Hạn thanh toán</p>
            <p className="mt-1 text-sm font-semibold text-[#302927]">12/10/2026</p>
          </div>
        </div>
      </DoloresPanel>
    </DoloresPage>

    {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(41,38,37,0.22)] p-6" role="presentation">
      {dialog === "confirm" && <section aria-labelledby="m21-confirm-title" aria-modal="true" className="flex w-full max-w-[580px] flex-col gap-5 rounded-[20px] bg-white p-8" role="dialog">
        <p className="text-sm font-semibold leading-[1.45]">Kiểm tra trước khi tiếp tục</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-confirm-title">Xác nhận · Đối soát chứng từ thanh toán</h2>
        <p className="text-base leading-[1.45]">Xác nhận 1.750.000 đ đã nhận qua ngân hàng công ty. Hóa đơn 2.750.000 đ còn thiếu 1.000.000 đ; chưa được ghi thanh toán đủ.</p>
        <div className="grid gap-4">
          <DoloresButton onClick={() => { writeDemoFlow("HD-09-204", "received-confirmed-demo"); setDialog("success"); }}>Xác nhận</DoloresButton>
          <DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton>
        </div>
      </section>}
      {dialog === "success" && <section aria-labelledby="m21-success-title" aria-modal="true" className="flex w-full max-w-[580px] flex-col gap-5 rounded-[20px] bg-white p-8" role="dialog">
        <p className="text-sm font-semibold leading-[1.45]">✓&nbsp; Đã hoàn tất</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-success-title">Đã ghi nhận thành công</h2>
        <p className="text-base leading-[1.45]">Xác nhận 1.750.000 đ đã nhận qua ngân hàng công ty. Hóa đơn 2.750.000 đ còn thiếu 1.000.000 đ; chưa được ghi thanh toán đủ.</p>
        <DoloresButton href={`${BASE}/invoices/shortfall`}>Xem yêu cầu và tiến trình</DoloresButton>
      </section>}
      {dialog === "preview" && <section aria-labelledby="m21-preview-title" aria-modal="true" className="flex w-full max-w-[580px] flex-col gap-5 rounded-[20px] bg-white p-8" role="dialog">
        <p className="text-sm font-semibold leading-[1.45]">Tài liệu trong hồ sơ</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-preview-title">Đối soát chứng từ thanh toán</h2>
        <p className="text-base leading-[1.45]">Tài liệu được lưu để xem và đối chiếu với hồ sơ.</p>
        <div className="rounded-[10px] bg-[#F6EEE9] p-5">
          <p className="text-base font-semibold">Chứng từ chuyển khoản</p>
          <p className="mt-2 text-sm leading-[1.45]">Bản xem mẫu: chưa có ảnh/PDF gốc được cung cấp trong dữ liệu thiết kế.</p>
        </div>
        <DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton>
      </section>}
    </div>}
  </>;
}

function SettlementScreen() {
  const [technicianDone, setTechnicianDone] = useState(false);
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  useEffect(() => {
    const update = () => setTechnicianDone(readDemoFlow("YC-017") === "retrieved-assessed");
    update();
    window.addEventListener("dolores-demo-flow", update);
    return () => window.removeEventListener("dolores-demo-flow", update);
  }, []);
  return <>
    <DoloresPage title="Quyết toán & hoàn cọc sau đánh giá" description="Xử lý riêng tiền đặt cọc sau khi Technician đã thu hồi và gửi đánh giá máy." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>Ghi nhận quyết toán</DoloresButton><DoloresButton href={`${BASE}/technical-requests/YC-017`} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={`${BASE}/contracts`} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>C-204 · S-018</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận từ Technician · demo trình duyệt" : "Chưa có kết quả Technician"} /><DoloresField label="Đánh giá máy" value={technicianDone ? "Đã báo · kiểm tra hồ sơ trước khi quyết toán" : "Đang chờ đánh giá"} /><DoloresField label="Tiền đặt cọc" value="Theo hồ sơ hợp đồng" /><DoloresField label="Trạng thái quyết toán" value={readDemoFlow("C-204-settlement") === "recorded-demo" ? "Đã ghi nhận trên bản xem trước" : "Chưa quyết toán"} /></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title={technicianDone ? "Kết quả đã có · frontend demo" : "Chờ bước Technician"}>{technicianDone ? "Có thể ghi nhận quyết toán sau khi kiểm tra hồ sơ. Thao tác này chỉ lưu trạng thái cục bộ, không chuyển tiền." : "Mở nhiệm vụ YC-017 ở Technician và gửi kết quả thu hồi/đánh giá trước. Chưa cho phép tiếp tục quyết toán."}</DoloresNotice>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận trên bản xem trước" : "Xác nhận quyết toán C-204?"} message={dialog === "success" ? "Trạng thái cục bộ đã được lưu. Không có giao dịch hoàn cọc nào được thực hiện." : "Kiểm tra kết quả Technician và điều khoản hợp đồng trước khi ghi nhận."} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { writeDemoFlow("C-204-settlement", "recorded-demo"); setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function DepositActionScreen({ path }: { path: string }) {
  const config = path === "contracts/compensation"
    ? { title: "Bồi thường vượt tiền đặt cọc", action: "Ghi nhận khoản bồi thường", key: "C-204-compensation", note: "Khoản vượt tiền đặt cọc được xử lý theo điều khoản và kết quả đánh giá; không tự tính mức phạt." }
    : path === "contracts/refund-good"
      ? { title: "Hoàn cọc · máy được đánh giá tốt", action: "Ghi nhận hoàn cọc", key: "C-204-refund-good", note: "Hoàn cọc là khoản riêng; chỉ ghi nhận sau khi đã xem kết quả Technician và thỏa thuận." }
      : { title: "Ghi nhận hoàn cọc", action: "Ghi nhận hoàn cọc", key: "C-204-deposit-refund", note: "Không gộp hoàn cọc với hoàn tiền thanh toán thừa hoặc thu khoản thiếu." };
  const [technicianDone, setTechnicianDone] = useState(false);
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  useEffect(() => {
    const update = () => setTechnicianDone(readDemoFlow("YC-017") === "retrieved-assessed");
    update();
    window.addEventListener("dolores-demo-flow", update);
    return () => window.removeEventListener("dolores-demo-flow", update);
  }, []);
  return <>
    <DoloresPage title={config.title} description="C-204 · S-018 · ghi nhận theo hồ sơ sau khi Technician báo kết quả." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>{config.action}</DoloresButton><DoloresButton href={`${BASE}/technical-requests/YC-017`} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={`${BASE}/contracts`} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin quyết toán</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng / máy" value="C-204 / S-018" /><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận · demo trình duyệt" : "Chưa có kết quả Technician"} /><DoloresField label="Tiền đặt cọc" value="Theo hợp đồng" /><DoloresField label="Số tiền" value="Theo kết quả đánh giá và thỏa thuận" /></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title={technicianDone ? "Kiểm tra hồ sơ trước khi ghi nhận" : "Chờ bước Technician"}>{technicianDone ? `${config.note} Bản frontend chỉ lưu trạng thái xem trước, không chuyển tiền.` : "Gửi kết quả thu hồi và đánh giá từ Technician trước; chưa mở ghi nhận khoản tiền."}</DoloresNotice>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận trên bản xem trước" : `Xác nhận · ${config.title}`} message={dialog === "success" ? "Không có giao dịch tài chính thật nào được thực hiện." : `${config.action}. Kiểm tra kết quả Technician và hồ sơ hợp đồng.`} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { writeDemoFlow(config.key, "recorded-demo"); setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function MenuScreens({ path }: { path: string }) {
  if (path === "menu" || path === "menu/items") return <SceneTable title="Global Menu mùa hè · các món" description="Quản lý món và công thức dùng chung trong Global Menu Dolores." headers={["Món", "Danh mục", "Thành phần / định lượng", "Trạng thái", "Thao tác"]} rows={[["Espresso", "Cà phê", "18 g cà phê · 40 ml nước", "Đang áp dụng", <Link href={`${BASE}/menu/espresso`} key="espresso">Chỉnh ›</Link>], ["Cà phê sữa tươi", "Cà phê", "18 g cà phê · sữa tươi", "Đang áp dụng", <Link href={`${BASE}/menu/add`} key="add">Chi tiết ›</Link>]]} actions={[["Thêm món", `${BASE}/menu/add`, "primary"], ["Thành phần", `${BASE}/menu/ingredients`, "secondary"], ["Gửi menu xuống máy Smart", `${BASE}/menu/send`, "secondary"]]} />;
  if (path === "menu/ingredients") return <SceneTable title="Thành phần món" description="Theo dõi định lượng theo đơn vị thành phần." headers={["Món", "Cà phê", "Nước", "Sữa tươi", "Kiểm tra"]} rows={[["Espresso", "18 g", "40 ml", "—", "Đủ"], ["Cà phê sữa tươi", "18 g", "—", "120 ml", "Đủ"]]} actions={[["Danh sách món", `${BASE}/menu`, "primary"], ["Thêm món", `${BASE}/menu/add`, "secondary"]]} />;
  if (path === "menu/send") return <ActionForm title="Gửi menu đến máy Smart" description="Chọn Global Menu và các máy Smart đích." fields={[["Global Menu", "Mùa hè · v3", "select"], ["Máy đích", "Chọn máy Smart IoT", "select"], ["Trạng thái gửi", "Chưa gửi", "text"]]} recordKey="global-menu-send" action="Gửi menu" returnHref={`${BASE}/menu`} nextHref={`${BASE}/menu/sent`} notice={["Chờ xác nhận từ thiết bị", "Gửi thành công chỉ là trạng thái chờ. Chỉ hiển thị đã áp dụng sau khi máy xác nhận."]} />;
  if (path === "menu/sent") return <SceneTable title="Trạng thái gửi Global Menu" description="Theo dõi trạng thái gửi và xác nhận áp dụng từ máy." headers={["Máy", "Global Menu", "Gửi lúc", "Trạng thái"]} rows={[["S-018", "Mùa hè · v3", "02/10/2026", "Đang chờ xác nhận từ máy"]]} actions={[["Về danh sách menu", `${BASE}/menu`, "primary"]]} notice={["Không đánh dấu áp dụng sớm", "Chỉ xác nhận áp dụng sau khi nhận acknowledgement từ thiết bị."]} />;
  if (path === "menu/add/missing") return <MenuMissingIngredient />;
  if (path === "menu/add") return <ActionForm title="Thêm món · Cà phê sữa tươi" description="Nhập công thức theo đúng thành phần máy hỗ trợ." fields={[["Tên món", "Cà phê sữa tươi", "text"], ["Cà phê", "18 g", "text"], ["Sữa tươi", "120 ml", "text"], ["Nước pha", "Theo thiết bị", "text"]]} recordKey="menu-add-milk" action="Lưu món" returnHref={`${BASE}/menu`} notice={["Thành phần bắt buộc", "Món cà phê sữa tươi cần có thành phần sữa tươi."]} />;
  const is20g = path.endsWith("20g");
  const is60ml = path.endsWith("60");
  return <ActionForm title={`Chỉnh công thức Espresso${is60ml ? " · nước pha 60 ml" : is20g ? " · cà phê 20 g" : ""}`} description="Sửa công thức Global Menu theo định lượng nguồn." fields={[["Cà phê", is20g ? "20 g" : "18 g", "text"], ["Nước pha", is60ml ? "60 ml" : "40 ml", "text"]]} recordKey="espresso-recipe" action="Lưu công thức Espresso" returnHref={`${BASE}/menu`} />;
}

function MenuMissingIngredient() {
  const [milk, setMilk] = useState("");
  const [invalid, setInvalid] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  if (saved) return <DoloresPage title="Đã lưu món Cà phê sữa tươi" description="Đã lưu trên bản xem trước · dữ liệu minh họa." actions={<DoloresButton href={`${BASE}/menu`}>Về danh sách món</DoloresButton>}><DoloresNotice title="Dữ liệu minh họa">Không có Global Menu thật nào được cập nhật.</DoloresNotice></DoloresPage>;
  return <>
    <DoloresPage title="Thêm món · thiếu thành phần bắt buộc" description="Global Menu mùa hè · thêm món Cà phê sữa tươi." actions={<><DoloresButton onClick={() => { if (!milk.trim()) setInvalid(true); else { setInvalid(false); setDialog(true); } }}>Lưu món</DoloresButton><DoloresButton href={`${BASE}/menu`} variant="secondary">Về danh sách món</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thành phần của món</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Tên món" value="Cà phê sữa tươi" /><DoloresField label="Cà phê" value="18 g" /><DoloresField label="Sữa tươi *" required><input aria-label="Sữa tươi bắt buộc" className="bg-transparent text-sm outline-none" value={milk} onChange={(event) => { setMilk(event.target.value); if (event.target.value.trim()) setInvalid(false); }} /></DoloresField><DoloresField label="Nước pha" value="Theo công thức máy" /></DoloresFieldGrid></DoloresPanel>
      {invalid && <DoloresNotice title="Thiếu thành phần bắt buộc" tone="warning">Món cà phê sữa tươi cần có định lượng sữa tươi. Chưa lưu công thức.</DoloresNotice>}
    </DoloresPage>
    {dialog && <DecisionDialog title="Xác nhận · Lưu món Cà phê sữa tươi" message={`Sữa tươi: ${milk}. Kiểm tra thành phần trước khi lưu vào Global Menu.`} onCancel={() => setDialog(false)} onConfirm={() => { writeDemoFlow("global-menu-new-dish", "saved-demo"); setDialog(false); setSaved(true); }} />}
  </>;
}

function BuybackScreens({ path }: { path: string }) {
  if (path === "buyback" || path === "buyback/list") return <SceneTable title="Thu mua máy cũ" description="Theo dõi đề nghị bán, chứng từ, thu gom và đưa máy qua tân trang/kiểm thử." headers={["Mã hồ sơ", "Khách hàng", "Máy", "Chứng từ / phản hồi", "Thu gom", "Trạng thái"]} rows={[[<Link href={`${BASE}/buyback/MB-2026-017`} key="mb">MB-2026-017</Link>, "Nguyễn Minh Anh", "MB-017", "Khách hàng đã xác nhận", "Chờ thu gom", "Chờ Technician"]]} actions={[["Mở đánh giá", `${BASE}/buyback/MB-2026-017`, "primary"], ["Yêu cầu thu gom", `${BASE}/technical-requests/new/collection`, "secondary"]]} notice={["Phản hồi và điều phối độc lập", "Xác nhận chứng từ mua bán được theo dõi riêng với lịch thu gom; không chặn điều phối chỉ vì bước xác nhận còn chờ."]} />;
  if (path.includes("documents")) return <ActionForm title="Chứng từ mua bán máy cũ" description="Ghi nhận chứng từ và phản hồi khách hàng cho hồ sơ MB-2026-017." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Giá mua", "Theo thỏa thuận", "text"], ["Chứng từ mua bán", "Chọn tệp", "file"], ["Khách hàng xác nhận", "Chờ phản hồi", "select"]]} recordKey="MB-2026-017-document" action="Ghi nhận hồ sơ" returnHref={`${BASE}/buyback`} notice={["Theo dõi độc lập", "Trạng thái xác nhận chứng từ không tự quyết định lịch Technician thu gom."]} />;
  if (path.includes("refurbishment")) return <RefurbishmentScreen />;
  return <ActionForm title="Đánh giá máy mua cũ & thương lượng" description="Ghi nhận tình trạng thiết bị và mức giá thỏa thuận." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Máy", "MB-017", "text"], ["Tình trạng Technician", "Chưa có kết quả", "select"], ["Giá đề nghị", "Theo thỏa thuận", "text"], ["Chứng từ", "Chọn tệp", "file"]]} recordKey="MB-2026-017-assessment" action="Ghi nhận đánh giá" returnHref={`${BASE}/buyback`} nextHref={`${BASE}/buyback/documents`} notice={["Đánh giá máy", "Thông tin tình trạng và kiểm thử do Technician báo; Moderator ghi nhận hồ sơ mua bán."]} />;
}

function RefurbishmentScreen() {
  const [technicianDone, setTechnicianDone] = useState(false);
  const [recorded, setRecorded] = useState(false);
  useEffect(() => {
    const update = () => setTechnicianDone(readDemoFlow("MB-2026-017") === "refurbished-tested");
    update();
    window.addEventListener("dolores-demo-flow", update);
    return () => window.removeEventListener("dolores-demo-flow", update);
  }, []);
  return <DoloresPage title="Tân trang & nhập kho" description="Ghi nhận kết quả Technician sau khi máy được thu gom." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setRecorded(true)}>Ghi nhận kết quả tân trang</DoloresButton><DoloresButton href="/technician/tasks/refurbishment" variant="secondary">Mở công việc Technician</DoloresButton><DoloresButton href={`${BASE}/buyback`} variant="secondary">Về thu mua máy cũ</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>MB-017 · MB-2026-017</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Thu gom" value={technicianDone ? "Đã nhận từ Technician · demo trình duyệt" : "Chờ kết quả Technician"} /><DoloresField label="Tân trang" value={technicianDone ? "Đã ghi kết quả tân trang và kiểm thử" : "Chưa hoàn tất"} /><DoloresField label="Trạng thái kho" value={recorded ? "Đã ghi nhận · bản xem trước" : "Chưa sẵn sàng cho thuê"} /></DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title={technicianDone ? "Có thể ghi nhận sau khi kiểm tra" : "Chờ Technician tân trang và kiểm thử"}>{technicianDone ? "Ghi nhận không đưa máy vào kho thật; thao tác chỉ thay đổi dữ liệu demo trong phiên." : "Chỉ sau khi Technician báo hoàn tất tân trang và kiểm thử mới mở bước Moderator ghi nhận."}</DoloresNotice>
  </DoloresPage>;
}

function Alerts() {
  return <SceneTable title="Cảnh báo & nhắc việc" description="Theo dõi cảnh báo hợp đồng, kết nối và trạng thái menu." headers={["Cảnh báo", "Khách hàng / máy", "Ngày", "Trạng thái", "Mở"]} rows={[["Mất kết nối / lỗi menu", "Cà phê Mộc · S-018", "02/10/2026", "Cần kiểm tra", <Link href={`${BASE}/iot/machines`} key="iot">Mở ›</Link>], ["Hợp đồng sắp hết hạn", "C-204", "31/10/2026", "Chưa phản hồi", <Link href={`${BASE}/contracts/expiry`} key="exp">Mở ›</Link>]]} actions={[["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "primary"], ["Thông báo", `${BASE}/notifications`, "secondary"]]} />;
}

function Notifications() {
  return <SceneTable title="Thông báo" description="Thông báo liên quan đến hợp đồng, thanh toán, máy và công việc." headers={["Nội dung", "Liên quan", "Ngày", "Trạng thái", "Mở"]} rows={[["Kết quả Technician YC-017", "S-018 · C-204", "01/10/2026", "Đã báo kết quả", <Link href={`${BASE}/technical-requests/YC-017`} key="yc">Mở ›</Link>], ["Hóa đơn HD-09-204 cần đối soát", "Cà phê Mộc", "30/09/2026", "Chờ xử lý", <Link href={`${BASE}/invoices/reconcile`} key="bill">Mở ›</Link>], ["Menu S-018 chờ xác nhận", "Mùa hè · v3", "02/10/2026", "Đang chờ máy", <Link href={`${BASE}/menu/sent`} key="menu">Mở ›</Link>]]} actions={[["Cảnh báo & nhắc việc", `${BASE}/notifications/alerts`, "primary"]]} />;
}

function TechRequestsAlias({ path }: { path: string }) { return <TechnicalScreens path={path} />; }

export function ModeratorSectionPage({ sections }: { sections: string[] }) {
  const path = sections.join("/");
  if (!path) return <Dashboard />;
  if (path.startsWith("contracts")) return <ContractScreens path={path} />;
  if (path.startsWith("customers")) return <CustomerScreens path={path} />;
  if (path.startsWith("invoices")) return <InvoiceScreens path={path} />;
  if (path.startsWith("machines")) return <MachineScreens path={path} />;
  if (path.startsWith("iot")) return <IoTScreens path={path} />;
  if (path.startsWith("menu")) return <MenuScreens path={path} />;
  if (path.startsWith("technical-requests")) return <TechRequestsAlias path={path} />;
  if (path.startsWith("machine-history")) return <TechnicalScreens path={path} />;
  if (path.startsWith("buyback")) return <BuybackScreens path={path} />;
  if (path === "notifications/alerts") return <Alerts />;
  if (path === "notifications") return <Notifications />;
  return <DoloresPage title="Không tìm thấy màn hình" description={`Đường dẫn /moderator/${path} chưa được ánh xạ.`} actions={<DoloresButton href={`${BASE}`}>Về tổng quan</DoloresButton>}><DoloresNotice title="Không có frame tương ứng">Chọn một mục trong menu để tiếp tục.</DoloresNotice></DoloresPage>;
}
