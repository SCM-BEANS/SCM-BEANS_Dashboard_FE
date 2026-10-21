"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DashboardOverview } from "@/app/_features/dashboard/DashboardOverview";
import {
  MachineIdentityLabel,
  MachineStatusLabel,
  MachineTypeLabel,
  type MachineDisplayModel,
} from "@/app/_features/machines/MachinePresentation";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import shellStyles from "@/app/_shell/dolores/DoloresShell.module.css";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresMetric,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/app/_ui/dolores/DoloresUI";
import { isRetrievalAssessment, readDemoFields, readDemoRecord, useDemoRecord, writeDemoRecord, writeDemoFlow } from "@/app/_features/demo-flow/demoFlowStore";
import { PATH_MODERATOR, PATH_TECHNICIAN } from "@/routes/path";

const getCentralizedModeratorPath = (relativePath: string) => relativePath ? `${PATH_MODERATOR.root}/${relativePath}` : PATH_MODERATOR.root;

type Row = ReactNode[];

function ActionBar({ items }: { items: [string, string, "primary" | "secondary"][] }) {
  return <>{items.map(([label, href, variant]) => <DoloresButton key={href + label} href={href} variant={variant}>{label}</DoloresButton>)}</>;
}

function Dashboard() {
  const bars = [["T1", 76], ["T2", 91], ["T3", 83], ["T4", 124], ["T5", 110], ["T6", 142], ["T7", 132], ["T8", 166]] as const;
  return <DashboardOverview title="Tổng quan hợp đồng & thanh toán" description="Việc ưu tiên cho Moderator: hợp đồng, hóa đơn, máy IoT và phản hồi khách." actions={<DoloresButton href={PATH_MODERATOR.invoices}>Việc cần xử lý</DoloresButton>} showMobileActionsMenu={false} metrics={[
    { label: "Hợp đồng hiệu lực", value: "98" },
    { label: "Chứng từ chờ đối chiếu", value: "12" },
    { label: "Smart IoT đang thuê", value: "56" },
    { label: "Máy IoT còn trong kho", value: "12" },
  ]}>
    <DoloresPanel className="dl-moderator-chart">
      <DoloresPanelTitle>Số ly Smart IoT theo tháng</DoloresPanelTitle>
      <p className="-mt-3 text-[13px] leading-[1.45] text-[#706561]">Ly hợp lệ đã đồng bộ · dữ liệu minh họa</p>
      <div className="dl-moderator-bars mt-6 grid grid-cols-[32px_1fr] gap-4">
        <div className="flex h-[186px] flex-col justify-between pb-5 text-[10px] text-[#706561]"><span>166</span><span>83</span><span>0</span></div>
        <div className="grid grid-cols-8 items-end gap-3">
          {bars.map(([month, value]) => <div className="flex h-[186px] flex-col items-stretch justify-end" key={month}>
            <span className="mb-1 text-center text-[11px] font-medium">{value}</span>
            <div className="rounded-t-[5px] bg-[#F4E9E3]" style={{ height: `${Math.round((value / 166) * 132)}px` }} />
            <span className="pt-2 text-[10px] text-[#706561]">{month}</span>
          </div>)}
        </div>
      </div>
      <p className="dl-chart-note mt-3 text-[11px] leading-[1.45] text-[#706561]">Máy thường không gửi telemetry hoặc số ly lên Dolores.</p>
    </DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Việc cần xử lý</DoloresPanelTitle><p className="text-sm font-semibold">12 chứng từ thanh toán</p><p className="mt-1 text-[13px] text-[#706561]">Tenant tải ảnh chuyển khoản; Moderator so khớp tài khoản công ty.</p></DoloresPanel>
  </DashboardOverview>;
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

type FormField = [string, string, "text" | "file" | "select", string[]?];
const positiveQuantity = (value: string) => /^\d+(?:\.\d+)?(?:\s*(?:g|ml))?$/.test(value.trim()) && Number.parseFloat(value) > 0;

function ActionForm({ title, description, fields, recordKey, action, returnHref, nextHref, notice }: { title: string; description: string; fields: FormField[]; recordKey: string; action: string; returnHref: string; nextHref?: string; notice?: [string, string] }) {
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const signature = JSON.stringify(fields);
  useEffect(() => {
    const saved = readDemoRecord('moderator:' + recordKey);
    const initialFields: FormField[] = JSON.parse(signature);
    setLocalValues({ ...saved?.payload, ...Object.fromEntries(initialFields.map(([,value,type],index) => ['field-' + index, saved?.payload['field-' + index] ?? (type === 'file' ? '' : value)])) });
    setDialog(null); setErrors({});
  }, [recordKey, signature]);
  const values = Object.fromEntries(fields.map(([label,value,type],index) => [label, localValues['field-' + index] ?? (type === 'file' ? '' : value)]));
  const validate = () => {
    const next: Record<string,string> = {};
    fields.forEach(([label,,type],index) => {
      const value = values[label];
      if ((type === 'file' || label === 'Tên món' || label === 'Họ tên') && !value.trim()) next['field-' + index] = 'Vui lòng bổ sung trước khi gửi';
      if ((label === 'Cà phê' || label === 'Sữa tươi' || (label === 'Nước pha' && recordKey === 'espresso-recipe')) && !positiveQuantity(value)) next['field-' + index] = 'Thành phần bắt buộc phải có định lượng lớn hơn 0.';
      if (label.includes('Email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) next['field-' + index] = 'Vui lòng bổ sung email hợp lệ trước khi gửi';
    });
    setErrors(next);
    if (Object.keys(next).length) { setDialog(null); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()); return false; }
    return true;
  };
  const saveDemo = () => {
    if (!validate()) return;
    const payload = Object.fromEntries(fields.map(([label,value,type],index) => ['field-' + index, localValues['field-' + index] ?? (type === 'file' ? '' : value)]));
    if (writeDemoRecord('moderator:' + recordKey, 'submitted-demo', { ...localValues, ...payload }, (readDemoRecord('moderator:' + recordKey)?.version ?? 0) + 1)) setDialog('success');
  };
  const missingMilk = recordKey === 'menu-add-milk' && Boolean(errors['field-2']);
  return <>
    <DoloresPage title={missingMilk ? 'Thêm món · thiếu thành phần bắt buộc' : title} description={description} actions={<><DoloresButton onClick={() => { if (validate()) setDialog('confirm'); }}>{action}</DoloresButton><DoloresButton href={returnHref} variant="secondary">Quay lại</DoloresButton></>}>
      {notice && <DoloresNotice title={notice[0]}>{notice[1]}</DoloresNotice>}
      <DoloresPanel><DoloresPanelTitle>Thông tin xử lý</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label,value,type,options],index) => {
        const id = 'field-' + index;
        const update = (value: string) => setLocalValues(current => ({...current,[id]:value}));
        return <DoloresField key={id} label={label} required={type === 'file' || label === 'Cà phê' || label === 'Sữa tươi'}>
          {type === 'file' ? <><input className="text-sm" type="file" aria-label={label} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? id + '-error' : undefined} onChange={event => { const file = event.target.files?.[0]; update(file?.name ?? ''); setLocalValues(current => ({...current,[id + '-type']:file?.type ?? '',[id + '-size']:String(file?.size ?? '')})); }} />{localValues[id] && <span className="text-xs text-[#706561]">{localValues[id]}</span>}</> : type === 'select' ? <select aria-label={label} className="bg-transparent text-sm outline-none" value={values[label]} onChange={event => update(event.target.value)}>{Array.from(new Set(options ?? [value, "Đã xác nhận", "Chờ xử lý", "Đã hoàn tất"])).map(option => <option key={option}>{option}</option>)}</select> : <input aria-label={label} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? id + '-error' : undefined} className="w-full bg-transparent text-sm outline-none" value={values[label]} onChange={event => update(event.target.value)} />}
          {errors[id] && <span id={id + '-error'} className="text-xs text-[#B81724]">{errors[id]}</span>}
        </DoloresField>;
      })}</DoloresFieldGrid></DoloresPanel>
      {Object.keys(errors).length > 0 && <DoloresNotice title={missingMilk ? 'Thiếu thành phần bắt buộc' : 'Chưa thể gửi thông tin'} tone="warning">{missingMilk ? 'Món cà phê sữa tươi cần có định lượng sữa tươi. Chưa lưu công thức.' : 'Bổ sung thông tin được đánh dấu rồi gửi lại.'}</DoloresNotice>}
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === 'success'} nextHref={dialog === 'success' ? nextHref : undefined} title={dialog === 'success' ? 'Đã ghi nhận trên bản xem trước' : 'Xác nhận · ' + title} message={dialog === 'success' ? 'Trạng thái và dữ liệu được lưu trong trình duyệt để minh họa flow.' : action + '. ' + Object.entries(values).map(([label,value]) => label + ': ' + value).join(' · ')} onCancel={() => setDialog(null)} onConfirm={() => dialog === 'success' ? setDialog(null) : saveDemo()} />}
  </>;
}

function StandardContractPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const signedDocument = "C-205-signed.pdf";
  const contractFields = [
    ["Khách hàng / shop", "Nguyễn Minh Anh / Cà phê Mộc"],
    ["Máy chính", "C-031 · Máy thường"],
    ["Thời hạn", "15/05–14/11/2026"],
    ["Giá thuê", "1.500.000 đ/tháng"],
    ["Đặt cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"],
    ["Hợp đồng bản ký", `${signedDocument} · ký bên ngoài`],
    ["Địa điểm hợp đồng", "Quận 3, TP. HCM"],
  ];
  return <>
    <DoloresPage
      title="Hồ sơ hợp đồng C-205"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<ActionBar items={[["Xem hóa đơn", PATH_MODERATOR.invoices, "primary"], ["Lịch sử phiên bản", PATH_MODERATOR.invoiceHistory, "secondary"], ["Danh sách hợp đồng", PATH_MODERATOR.contracts, "secondary"]]} />}
      mobileActions={<><DoloresButton onClick={() => setPreviewOpen(true)}>Xem bản ký</DoloresButton><DoloresButton href={PATH_MODERATOR.contractStandardHandover} variant="secondary">Bàn giao máy thường</DoloresButton></>}
    >
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <div className="flex flex-col gap-3">
          {contractFields.map(([label, value]) => <div className="flex flex-col gap-[5px]" key={label}>
            <span className="text-xs leading-[1.45] text-[#706561]">{label}</span>
            <span className="text-sm font-semibold leading-[1.45] text-[#302927]">{value}</span>
          </div>)}
        </div>
      </DoloresPanel>
    </DoloresPage>
    {previewOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-4" role="presentation">
      <section aria-labelledby="standard-contract-preview-title" aria-modal="true" className="flex w-full max-w-[358px] flex-col gap-4 rounded-[20px] bg-white px-5 py-6" role="dialog">
        <p className="text-xs font-semibold leading-[1.45] text-[#706561]">Tài liệu trong hồ sơ</p>
        <h2 className="text-[22px] font-semibold leading-[1.45] text-[#302927]" id="standard-contract-preview-title">Hồ sơ hợp đồng C-205</h2>
        <p className="text-sm leading-[1.45] text-[#302927]">Tài liệu được lưu để xem và đối chiếu với hồ sơ.</p>
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E9E2DC] p-4">
          <h3 className="text-lg font-semibold leading-[1.45] text-[#302927]">Tài liệu</h3>
          <p className="text-sm leading-[1.45] text-[#302927]">{signedDocument}</p>
          <p className="text-sm leading-[1.45] text-[#302927]">Bản xem mẫu: chưa có ảnh/PDF gốc được cung cấp trong dữ liệu thiết kế.</p>
        </div>
        <DoloresButton variant="secondary" onClick={() => setPreviewOpen(false)}>Đóng</DoloresButton>
      </section>
    </div>}
  </>;
}

function ContractScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contracts || getCentralizedModeratorPath(path) === PATH_MODERATOR.contractsList) return <SceneTable title="Danh sách hợp đồng thuê" description="Theo dõi loại máy, khách hàng, thời hạn và hồ sơ hợp đồng." headers={["Hợp đồng", "Khách hàng", "Loại bàn giao", "Thời hạn", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={PATH_MODERATOR.contractDetail("C-204")} key="c204">C-204</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Smart IoT · S-018", "31/10/2026", "Sắp hết hạn", "Đã ký"],
    [<Link href={PATH_MODERATOR.contractDetail("C-205")} key="c205">C-205</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Máy thường · C-031", "14/11/2026", "Đang hiệu lực", "Đã ký"],
  ]} actions={[["Tạo hồ sơ hợp đồng", PATH_MODERATOR.newContract, "primary"], ["Nhắc hợp đồng sắp hết hạn", PATH_MODERATOR.contractExpiry, "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contractDetail("C-205")) return <><div className={shellStyles.desktopOnlyContent}><ContractsIndexFallback /></div><div className={shellStyles.mobileOnlyContent}><StandardContractPage /></div></>;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contractDetail("C-204")) return <DoloresPage title="Hồ sơ hợp đồng C-204" description="Thông tin cửa hàng, thiết bị, điều khoản và các sự kiện liên quan." actions={<ActionBar items={[["Xem hóa đơn", PATH_MODERATOR.invoices, "primary"], ["Lịch sử phiên bản", PATH_MODERATOR.invoiceHistory, "secondary"], ["Danh sách hợp đồng", PATH_MODERATOR.contracts, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin hợp đồng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Khách hàng" value="Nguyễn Minh Anh" /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Loại máy" value="Smart IoT · S-018" /><DoloresField label="Thời hạn" value="31/10/2026" /><DoloresField label="Hợp đồng đã ký" value="Có · hồ sơ minh họa" /><DoloresField label="Trạng thái" value="Đang hiệu lực" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contractExpiry) return <ActionForm title="Nhắc hợp đồng sắp hết hạn" description="Gửi thông báo để khách hàng phản hồi về hợp đồng C-204." fields={[["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Khách hàng", "Nguyễn Minh Anh", "text"], ["Hết hạn", "31/10/2026", "text"], ["Kết quả phản hồi", "Chưa phản hồi", "select"]]} recordKey="M11-C-204" action="Gửi nhắc hợp đồng" returnHref={PATH_MODERATOR.contracts} notice={["Theo dõi phản hồi riêng", "Hồ sơ C-204 và trạng thái hợp đồng được giữ lại trong bản xem trước."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contractSettlement) return <SettlementScreen />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.contractCompensation || getCentralizedModeratorPath(path) === PATH_MODERATOR.contractDepositRefund || getCentralizedModeratorPath(path) === PATH_MODERATOR.contractRefundGood) return <DepositActionScreen path={path} />;
  const pathConfigs: Record<string, [string, string, [string, string, "text" | "file" | "select"][], string, string, string, [string, string]?]> = {
    "contracts/new": ["Đàm phán & lập hợp đồng thuê", "Ghi nhận thỏa thuận để chuyển sang bước lập và ký hợp đồng ngoài Dolores.", [["Khách hàng", "Nguyễn Minh Anh", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Loại máy", "Máy thường / Smart IoT", "select"], ["Điều khoản đã thống nhất", "Nhập theo thỏa thuận", "text"]], "M02", "Lưu thông tin đàm phán", PATH_MODERATOR.contracts, ["Ký hợp đồng ở ngoài Dolores", "Ứng dụng chỉ lưu trạng thái hồ sơ minh họa, không thay thế bước thương lượng hoặc ký kết."]],
    "contracts/first-invoice": ["Hóa đơn tháng đầu", "Rà soát tiền đặt cọc và các khoản tháng đầu trước khi ghi nhận.", [["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Tiền đặt cọc", "Theo hợp đồng", "text"], ["Khoản thuê kỳ đầu", "750.000 đ", "text"], ["Chứng từ", "Chọn chứng từ", "file"]], "M05", "Ghi nhận hóa đơn tháng đầu", PATH_MODERATOR.contracts],
    "contracts/handover/standard": ["Bàn giao & lắp đặt máy thường", "Gửi yêu cầu kỹ thuật để hoàn thành việc bàn giao máy thường.", [["Hợp đồng", "C-205", "text"], ["Máy", "C-031 · máy thường", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Ngày bàn giao", "Theo lịch thỏa thuận", "text"]], "M03", "Gửi yêu cầu Technician", PATH_MODERATOR.technicalRequestType("install-standard")],
    "contracts/handover/smart": ["Bàn giao & kích hoạt Smart IoT", "Gửi yêu cầu kích hoạt thiết bị Smart theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Máy Smart IoT", "S-018", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Kết nối / kích hoạt", "Chờ Technician", "select"]], "M04", "Gửi yêu cầu Technician", PATH_MODERATOR.technicalRequestType("install-smart"), ["Trạng thái kích hoạt", "Chỉ ghi nhận hoàn tất sau khi có kết quả Technician và phản hồi thiết bị."]],
    "contracts/retrieval": ["Thu hồi trước quyết toán cọc", "Gửi Technician thu hồi và đánh giá máy theo hợp đồng C-204.", [["Hợp đồng", "C-204", "text"], ["Máy", "S-018 · Smart IoT", "text"], ["Ngày thu hồi", "Chọn lịch", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"]], "M12", "Gửi yêu cầu thu hồi", PATH_MODERATOR.technicalRequestDetail("YC-017"), ["Thứ tự xử lý", "Quyết toán tiền cọc chỉ mở sau khi Technician gửi kết quả thu hồi và đánh giá."]],
    "contracts/settlement": ["Quyết toán & hoàn cọc sau đánh giá", "Ghi nhận quyết toán khi kết quả thu hồi của Technician đã có.", [["Hợp đồng", "C-204", "text"], ["Máy đã thu hồi", "S-018", "text"], ["Kết quả đánh giá", "Chờ Technician", "select"], ["Khoản quyết toán", "Theo hồ sơ hợp đồng", "text"]], "M13", "Ghi nhận quyết toán", PATH_MODERATOR.contracts, ["Cần kết quả Technician", "Chỉ tiếp tục sau khi technician báo thu hồi và tình trạng máy. Các khoản thanh toán không thực hiện trong bản demo."]],
    "contracts/early-termination": ["Chấm dứt sớm & vi phạm", "Ghi nhận trường hợp chấm dứt sớm theo hợp đồng và chứng từ liên quan.", [["Hợp đồng", "C-204", "text"], ["Lý do", "Chọn lý do", "select"], ["Khoản phí / bồi thường", "Theo hợp đồng", "text"], ["Tài liệu chứng minh", "Chọn tệp", "file"]], "M14", "Ghi nhận tình huống", PATH_MODERATOR.contracts],
    "contracts/compensation": ["Bồi thường vượt tiền đặt cọc", "Theo dõi khoản bồi thường vượt giá trị tiền đặt cọc trong hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tiền đặt cọc", "Theo hồ sơ", "text"], ["Mức bồi thường", "Theo đánh giá", "text"], ["Chứng từ", "Chọn tệp", "file"]], "M30", "Ghi nhận khoản bồi thường", PATH_MODERATOR.contracts],
    "contracts/deposit-refund": ["Ghi nhận hoàn cọc", "Ghi nhận trạng thái hoàn cọc sau khi đã đối chiếu điều kiện hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Số tiền cọc", "Theo hồ sơ", "text"], ["Trạng thái Technician", "Chưa có kết quả", "select"], ["Xác nhận thanh toán ngoài hệ thống", "Chọn chứng từ", "file"]], "M31", "Ghi nhận hoàn cọc", PATH_MODERATOR.contracts, ["Hoàn cọc là khoản riêng", "Không gộp hoàn cọc với hoàn tiền thanh toán thừa hoặc thu khoản thiếu."]],
    "contracts/refund-good": ["Hoàn cọc · máy được đánh giá tốt", "Ghi nhận nhánh hoàn đủ cọc khi máy được đánh giá tốt.", [["Hợp đồng", "C-204", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"], ["Số tiền hoàn", "Theo hợp đồng", "text"], ["Chứng từ hoàn", "Chọn tệp", "file"]], "M35", "Ghi nhận hoàn cọc", PATH_MODERATOR.contracts],
    "contracts/violations": ["Theo dõi vi phạm hợp đồng", "Theo dõi thông báo, phản hồi và bước xử lý theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tình trạng vi phạm", "Chọn trạng thái", "select"], ["Phản hồi khách hàng", "Chưa phản hồi", "text"], ["Ghi chú", "Nhập nội dung", "text"]], "M36", "Ghi nhận trạng thái", PATH_MODERATOR.contracts],
  };
  const config = pathConfigs[path];
  if (!config) return <ContractsIndexFallback />;
  const [title, description, fields, key, action, back, notice] = config;
  return <ActionForm title={title} description={description} fields={fields} recordKey={key} action={action} returnHref={back} notice={notice} />;
}

function ContractsIndexFallback() { return <SceneTable title="Hợp đồng thuê" description="Hồ sơ và quy trình hợp đồng trong Dolores." headers={["Hợp đồng", "Khách hàng", "Thiết bị", "Trạng thái"]} rows={[["C-204", "Nguyễn Minh Anh", "S-018 · Smart IoT", "Đang hiệu lực"], ["C-205", "Nguyễn Minh Anh", "C-031 · máy thường", "Đang hiệu lực"]]} actions={[["Hợp đồng", PATH_MODERATOR.contracts, "primary"]]} />; }

function CustomerScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.customers || getCentralizedModeratorPath(path) === PATH_MODERATOR.customersList) return <SceneTable title="Tài khoản khách hàng" description="Moderator tạo và quản lý tài khoản Customer trong phạm vi nghiệp vụ." headers={["Khách hàng", "Cửa hàng", "Hợp đồng", "Tài khoản", "Hồ sơ"]} rows={[[<Link href={PATH_MODERATOR.customerDetail("nguyen-minh-anh")} key="customer">Nguyễn Minh Anh ›</Link>, "Cà phê Mộc", "C-204 · C-205", "Đang hoạt động", "Xem hồ sơ"]]} actions={[["Tạo tài khoản khách hàng", PATH_MODERATOR.newCustomer, "primary"]]} notice={["Giới hạn vai trò", "Moderator chỉ tạo tài khoản Customer. Quản lý tài khoản Admin, Moderator hoặc Technician thuộc phạm vi Admin."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.newCustomer) return <ActionForm title="Tạo tài khoản khách hàng" description="Tạo hồ sơ truy cập cho một khách hàng." fields={[["Họ và tên", "Nguyễn Minh Anh", "text"], ["Email", "minhanh@example.com", "text"], ["Số điện thoại", "0900000000", "text"], ["Cửa hàng", "Cà phê Mộc", "text"]]} recordKey="M48" action="Tạo tài khoản khách hàng" returnHref={PATH_MODERATOR.customers} />;
  return <DoloresPage title="Hồ sơ khách hàng Nguyễn Minh Anh" description="Thông tin tài khoản khách, cửa hàng và các hợp đồng liên quan." actions={<ActionBar items={[["Xem hợp đồng C-204", PATH_MODERATOR.contractDetail("C-204"), "primary"], ["Danh sách khách hàng", PATH_MODERATOR.customers, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin khách hàng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Họ tên" value="Nguyễn Minh Anh" /><DoloresField label="Email" value="minhanh@example.com" /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Trạng thái tài khoản" value="Đang hoạt động" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
}

function InvoiceScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoices || getCentralizedModeratorPath(path) === PATH_MODERATOR.invoicesList) return <InvoicesList />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceReconcile) return <InvoiceReconcileScreen />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceShortfall) return <ActionForm title="Yêu cầu thanh toán phần còn thiếu" description="Gửi thông báo bổ sung cho phần còn thiếu của hóa đơn HD-09-204." fields={[["Hóa đơn", "HD-09-204", "text"], ["Tổng phải trả", "2.750.000 đ", "text"], ["Đã đối soát", "1.750.000 đ", "text"], ["Còn thiếu", "1.000.000 đ", "text"], ["Hạn thanh toán", "12/10/2026", "text"]]} recordKey="HD-09-204-shortfall" action="Gửi yêu cầu bổ sung" returnHref={PATH_MODERATOR.invoiceReconcile} notice={["Nhắc hằng ngày", "Thông báo nhắc tiếp tục theo trạng thái thanh toán trên hóa đơn."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceExcess) return <ActionForm title="Hoàn khoản thanh toán thừa" description="Đối chiếu phản hồi khách hàng và ngân hàng trước khi ghi nhận khoản thừa." fields={[["Hóa đơn", "HD-09-205", "text"], ["Số phải trả", "1.500.000 đ", "text"], ["Đã nhận", "1.700.000 đ", "text"], ["Tiền thừa", "200.000 đ", "text"], ["Xác nhận khách hàng / ngân hàng", "Chờ đối chiếu", "select"]]} recordKey="HD-09-205-excess" action="Ghi nhận đã hoàn tiền thừa" returnHref={PATH_MODERATOR.invoices} notice={["Điều kiện ghi nhận", "Chờ khách hàng xác nhận và khớp giao dịch ngân hàng; đây là khoản hoàn thừa, không phải hoàn cọc."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceLateCups || getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceLateCupsFinal) return <LateCupsScreen finalized={path.endsWith("final")} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceOverdue) return <SceneTable title="Dư nợ quá hạn & phí cộng dồn" description="Theo dõi khoản quá hạn theo hóa đơn và kỳ phát sinh." headers={["Khách hàng", "Hóa đơn", "Gốc", "Phí cộng dồn", "Hạn thanh toán", "Trạng thái"]} rows={[["Cà phê Mộc", "HD-08-204", "1.000.000 đ", "Theo điều khoản", "11/09/2026", "Quá hạn"]]} actions={[["Mở hóa đơn", PATH_MODERATOR.invoiceReconcile, "primary"], ["Danh sách hóa đơn", PATH_MODERATOR.invoices, "secondary"]]} notice={["Không tự tính mức phạt", "Mức phí chỉ lấy theo điều khoản hợp đồng; bản xem trước không tự suy ra lãi hoặc phí."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoiceHistory) return <InvoiceHistory />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.invoicePayg) return <SceneTable title="PAYG & số ly gửi về muộn" description="Đối chiếu dữ liệu theo máy, hợp đồng và chu kỳ." headers={["Máy", "Hợp đồng", "Loại", "Ly trong kỳ", "Giá/ly", "Thành tiền"]} rows={[["S-018", "C-204", "Smart IoT", "1.000", "2.000 đ", "2.000.000 đ"], ["S-022", "C-204", "Máy thay tạm", "120", "Theo hợp đồng", "Gộp C-204"]]} actions={[["Xử lý ly gửi muộn", PATH_MODERATOR.invoiceLateCups, "primary"], ["Hóa đơn", PATH_MODERATOR.invoices, "secondary"]]} notice={["Gắn đúng hợp đồng", "Usage máy thay thế được phân bổ theo kỳ cho hợp đồng chính; không tạo hợp đồng thanh toán riêng."]} />;
  return <InvoicesList />;
}

const BILL_STATUSES = ['Chưa thanh toán · còn trong hạn', 'Đã thanh toán', 'Đã đối soát', 'Đã hoàn tất', 'Quá hạn', 'Không còn chỉnh sửa'] as const;
type BillStatus = typeof BILL_STATUSES[number];
type BillFixture = { id: string; period: string; dueDate: string; receivedDate: string; status: BillStatus; editable: boolean };
function canRecalculate(bill: BillFixture) {
  return bill.status === 'Chưa thanh toán · còn trong hạn' && bill.editable && bill.receivedDate <= bill.dueDate;
}
function LateCupsScreen({ finalized }: { finalized: boolean }) {
  const [status,setStatus] = useState<BillStatus>(finalized ? 'Đã hoàn tất' : BILL_STATUSES[0]);
  const [dialog,setDialog] = useState<'confirm'|'success'|null>(null);
  const [values,setValues] = useState({receivedDate:'02/10/2026',cups:'120 ly',amount:'120.000 đ'});
  useEffect(() => {
    const saved = readDemoRecord('moderator:HD-09-204:late-cups');
    const payload = saved?.payload;
    setStatus(payload && BILL_STATUSES.includes(payload.status as BillStatus) ? payload.status as BillStatus : finalized ? 'Đã hoàn tất' : BILL_STATUSES[0]);
    if (payload && payload.bill === 'HD-09-204') setValues({receivedDate:payload.receivedDate ?? '02/10/2026', cups:payload.cups ?? '120 ly', amount:payload.amount ?? '120.000 đ'});
    setDialog(null);
  }, [finalized]);
  const bill: BillFixture = {id:'HD-09-204',period:'09/2026',dueDate:'2026-10-12',receivedDate:'2026-10-02',status,editable:status !== 'Không còn chỉnh sửa'};
  const recalculate = canRecalculate(bill);
  const action = recalculate ? 'Tính lại & gửi bản mới' : 'Ghi nhận cộng kỳ sau';
  const save = () => {
    const previous = readDemoRecord('moderator:HD-09-204:late-cups');
    let history: unknown[] = [];
    try { const parsed: unknown = JSON.parse(previous?.payload.history ?? '[]'); if(Array.isArray(parsed)) history=parsed; } catch { /* Invalid history is not used. */ }
    const action = canRecalculate(bill) ? 'recalculated' : 'carry-forward';
    const invoiceVersion = 1 + history.filter(item => item && typeof item === 'object' && (item as Record<string, unknown>).action === 'recalculated').length + (action === 'recalculated' ? 1 : 0);
    const entry = {...values,bill:bill.id,period:bill.period,status,action,invoiceVersion:String(invoiceVersion)};
    if(writeDemoRecord('moderator:HD-09-204:late-cups',entry.action,{...entry,history:JSON.stringify([...history,entry])},(previous?.version ?? 0)+1)) setDialog('success');
  };
  return <>
    <DoloresPage title={recalculate ? 'Xử lý số ly gửi về muộn' : 'Ly gửi muộn · hóa đơn đã hoàn tất'} description="Chọn nhánh phù hợp với trạng thái hóa đơn và kỳ đối chiếu." actions={<><DoloresButton onClick={()=>setDialog('confirm')}>{action}</DoloresButton><DoloresButton href={PATH_MODERATOR.invoices} variant="secondary">Quay lại</DoloresButton></>}>
      <DoloresNotice title="Điều kiện cập nhật">Chỉ tính lại/gửi bản mới khi hóa đơn chưa thanh toán, còn trong hạn và còn chỉnh sửa. Nếu đã chốt hoặc quá điều kiện, chuyển số ly sang kỳ tiếp theo.</DoloresNotice>
      <DoloresPanel><DoloresPanelTitle>Thông tin xử lý</DoloresPanelTitle><DoloresFieldGrid>
        <DoloresField label="Hóa đơn" value={bill.id + (recalculate ? ' · chưa chốt' : ' · đã chốt / chuyển kỳ sau')} />
        <DoloresField label="Ngày nhận dữ liệu" value={values.receivedDate} />
        <DoloresField label="Số ly gửi muộn"><input aria-label="Số ly gửi muộn" className="bg-transparent text-sm outline-none" value={values.cups} onChange={event=>setValues(current=>({...current,cups:event.target.value}))} /></DoloresField>
        <DoloresField label="Giá trị bổ sung"><input aria-label="Giá trị bổ sung" className="bg-transparent text-sm outline-none" value={values.amount} onChange={event=>setValues(current=>({...current,amount:event.target.value}))} /></DoloresField>
        <DoloresField label="Trạng thái hóa đơn"><select aria-label="Trạng thái hóa đơn" className="bg-transparent text-sm outline-none" value={status} onChange={event=>{setStatus(event.target.value as BillStatus);setDialog(null);}}>{BILL_STATUSES.map(value=><option key={value}>{value}</option>)}</select></DoloresField>
      </DoloresFieldGrid></DoloresPanel>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog==='success'} title={dialog==='success' ? 'Đã ghi nhận trên bản xem trước' : 'Xác nhận · Xử lý số ly gửi về muộn'} message={action + '. ' + bill.id + ' · ' + values.cups + ' · ' + values.amount} onCancel={()=>setDialog(null)} onConfirm={()=>dialog==='success' ? setDialog(null) : save()} />}
  </>;
}

function InvoiceHistory() {
  const { record } = useDemoRecord('moderator:HD-09-204:late-cups');
  const rows: Row[] = [['HD-09-204', 'v1', '30/09/2026', 'Phát hành kỳ tháng 09', 'Đã gửi']];
  try {
    const history: unknown = JSON.parse(record?.payload.history ?? '[]');
    let invoiceVersion = 1;
    if (Array.isArray(history)) history.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return;
      const item = entry as Record<string, unknown>;
      if (item.bill !== 'HD-09-204' || typeof item.cups !== 'string' || typeof item.receivedDate !== 'string') return;
      if (item.action === 'recalculated') invoiceVersion += 1;
      rows.unshift([item.bill, 'v' + invoiceVersion, item.receivedDate, item.cups + ' · ' + String(item.amount ?? ''), item.action === 'recalculated' ? 'Tính lại · bản demo mới' : 'Cộng kỳ sau · giữ bản đã chốt']);
    });
  } catch { /* Malformed history cannot replace the issued fixture. */ }
  return <SceneTable title="Lịch sử phiên bản hóa đơn" description="Theo dõi các bản hóa đơn đã phát hành và thay đổi." headers={['Hóa đơn','Phiên bản','Ngày','Thay đổi','Trạng thái']} rows={rows} actions={[["Mở đối soát", PATH_MODERATOR.invoiceReconcile, "primary"], ["Về hóa đơn", PATH_MODERATOR.invoices, "secondary"]]} />;
}

function InvoicesList() {
  return <SceneTable title="Hóa đơn định kỳ & đối soát" description="Theo dõi chứng từ, khoản nhận, phần thiếu hoặc thừa và hóa đơn quá hạn." headers={["Khách hàng", "Kỳ bill", "Số tiền", "Chứng từ / đối soát", "Trạng thái", "Xem"]} rows={[
    ["Cà phê Mộc", "09/2026", "2.750.000 đ", "1.750.000 đ · có chứng từ", "Chờ đối soát", <Link href={PATH_MODERATOR.invoiceReconcile} key="m21">Đối soát ›</Link>],
    ["Cà phê Mộc", "09/2026", "1.500.000 đ", "Nhận 1.700.000 đ", "Thừa 200.000 đ", <Link href={PATH_MODERATOR.invoiceExcess} key="m23">Hoàn thừa ›</Link>],
    ["Góc Phố", "08/2026", "1.200.000 đ", "Chưa nhận đủ", "Quá hạn", <Link href={PATH_MODERATOR.invoiceOverdue} key="m34">Mở ›</Link>],
  ]} actions={[["Đối soát chứng từ", PATH_MODERATOR.invoiceReconcile, "primary"], ["PAYG", PATH_MODERATOR.invoicePayg, "secondary"], ["Lịch sử phiên bản", PATH_MODERATOR.invoiceHistory, "secondary"]]} />;
}

function RepairHistory() {
  const { record } = useDemoRecord('technician:repair:CF-STD-026');
  const fields = Object.fromEntries(readDemoFields(record));
  const rows: Row[] = record ? [['Bản demo đã lưu', 'CF-STD-026', fields['Mô tả công việc'] ?? '', fields['Linh kiện thay'] ?? '', (fields['Giá'] ?? '') + ' · ' + (fields['Ghi chú lịch sử'] ?? '')]] : [['01/10/2026', 'S-018', 'Kiểm tra kết nối', 'Không ghi nhận', 'Đã gửi YC-017']];
  return <SceneTable title="Lịch sử sửa chữa, bảo trì & linh kiện" description="Xem kết quả Technician đã gửi theo từng thiết bị." headers={['Ngày','Máy','Công việc','Linh kiện','Kết quả Technician']} rows={rows} actions={[["Yêu cầu kỹ thuật", PATH_MODERATOR.technicalRequests, "primary"]]} />;
}

function MachineScreens({ path }: { path: string }) {
  const machineS022: MachineDisplayModel = { displayId: "S-022", kind: "smart", typeLabel: "Smart IoT", status: { label: "Sẵn sàng", tone: "plain" } };
  const machineS018: MachineDisplayModel = { displayId: "S-018", kind: "smart", typeLabel: "Smart IoT", status: { label: "Đang sử dụng", tone: "plain" } };
  const machineC031: MachineDisplayModel = { displayId: "C-031", kind: "standard", typeLabel: "Máy thường", status: { label: "Đang sử dụng", tone: "plain" } };
  const machineC034: MachineDisplayModel = { displayId: "C-034", kind: "standard", typeLabel: "Máy thường" };

  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machines || getCentralizedModeratorPath(path) === PATH_MODERATOR.machinesList) return <SceneTable title="Máy & tồn kho" description="Quản lý máy trong kho, máy đang cho thuê, cho mượn và hồ sơ sửa chữa." headers={["Mã máy", "Loại", "Khách hàng / vị trí", "Hợp đồng", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={PATH_MODERATOR.machineDetail("S-022")} key="s022"><MachineIdentityLabel machine={machineS022} /></Link>, <MachineTypeLabel key="type" machine={machineS022} />, "Kho Dolores", "—", <MachineStatusLabel key="status" status={machineS022.status} />, "Chi tiết"],
    [<MachineIdentityLabel key="id" machine={machineS018} />, <MachineTypeLabel key="type" machine={machineS018} />, "Cà phê Mộc", "C-204", <MachineStatusLabel key="status" status={machineS018.status} />, <Link href={PATH_MODERATOR.iotMachines} key="iot">Smart IoT</Link>],
    [<MachineIdentityLabel key="id" machine={machineC031} />, <MachineTypeLabel key="type" machine={machineC031} />, "Cà phê Mộc", "C-205", <MachineStatusLabel key="status" status={machineC031.status} />, "Hồ sơ máy"],
  ]} actions={[["Máy chưa cho thuê", PATH_MODERATOR.machineStock, "primary"], ["Máy của khách hàng", PATH_MODERATOR.machineCustomer, "secondary"], ["Máy cho mượn", PATH_MODERATOR.machineLoans, "secondary"], ["Lịch sử sửa chữa", PATH_MODERATOR.machineRepairHistory, "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineCustomer) return <SceneTable title="Máy của Nguyễn Minh Anh" description="Thiết bị của khách hàng và trạng thái theo hợp đồng." headers={["Mã máy", "Loại", "Hợp đồng", "Cửa hàng / vị trí", "Trạng thái", "Mở"]} rows={[
    [<MachineIdentityLabel key="id" machine={machineS018} />, <MachineTypeLabel key="type" machine={machineS018} />, "C-204", "Cà phê Mộc · Quận 3", <MachineStatusLabel key="status" status={{ label: "Đang thuê", tone: "plain" }} />, <Link href={PATH_MODERATOR.iotMachines} key="smart">Dữ liệu Smart ›</Link>],
    [<MachineIdentityLabel key="id" machine={machineC031} />, <MachineTypeLabel key="type" machine={machineC031} />, "C-205", "Cà phê Mộc · Quận 3", <MachineStatusLabel key="status" status={{ label: "Đang thuê", tone: "plain" }} />, <Link href={PATH_MODERATOR.contractDetail("C-205")} key="std">Hồ sơ ›</Link>],
    [<MachineIdentityLabel key="id" machine={machineS022} />, <MachineTypeLabel key="type" machine={{ ...machineS022, typeLabel: "Smart IoT · máy thay" }} />, "C-204", "Đã trả", <MachineStatusLabel key="status" status={{ label: "Đã kết thúc", tone: "plain" }} />, <Link href={PATH_MODERATOR.machineLoans} key="loan">Lịch sử ›</Link>],
  ]} actions={[["Hồ sơ khách hàng", PATH_MODERATOR.customerDetail("nguyen-minh-anh"), "primary"], ["Danh sách máy", PATH_MODERATOR.machines, "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineStock) return <SceneTable title="Máy trong kho · chưa cho thuê" description="Xem máy theo loại và tình trạng sẵn sàng." headers={["Mã máy", "Loại máy", "Nguồn nhập", "Tình trạng", "Thao tác"]} rows={[
    [<MachineIdentityLabel key="id" machine={machineS022} />, <MachineTypeLabel key="type" machine={machineS022} />, "Kho Dolores", <MachineStatusLabel key="status" status={{ label: "Sẵn sàng cho thuê", tone: "plain" }} />, <Link href={PATH_MODERATOR.machineDetail("S-022")} key="detail">Hồ sơ ›</Link>],
    [<MachineIdentityLabel key="id" machine={machineC034} />, <MachineTypeLabel key="type" machine={machineC034} />, "Tồn kho", <MachineStatusLabel key="status" status={{ label: "Chờ kiểm tra", tone: "plain" }} />, "Mở hồ sơ"],
  ]} actions={[["Máy & tồn kho", PATH_MODERATOR.machines, "primary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineLoans) return <SceneTable title="Máy cho mượn & lịch sử sử dụng" description="Theo dõi máy tạm, hợp đồng chính và thời gian sử dụng." headers={["Máy tạm", "Loại", "Hợp đồng chính", "Bàn giao", "Trả máy"]} rows={[[<MachineIdentityLabel key="id" machine={machineS022} />, <MachineTypeLabel key="type" machine={machineS022} />, "C-204 · S-018", "12/09/2026", "Đã trả 12/09/2026"]]} actions={[["Gán máy thay", PATH_MODERATOR.machineSubstitute, "primary"], ["Danh sách máy", PATH_MODERATOR.machines, "secondary"]]} notice={["Máy thay cùng loại", "Ghép Smart IoT với Smart IoT và máy thường với máy thường; usage vẫn tính theo hợp đồng chính."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineRepairHistory) return <RepairHistory />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineSubstitute) return <ActionForm title="Máy thay thế & phân bổ số ly" description="Gán máy thay tạm cùng loại vào hợp đồng chính." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "select"], ["Kỳ sử dụng", "Theo hợp đồng", "text"], ["Ngày bàn giao", "Chọn ngày", "text"]]} recordKey="C-204-substitute" action="Ghi nhận máy thay thế" returnHref={PATH_MODERATOR.machineLoans} notice={["Không tạo hợp đồng mới", "Usage máy thay được gộp vào hợp đồng chính theo kỳ."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineSubstituteReturn) return <ActionForm title="Kết thúc sử dụng máy thay" description="Ghi nhận trả máy thay thế tạm thời về kho." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "text"], ["Ngày trả", "12/09/2026", "text"], ["Usage theo kỳ", "Gộp vào C-204", "text"]]} recordKey="C-204-substitute-return" action="Ghi nhận trả máy thay" returnHref={PATH_MODERATOR.machineLoans} notice={["Đúng loại thiết bị", "Máy Smart IoT được trả về kho Smart IoT; usage tiếp tục gắn với hợp đồng chính."]} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.machines + "/")) {
    const machine: MachineDisplayModel = {
      displayId: path.split("/")[1],
      kind: "smart",
      typeLabel: "Smart IoT",
      status: { label: "Sẵn sàng cho thuê", tone: "plain" },
    };
    return <DoloresPage title={`Hồ sơ máy ${machine.displayId}`} description="Thông tin thiết bị và lịch sử gắn với hợp đồng." actions={<ActionBar items={[["Máy & tồn kho", PATH_MODERATOR.machines, "primary"], ["Lịch sử sửa chữa", PATH_MODERATOR.machineRepairHistory, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Mã máy"><MachineIdentityLabel machine={machine} /></DoloresField><DoloresField label="Loại máy"><MachineTypeLabel machine={machine} /></DoloresField><DoloresField label="Trạng thái"><MachineStatusLabel status={machine.status} /></DoloresField><DoloresField label="Lịch sử" value="Chưa ghi nhận cho thuê trong bản demo" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  }
  return <MachineScreens path="machines" />;
}

function IoTScreens({ path }: { path: string }) {
  const customerHref = PATH_MODERATOR.iotCustomer;
  return <DoloresPage title={getCentralizedModeratorPath(path) === PATH_MODERATOR.iotMachines ? "Chi tiết dữ liệu & mô hình máy" : "Giám sát Smart IoT · theo khách hàng"} description="Chỉ thiết bị Smart IoT có dữ liệu vận hành trực tiếp; máy thường chỉ hiển thị vị trí theo hợp đồng." actions={<ActionBar items={[["Danh sách máy Smart", PATH_MODERATOR.iotMachines, "primary"], ["Hồ sơ khách hàng", customerHref, "secondary"]]} />}>
    <DoloresPanel><DoloresPanelTitle>{getCentralizedModeratorPath(path) === PATH_MODERATOR.iotMachines ? "S-018 · dữ liệu gần nhất" : "Khách hàng có máy Smart"}</DoloresPanelTitle>{getCentralizedModeratorPath(path) === PATH_MODERATOR.iotMachines ? <div className="grid grid-cols-3 gap-4"><DoloresMetric label="Trạng thái kết nối" value="Theo dữ liệu gần nhất" /><DoloresMetric label="Số ly trong kỳ" value="1.000" /><DoloresMetric label="Menu / phiên bản" value="Mùa hè · v3" /></div> : <DoloresTable headers={["Khách hàng", "Máy Smart", "Cửa hàng", "Dữ liệu", "Mở"]} rows={[["Nguyễn Minh Anh", "S-018", "Cà phê Mộc", "Đã đồng bộ 09:42", <Link href={PATH_MODERATOR.iotMachines} key="open">Chi tiết ›</Link>]]} />}</DoloresPanel>
    <DoloresNotice title="Giới hạn dữ liệu">Số liệu hiển thị là dữ liệu demo. Không thay đổi trạng thái máy hoặc gửi lệnh IoT từ bản frontend này.</DoloresNotice>
  </DoloresPage>;
}

function TechnicalScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.technicalRequests || getCentralizedModeratorPath(path) === PATH_MODERATOR.technicalRequestsList) return <SceneTable title="Yêu cầu kỹ thuật & kết quả" description="Theo dõi yêu cầu được gửi đến Technician và kết quả đã báo." headers={["Mã", "Máy / cửa hàng", "Công việc", "Technician", "Trạng thái", "Kết quả"]} rows={[
    ["YC-017", "S-018 · Cà phê Mộc", "Thu hồi & đánh giá", "Nguyễn Văn Nam", "Đã báo kết quả", <Link href={PATH_MODERATOR.technicalRequestDetail("YC-017")} key="r17">Mở ›</Link>],
    ["YC-018", "S-030 · Cà phê Mộc", "Sửa lỗi kết nối", "Nguyễn Văn Nam", "Đang xử lý", "Chờ báo cáo"],
    ["YC-019", "MB-017", "Đánh giá máy thu mua", "Chưa giao", "Chờ điều phối", "—"],
  ]} actions={[["Gửi yêu cầu mới", PATH_MODERATOR.newTechnicalRequest, "primary"], ["Kết quả thu hồi YC-017", PATH_MODERATOR.technicalRequestDetail("YC-017"), "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.technicalRequestDetail("YC-017")) return <TechResult />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.newTechnicalRequest) return <DoloresPage title="Gửi yêu cầu cho Technician" description="Chọn đúng loại công việc để mở biểu mẫu phù hợp." actions={<DoloresButton href={PATH_MODERATOR.technicalRequests}>Về yêu cầu kỹ thuật</DoloresButton>}><DoloresPanel><DoloresPanelTitle>Loại công việc</DoloresPanelTitle><div className="grid grid-cols-2 gap-4">{[["Lắp đặt máy thường", "install-standard"], ["Lắp đặt & kích hoạt Smart IoT", "install-smart"], ["Sửa chữa / lỗi kết nối", "repair"], ["Thu hồi & đánh giá", "retrieval"], ["Đánh giá máy khách đề nghị bán", "buyback"], ["Thu gom máy đã thu mua", "collection"]].map(([label, slug]) => <DoloresButton key={slug} href={PATH_MODERATOR.technicalRequestType(slug)} variant="secondary">{label}</DoloresButton>)}</div></DoloresPanel></DoloresPage>;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.newTechnicalRequest + "/")) {
    const kind = path.slice("technical-requests/new/".length);
    const label = ({ "install-standard": "Lắp đặt máy thường", "install-smart": "Lắp đặt & kích hoạt Smart IoT", repair: "Sửa chữa / lỗi kết nối", retrieval: "Thu hồi & đánh giá", buyback: "Đánh giá máy khách đề nghị bán", collection: "Thu gom máy đã thu mua" } as Record<string, string>)[kind] ?? "Gửi yêu cầu cho Technician";
    const isSmart = kind === "install-smart";
    return <ActionForm title={`Gửi yêu cầu: ${label}`} description="Ghi nhận đúng thông tin thiết bị, hợp đồng và công việc cần thực hiện." fields={[["Loại công việc", label, "text"], ["Hợp đồng / hồ sơ", isSmart ? "C-204" : "Chọn hồ sơ liên quan", "select"], ["Máy", isSmart ? "S-018 · Smart IoT" : "Chọn máy", "select"], ["Địa điểm", "Cà phê Mộc · Quận 3", "text"], ["Ghi chú", "Nhập mô tả công việc", "text"]]} recordKey={`M19-${kind}`} action="Gửi yêu cầu cho Technician" returnHref={PATH_MODERATOR.technicalRequests} nextHref={PATH_MODERATOR.technicalRequests} notice={isSmart ? ["Bàn giao Smart IoT", "Chỉ xác nhận kích hoạt sau khi Technician báo hoàn tất và thiết bị xác nhận trạng thái."] : undefined} />;
  }
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.machineHistoryDetail("S-018")) return <DoloresPage title="Chi tiết lịch sử sửa chữa / bảo trì" description="Lịch sử xử lý thiết bị S-018 · C-204." actions={<ActionBar items={[["Danh sách lịch sử máy", PATH_MODERATOR.machineHistory, "primary"], ["Yêu cầu kỹ thuật", PATH_MODERATOR.technicalRequests, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Ghi nhận Technician</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Ngày" value="01/10/2026" /><DoloresField label="Mã máy / hợp đồng" value="S-018 · C-204" /><DoloresField label="Loại công việc" value="Thu hồi & đánh giá" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Tình trạng" value="Đã thu hồi · có hư hại vỏ" /><DoloresField label="Kết quả" value="Đã báo Moderator" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <SceneTable title="Lịch sử bảo trì & sửa chữa" description="Lọc và mở lịch sử công việc theo máy." headers={["Ngày", "Mã máy", "Khách hàng", "Loại", "Trạng thái", "Chi tiết"]} rows={[["01/10/2026", "S-018", "Cà phê Mộc", "Thu hồi / đánh giá", "Đã ghi nhận", <Link href={PATH_MODERATOR.machineHistoryDetail("S-018")} key="s18">Chi tiết ›</Link>], ["12/09/2026", "C-031", "Cà phê Mộc", "Sửa chữa", "Hoàn tất", <Link href={PATH_MODERATOR.machineHistoryDetail("S-018")} key="c31">Mở hồ sơ ›</Link>]]} actions={[["Yêu cầu kỹ thuật", PATH_MODERATOR.technicalRequests, "primary"], ["Cảnh báo", PATH_MODERATOR.notifications, "secondary"]]} />;
}

function TechResult() {
  const { record } = useDemoRecord("technician:retrieval:YC-017");
  const assessed = isRetrievalAssessment(record);
  return <DoloresPage title="Kết quả Technician · YC-017" description="Kết quả thu hồi máy và đánh giá được gửi từ Technician." actions={<ActionBar items={[["Mở giao diện Technician", PATH_TECHNICIAN.taskDetail("YC-017"), "primary"], ["Hợp đồng C-204", PATH_MODERATOR.contractDetail("C-204"), "secondary"], ["Danh sách yêu cầu", PATH_MODERATOR.technicalRequests, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thu hồi & đánh giá máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng" value="C-204" /><DoloresField label="Máy" value="S-018 · Smart IoT" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Trạng thái" value={assessed ? "Đã gửi kết quả từ màn Technician trong trình duyệt này" : "Đang chờ Technician gửi kết quả"} /><DoloresField label="Tình trạng" value={assessed ? (record?.payload.damage === "yes" ? "Có hư hỏng · " : "Không hư hỏng · ") + record?.payload.notes : "Chưa có kết quả"} /><DoloresField label="Chứng cứ" value="Ảnh / dữ liệu chưa đồng bộ" /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Bước quyết toán">{assessed ? "Kết quả demo đã nhận. Kiểm tra hồ sơ và xử lý quyết toán theo hợp đồng; không thực hiện thanh toán trong giao diện frontend." : "Chưa mở quyết toán. Gửi YC-017 qua Technician trước khi xử lý tiền cọc."}</DoloresNotice>{assessed && <DoloresButton href={PATH_MODERATOR.contractSettlement}>Mở quyết toán sau đánh giá</DoloresButton>}</DoloresPage>;
}

function InvoiceReconcileScreen() {
  const [dialog, setDialog] = useState<"confirm" | "success" | "preview" | null>(null);

  return <>
    <DoloresPage
      title="Đối soát chứng từ thanh toán"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<>
        <DoloresButton onClick={() => setDialog("confirm")}>Xác nhận khoản đã nhận</DoloresButton>
        <DoloresButton href={PATH_MODERATOR.invoiceShortfall} variant="secondary">Yêu cầu thanh toán thiếu</DoloresButton>
        <DoloresButton href={PATH_MODERATOR.invoiceExcess} variant="secondary">Trường hợp tiền thừa</DoloresButton>
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
        <DoloresButton href={PATH_MODERATOR.invoiceShortfall}>Xem yêu cầu và tiến trình</DoloresButton>
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
  const { record: assessment } = useDemoRecord("technician:retrieval:YC-017");
  const technicianDone = isRetrievalAssessment(assessment);
  const { record: settlement } = useDemoRecord("moderator:C-204-settlement");
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  return <>
    <DoloresPage title="Quyết toán & hoàn cọc sau đánh giá" description="Xử lý riêng tiền đặt cọc sau khi Technician đã thu hồi và gửi đánh giá máy." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>Ghi nhận quyết toán</DoloresButton><DoloresButton href={PATH_MODERATOR.technicalRequestDetail("YC-017")} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={PATH_MODERATOR.contracts} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>C-204 · S-018</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận từ Technician · demo trình duyệt" : "Chưa có kết quả Technician"} /><DoloresField label="Đánh giá máy" value={technicianDone ? assessment?.payload.notes ?? "Đã báo · kiểm tra hồ sơ trước khi quyết toán" : "Đang chờ đánh giá"} /><DoloresField label="Tiền đặt cọc" value="Theo hồ sơ hợp đồng" /><DoloresField label="Trạng thái quyết toán" value={settlement?.status === "recorded-demo" ? "Đã ghi nhận trên bản xem trước" : "Chưa quyết toán"} /></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title={technicianDone ? "Kết quả đã có · frontend demo" : "Chờ bước Technician"}>{technicianDone ? "Có thể ghi nhận quyết toán sau khi kiểm tra hồ sơ. Thao tác này chỉ lưu trạng thái cục bộ, không chuyển tiền." : "Mở nhiệm vụ YC-017 ở Technician và gửi kết quả thu hồi/đánh giá trước. Chưa cho phép tiếp tục quyết toán."}</DoloresNotice>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận trên bản xem trước" : "Xác nhận quyết toán C-204?"} message={dialog === "success" ? "Trạng thái cục bộ đã được lưu. Không có giao dịch hoàn cọc nào được thực hiện." : "Kiểm tra kết quả Technician và điều khoản hợp đồng trước khi ghi nhận."} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { if (!isRetrievalAssessment(readDemoRecord("technician:retrieval:YC-017"))) { setDialog(null); return; } if (writeDemoRecord("moderator:C-204-settlement", "recorded-demo", { contract: "C-204", machine: "S-018", notes: assessment?.payload.notes ?? "" })) setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function DepositActionScreen({ path }: { path: string }) {
  const config = getCentralizedModeratorPath(path) === PATH_MODERATOR.contractCompensation
    ? { title: "Bồi thường vượt tiền đặt cọc", action: "Ghi nhận khoản bồi thường", key: "C-204-compensation", note: "Khoản vượt tiền đặt cọc được xử lý theo điều khoản và kết quả đánh giá; không tự tính mức phạt." }
    : getCentralizedModeratorPath(path) === PATH_MODERATOR.contractRefundGood
      ? { title: "Hoàn cọc · máy được đánh giá tốt", action: "Ghi nhận hoàn cọc", key: "C-204-refund-good", note: "Hoàn cọc là khoản riêng; chỉ ghi nhận sau khi đã xem kết quả Technician và thỏa thuận." }
      : { title: "Ghi nhận hoàn cọc", action: "Ghi nhận hoàn cọc", key: "C-204-deposit-refund", note: "Không gộp hoàn cọc với hoàn tiền thanh toán thừa hoặc thu khoản thiếu." };
  const { record: assessment } = useDemoRecord("technician:retrieval:YC-017");
  const technicianDone = isRetrievalAssessment(assessment);
  const { record: settlement } = useDemoRecord("moderator:C-204-settlement");
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  return <>
    <DoloresPage title={config.title} description="C-204 · S-018 · ghi nhận theo hồ sơ sau khi Technician báo kết quả." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>{config.action}</DoloresButton><DoloresButton href={PATH_MODERATOR.technicalRequestDetail("YC-017")} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={PATH_MODERATOR.contracts} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin quyết toán</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng / máy" value="C-204 / S-018" /><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận · demo trình duyệt" : "Chưa có kết quả Technician"} /><DoloresField label="Tiền đặt cọc" value="Theo hợp đồng" /><DoloresField label="Số tiền" value="Theo kết quả đánh giá và thỏa thuận" /></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title={technicianDone ? "Kiểm tra hồ sơ trước khi ghi nhận" : "Chờ bước Technician"}>{technicianDone ? `${config.note} Bản frontend chỉ lưu trạng thái xem trước, không chuyển tiền.` : "Gửi kết quả thu hồi và đánh giá từ Technician trước; chưa mở ghi nhận khoản tiền."}</DoloresNotice>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận trên bản xem trước" : `Xác nhận · ${config.title}`} message={dialog === "success" ? "Không có giao dịch tài chính thật nào được thực hiện." : `${config.action}. Kiểm tra kết quả Technician và hồ sơ hợp đồng.`} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { if (!isRetrievalAssessment(readDemoRecord("technician:retrieval:YC-017"))) { setDialog(null); return; } if (writeDemoRecord("moderator:" + config.key, "recorded-demo", { contract: "C-204", machine: "S-018" })) setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function MenuScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menu || getCentralizedModeratorPath(path) === PATH_MODERATOR.menuItems) return <SceneTable title="Global Menu mùa hè · các món" description="Quản lý món và công thức dùng chung trong Global Menu Dolores." headers={["Món", "Danh mục", "Thành phần / định lượng", "Trạng thái", "Thao tác"]} rows={[["Espresso", "Cà phê", "18 g cà phê · 40 ml nước", "Đang áp dụng", <Link href={PATH_MODERATOR.menuEspresso} key="espresso">Chỉnh ›</Link>], ["Cà phê sữa tươi", "Cà phê", "18 g cà phê · sữa tươi", "Đang áp dụng", <Link href={PATH_MODERATOR.menuAdd} key="add">Chi tiết ›</Link>]]} actions={[["Thêm món", PATH_MODERATOR.menuAdd, "primary"], ["Thành phần", PATH_MODERATOR.menuIngredients, "secondary"], ["Gửi menu xuống máy Smart", PATH_MODERATOR.menuSend, "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menuIngredients) return <SceneTable title="Thành phần món" description="Theo dõi định lượng theo đơn vị thành phần." headers={["Món", "Cà phê", "Nước", "Sữa tươi", "Kiểm tra"]} rows={[["Espresso", "18 g", "40 ml", "—", "Đủ"], ["Cà phê sữa tươi", "18 g", "—", "120 ml", "Đủ"]]} actions={[["Danh sách món", PATH_MODERATOR.menu, "primary"], ["Thêm món", PATH_MODERATOR.menuAdd, "secondary"]]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menuSend) return <ActionForm title="Gửi menu đến máy Smart" description="Chọn Global Menu và các máy Smart đích." fields={[["Global Menu", "Mùa hè · v3", "select"], ["Máy đích", "Chọn máy Smart IoT", "select"], ["Trạng thái gửi", "Chưa gửi", "text"]]} recordKey="global-menu-send" action="Gửi menu" returnHref={PATH_MODERATOR.menu} nextHref={PATH_MODERATOR.menuSent} notice={["Chờ xác nhận từ thiết bị", "Gửi thành công chỉ là trạng thái chờ. Chỉ hiển thị đã áp dụng sau khi máy xác nhận."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menuSent) return <SceneTable title="Trạng thái gửi Global Menu" description="Theo dõi trạng thái gửi và xác nhận áp dụng từ máy." headers={["Máy", "Global Menu", "Gửi lúc", "Trạng thái"]} rows={[["S-018", "Mùa hè · v3", "02/10/2026", "Đang chờ xác nhận từ máy"]]} actions={[["Về danh sách menu", PATH_MODERATOR.menu, "primary"]]} notice={["Không đánh dấu áp dụng sớm", "Chỉ xác nhận áp dụng sau khi nhận acknowledgement từ thiết bị."]} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menuAddMissing) return <MenuMissingIngredient />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.menuAdd) return <ActionForm title="Thêm món · Cà phê sữa tươi" description="Nhập công thức theo đúng thành phần máy hỗ trợ." fields={[["Tên món", "Cà phê sữa tươi", "text"], ["Cà phê", "18 g", "text"], ["Sữa tươi", "120 ml", "text"], ["Nước pha", "Theo thiết bị", "text"]]} recordKey="menu-add-milk" action="Lưu món" returnHref={PATH_MODERATOR.menu} notice={["Thành phần bắt buộc", "Món cà phê sữa tươi cần có thành phần sữa tươi."]} />;
  const is20g = path.endsWith("20g");
  const is60ml = path.endsWith("60");
  return <ActionForm title={`Chỉnh công thức Espresso${is60ml ? " · nước pha 60 ml" : is20g ? " · cà phê 20 g" : ""}`} description="Sửa công thức Global Menu theo định lượng nguồn." fields={[["Cà phê", is20g ? "20 g" : "18 g", "text"], ["Nước pha", is60ml ? "60 ml" : "40 ml", "text"]]} recordKey="espresso-recipe" action="Lưu công thức Espresso" returnHref={PATH_MODERATOR.menu} />;
}

function MenuMissingIngredient() {
  const [milk, setMilk] = useState("");
  const [invalid, setInvalid] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { const record = readDemoRecord("moderator:menu-add-milk"); if (record && positiveQuantity(record.payload["field-2"] ?? "")) { setMilk(record.payload["field-2"]); setInvalid(false); } }, []);
  if (saved) return <DoloresPage title="Đã lưu món Cà phê sữa tươi" description="Đã lưu trên bản xem trước · dữ liệu minh họa." actions={<DoloresButton href={PATH_MODERATOR.menu}>Về danh sách món</DoloresButton>}><DoloresNotice title="Dữ liệu minh họa">Không có Global Menu thật nào được cập nhật.</DoloresNotice></DoloresPage>;
  return <>
    <DoloresPage title="Thêm món · thiếu thành phần bắt buộc" description="Global Menu mùa hè · thêm món Cà phê sữa tươi." actions={<><DoloresButton onClick={() => { if (!positiveQuantity(milk)) setInvalid(true); else { setInvalid(false); setDialog(true); } }}>Lưu món</DoloresButton><DoloresButton href={PATH_MODERATOR.menu} variant="secondary">Về danh sách món</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thành phần của món</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Tên món" value="Cà phê sữa tươi" /><DoloresField label="Cà phê" value="18 g" /><DoloresField label="Sữa tươi *" required><input aria-label="Sữa tươi bắt buộc" className="bg-transparent text-sm outline-none" value={milk} onChange={(event) => { setMilk(event.target.value); setInvalid(!positiveQuantity(event.target.value)); }} /></DoloresField><DoloresField label="Nước pha" value="Theo công thức máy" /></DoloresFieldGrid></DoloresPanel>
      {invalid && <DoloresNotice title="Thiếu thành phần bắt buộc" tone="warning">Món cà phê sữa tươi cần có định lượng sữa tươi. Chưa lưu công thức.</DoloresNotice>}
    </DoloresPage>
    {dialog && <DecisionDialog title="Xác nhận · Lưu món Cà phê sữa tươi" message={`Sữa tươi: ${milk}. Kiểm tra thành phần trước khi lưu vào Global Menu.`} onCancel={() => setDialog(false)} onConfirm={() => { if (!positiveQuantity(milk)) { setInvalid(true); setDialog(false); return; } if (writeDemoRecord("moderator:menu-add-milk", "submitted-demo", { "field-0": "Cà phê sữa tươi", "field-1": "18 g", "field-2": milk, "field-3": "Theo thiết bị" })) { setDialog(false); setSaved(true); } }} />}
  </>;
}

function BuybackScreens({ path }: { path: string }) {
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.buyback || getCentralizedModeratorPath(path) === PATH_MODERATOR.buybackList) return <SceneTable title="Thu mua máy cũ" description="Theo dõi đề nghị bán, chứng từ, thu gom và đưa máy qua tân trang/kiểm thử." headers={["Mã hồ sơ", "Khách hàng", "Máy", "Chứng từ / phản hồi", "Thu gom", "Trạng thái"]} rows={[[<Link href={PATH_MODERATOR.buybackDetail("MB-2026-017")} key="mb">MB-2026-017</Link>, "Nguyễn Minh Anh", "MB-017", "Khách hàng đã xác nhận", "Chờ thu gom", "Chờ Technician"]]} actions={[["Mở đánh giá", PATH_MODERATOR.buybackDetail("MB-2026-017"), "primary"], ["Yêu cầu thu gom", PATH_MODERATOR.technicalRequestType("collection"), "secondary"]]} notice={["Phản hồi và điều phối độc lập", "Xác nhận chứng từ mua bán được theo dõi riêng với lịch thu gom; không chặn điều phối chỉ vì bước xác nhận còn chờ."]} />;
  if (getCentralizedModeratorPath(path).includes(PATH_MODERATOR.buybackDocuments)) return <ActionForm title="Chứng từ mua bán máy cũ" description="Ghi nhận chứng từ và phản hồi khách hàng cho hồ sơ MB-2026-017." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Giá mua", "Theo thỏa thuận", "text"], ["Chứng từ mua bán", "Chọn tệp", "file"], ["Khách hàng xác nhận", "Chờ phản hồi", "select"]]} recordKey="MB-2026-017-document" action="Ghi nhận hồ sơ" returnHref={PATH_MODERATOR.buyback} notice={["Theo dõi độc lập", "Trạng thái xác nhận chứng từ không tự quyết định lịch Technician thu gom."]} />;
  if (getCentralizedModeratorPath(path).includes(PATH_MODERATOR.buybackRefurbishment)) return <RefurbishmentScreen />;
  return <ActionForm title="Đánh giá máy mua cũ & thương lượng" description="Ghi nhận tình trạng thiết bị và mức giá thỏa thuận." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Máy", "MB-017", "text"], ["Tình trạng Technician", "Chưa có kết quả", "select"], ["Giá đề nghị", "Theo thỏa thuận", "text"], ["Chứng từ", "Chọn tệp", "file"]]} recordKey="MB-2026-017-assessment" action="Ghi nhận đánh giá" returnHref={PATH_MODERATOR.buyback} nextHref={PATH_MODERATOR.buybackDocuments} notice={["Đánh giá máy", "Thông tin tình trạng và kiểm thử do Technician báo; Moderator ghi nhận hồ sơ mua bán."]} />;
}

function RefurbishmentScreen() {
  const [technicianDone, setTechnicianDone] = useState(false);
  const [recorded, setRecorded] = useState(false);
  useEffect(() => {
    const update = () => { const result = readDemoRecord("technician:refurbishment:MB-017"); setTechnicianDone(result?.status === "refurbished-tested" && readDemoFields(result).some(([label, value]) => label === "Máy thu mua" && value.startsWith("MB-017"))); };
    update();
    window.addEventListener("dolores-demo-flow", update);
    return () => window.removeEventListener("dolores-demo-flow", update);
  }, []);
  return <DoloresPage title="Tân trang & nhập kho" description="Ghi nhận kết quả Technician sau khi máy được thu gom." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setRecorded(true)}>Ghi nhận kết quả tân trang</DoloresButton><DoloresButton href={PATH_TECHNICIAN.taskRefurbishment} variant="secondary">Mở công việc Technician</DoloresButton><DoloresButton href={PATH_MODERATOR.buyback} variant="secondary">Về thu mua máy cũ</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>MB-017 · MB-2026-017</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Thu gom" value={technicianDone ? "Đã nhận từ Technician · demo trình duyệt" : "Chờ kết quả Technician"} /><DoloresField label="Tân trang" value={technicianDone ? "Đã ghi kết quả tân trang và kiểm thử" : "Chưa hoàn tất"} /><DoloresField label="Trạng thái kho" value={recorded ? "Đã ghi nhận · bản xem trước" : "Chưa sẵn sàng cho thuê"} /></DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title={technicianDone ? "Có thể ghi nhận sau khi kiểm tra" : "Chờ Technician tân trang và kiểm thử"}>{technicianDone ? "Ghi nhận không đưa máy vào kho thật; thao tác chỉ thay đổi dữ liệu demo trong phiên." : "Chỉ sau khi Technician báo hoàn tất tân trang và kiểm thử mới mở bước Moderator ghi nhận."}</DoloresNotice>
  </DoloresPage>;
}

function Alerts() {
  return <SceneTable title="Cảnh báo & nhắc việc" description="Theo dõi cảnh báo hợp đồng, kết nối và trạng thái menu." headers={["Cảnh báo", "Khách hàng / máy", "Ngày", "Trạng thái", "Mở"]} rows={[["Mất kết nối / lỗi menu", "Cà phê Mộc · S-018", "02/10/2026", "Cần kiểm tra", <Link href={PATH_MODERATOR.iotMachines} key="iot">Mở ›</Link>], ["Hợp đồng sắp hết hạn", "C-204", "31/10/2026", "Chưa phản hồi", <Link href={PATH_MODERATOR.contractExpiry} key="exp">Mở ›</Link>]]} actions={[["Yêu cầu kỹ thuật", PATH_MODERATOR.technicalRequests, "primary"], ["Thông báo", PATH_MODERATOR.notifications, "secondary"]]} />;
}

function Notifications() {
  return <SceneTable title="Thông báo" description="Thông báo liên quan đến hợp đồng, thanh toán, máy và công việc." headers={["Nội dung", "Liên quan", "Ngày", "Trạng thái", "Mở"]} rows={[["Kết quả Technician YC-017", "S-018 · C-204", "01/10/2026", "Đã báo kết quả", <Link href={PATH_MODERATOR.technicalRequestDetail("YC-017")} key="yc">Mở ›</Link>], ["Hóa đơn HD-09-204 cần đối soát", "Cà phê Mộc", "30/09/2026", "Chờ xử lý", <Link href={PATH_MODERATOR.invoiceReconcile} key="bill">Mở ›</Link>], ["Menu S-018 chờ xác nhận", "Mùa hè · v3", "02/10/2026", "Đang chờ máy", <Link href={PATH_MODERATOR.menuSent} key="menu">Mở ›</Link>]]} actions={[["Cảnh báo & nhắc việc", PATH_MODERATOR.notificationAlerts, "primary"]]} />;
}

function TechRequestsAlias({ path }: { path: string }) { return <TechnicalScreens path={path} />; }

export function ModeratorSectionPage({ sections }: { sections: string[] }) {
  const path = sections.join("/");
  if (!path) return <Dashboard />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.contracts)) return <ContractScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.customers)) return <CustomerScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.invoices)) return <InvoiceScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.machines)) return <MachineScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.iot)) return <IoTScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.menu)) return <MenuScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.technicalRequests)) return <TechRequestsAlias path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.machineHistory)) return <TechnicalScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.buyback)) return <BuybackScreens path={path} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.notificationAlerts) return <Alerts />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.notifications) return <Notifications />;
  return <DoloresPage title="Không tìm thấy màn hình" description={`Đường dẫn ${getCentralizedModeratorPath(path)} chưa được ánh xạ.`} actions={<DoloresButton href={PATH_MODERATOR.root}>Về tổng quan</DoloresButton>}><DoloresNotice title="Không có frame tương ứng">Chọn một mục trong menu để tiếp tục.</DoloresNotice></DoloresPage>;
}
