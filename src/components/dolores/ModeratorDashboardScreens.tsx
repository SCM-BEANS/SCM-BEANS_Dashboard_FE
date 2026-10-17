"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import shellStyles from "@/components/dolores/DoloresShell.module.css";
import { MonthlyBars } from "@/components/dolores/DoloresOverviewPages";
import { DoloresDialog } from "@/components/dolores/DoloresDialog";
import { DoloresUpload } from "@/components/dolores/DoloresUpload";
import { DoloresMachineModelPanel, type MachineView } from "@/components/dolores/DoloresMachineModel";
import { DoloresButton, DoloresDetails, DoloresField, DoloresFieldGrid, DoloresMetric, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/components/dolores/DoloresUI";
import { isRetrievalAssessment, readDemoFields, readDemoRecord, useDemoRecord, writeDemoRecord, writeDemoFlow } from "@/components/dolores/demoFlowStore";

const BASE = "/moderator";
type Row = ReactNode[];

function ActionBar({ items }: { items: [string, string, "primary" | "secondary"][] }) {
  return <>{items.map(([label, href, variant]) => <DoloresButton key={href + label} href={href} variant={variant}>{label}</DoloresButton>)}</>;
}

function Dashboard() {
  const bars = [["76", "h-[70.506px]"], ["91", "h-[84.422px]"], ["83", "h-[77px]"], ["124", "h-[115.036px]"], ["110", "h-[102.048px]"], ["142", "h-[131.735px]"], ["132", "h-[122.458px]"], ["166", "h-[154px]"]] as const;
  return <DoloresPage title="Tổng quan hợp đồng & thanh toán" description="Việc ưu tiên cho Moderator: hợp đồng, hóa đơn, máy IoT và phản hồi khách." actions={<DoloresButton href={`${BASE}/invoices`}>Việc cần xử lý</DoloresButton>} showMobileActionsMenu={false}>
    <div className="dl-metrics grid grid-cols-4 gap-4">
      <DoloresMetric label="Hợp đồng hiệu lực" value="98" />
      <DoloresMetric label="Chứng từ chờ đối chiếu" value="12" />
      <DoloresMetric label="Smart IoT đang thuê" value="56" />
      <DoloresMetric label="Máy IoT còn trong kho" value="12" />
    </div>
    <DoloresPanel className="dl-customer-chart">
      <DoloresPanelTitle>Số ly Smart IoT theo tháng</DoloresPanelTitle>
      <p className="text-sm leading-[1.45] text-[#706561]">Ly hợp lệ đã đồng bộ</p>
      <MonthlyBars data={bars} labels={["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]} maxLabel="166" middleLabel="83" insetAxis />

    </DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Việc cần xử lý</DoloresPanelTitle><div className={shellStyles.overviewTimeline}>
      <div><h3>12 chứng từ thanh toán</h3><p>Tenant tải ảnh chuyển khoản; Moderator so khớp tài khoản công ty.</p></div>
      <div><h3>07 hợp đồng còn 1 tháng</h3><p>Gửi nhắc và ghi nhận quyết định kết thúc hoặc HĐ mới.</p></div>
      <div><h3>02 hồ sơ chờ Technician</h3><p>Hồ sơ thu hồi và đánh giá máy đang chờ kết quả.</p></div>
    </div></DoloresPanel>
  </DoloresPage>;
}

function SceneTable({ title, description, headers, rows, actions }: { title: string; description: string; headers: string[]; rows: Row[]; actions: [string, string, "primary" | "secondary"][];  }) {
  return <DoloresPage title={title} description={description} actions={<ActionBar items={actions} />}>

    <DoloresPanel><DoloresPanelTitle>{title}</DoloresPanelTitle><DoloresTable headers={headers} rows={rows} /></DoloresPanel>
  </DoloresPage>;
}

function DecisionDialog({ title, message, onCancel, onConfirm, success = false, nextHref }: { title: string; message: string; onCancel: () => void; onConfirm: () => void; success?: boolean; nextHref?: string }) {
  return <DoloresDialog labelledBy="moderator-dialog-title" onClose={onCancel}><section><p>{success ? "Đã hoàn tất" : "Xác nhận thông tin"}</p><h2 id="moderator-dialog-title">{title}</h2><p>{message}</p><div data-dialog-actions>{success ? <><DoloresButton onClick={onConfirm}>Đóng</DoloresButton>{nextHref && <DoloresButton href={nextHref} variant="secondary">Tiếp tục</DoloresButton>}</> : <><DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton><DoloresButton variant="secondary" onClick={onCancel}>Hủy</DoloresButton></>}</div></section></DoloresDialog>;
}

type FormField = [string, string, "text" | "file" | "select", string[]?];
const positiveQuantity = (value: string) => /^\d+(?:\.\d+)?(?:\s*(?:g|ml))?$/.test(value.trim()) && Number.parseFloat(value) > 0;

function ActionForm({ title, description, fields, recordKey, action, returnHref, nextHref }: { title: string; description: string; fields: FormField[]; recordKey: string; action: string; returnHref: string; nextHref?: string;  }) {
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

      <DoloresPanel><DoloresPanelTitle>Thông tin xử lý</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label,value,type,options],index) => {
        const id = 'field-' + index;
        const update = (value: string) => setLocalValues(current => ({...current,[id]:value}));
        return <DoloresField key={id} label={label} required={type === 'file' || label === 'Cà phê' || label === 'Sữa tươi'}>
          {type === 'file' ? <><input className="text-sm" type="file" aria-label={label} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? id + '-error' : undefined} onChange={event => { const file = event.target.files?.[0]; update(file?.name ?? ''); setLocalValues(current => ({...current,[id + '-type']:file?.type ?? '',[id + '-size']:String(file?.size ?? '')})); }} />{localValues[id] && <span className="text-xs text-[#706561]">{localValues[id]}</span>}</> : type === 'select' ? <select aria-label={label} className="bg-transparent text-sm outline-none" value={values[label]} onChange={event => update(event.target.value)}>{Array.from(new Set(options ?? [value, "Đã xác nhận", "Chờ xử lý", "Đã hoàn tất"])).map(option => <option key={option}>{option}</option>)}</select> : <input aria-label={label} aria-invalid={Boolean(errors[id])} aria-describedby={errors[id] ? id + '-error' : undefined} className="w-full bg-transparent text-sm outline-none" value={values[label]} onChange={event => update(event.target.value)} />}
          {errors[id] && <span id={id + '-error'} className="text-xs text-[#B81724]">{errors[id]}</span>}
        </DoloresField>;
      })}</DoloresFieldGrid></DoloresPanel>
      {Object.keys(errors).length > 0 && <p role="alert" className="text-sm font-medium text-[#B81724]">{missingMilk ? 'Món cà phê sữa tươi cần có định lượng sữa tươi. Chưa lưu công thức.' : 'Bổ sung thông tin được đánh dấu rồi gửi lại.'}</p>}
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === 'success'} nextHref={dialog === 'success' ? nextHref : undefined} title={dialog === 'success' ? 'Đã ghi nhận thông tin' : 'Xác nhận · ' + title} message={dialog === 'success' ? 'Đã lưu thông tin.' : action + '. ' + Object.entries(values).map(([label,value]) => label + ': ' + value).join(' · ')} onCancel={() => setDialog(null)} onConfirm={() => dialog === 'success' ? setDialog(null) : saveDemo()} />}
  </>;
}

const contractDefaults = [
  ["Tenant / cửa hàng", "Nguyễn Minh Anh / Cà phê Mộc"],
  ["Máy chính", "S-018 · Smart IoT"],
  ["Thời gian thuê", "01/04–31/10/2026"],
  ["Địa điểm lắp đặt", "Quận 3, TP. HCM"],
  ["Đặt cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"],
  ["Mức thuê Smart IoT", "750.000 đ/tháng + 1.000 đ/ly"],
  ["Offline tối đa theo thỏa thuận", "5 ngày · có thể thỏa thuận khác"],
  ["Điều kiện hạ tầng", "Đã được kiểm tra nội bộ"],
] as const;

function ContractCreatePage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [document, setDocument] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [dialog, setDialog] = useState<"confirm" | "success" | "error" | null>(null);
  const { record } = useDemoRecord("moderator:M02");
  const valueFor = (label: string, fallback: string) => values[label] ?? record?.payload[label] ?? fallback;
  const filename = document || record?.payload.document || "";
  const check = () => {
    const missing = !filename || contractDefaults.slice(0, 4).some(([label, fallback]) => !valueFor(label, fallback).trim());
    setInvalid(missing);
    setDialog(missing ? "error" : "confirm");
  };
  const save = () => {
    const payload = Object.fromEntries(contractDefaults.map(([label, fallback]) => [label, valueFor(label, fallback)]));
    if (writeDemoRecord("moderator:M02", "submitted-demo", { ...payload, document: filename }, (record?.version ?? 0) + 1)) setDialog("success");
  };
  const message = "Lưu hợp đồng C-204 đã ký bên ngoài, máy chính S-018, cọc 10.000.000 đ và điều khoản đã thỏa thuận.";
  return <>
    <DoloresPage title="Đàm phán & lập hợp đồng thuê" description="Ghi nhận thỏa thuận, ký ngoài hệ thống và tải bản đã ký lên hồ sơ." actions={<><DoloresButton className="lg:w-[149px]" onClick={check}>Lưu hồ sơ đã ký</DoloresButton><DoloresButton className="lg:w-[124px]" href={`${BASE}/contracts`} variant="secondary">Về hợp đồng</DoloresButton></>}>

      <DoloresPanel><DoloresPanelTitle>Thông tin hợp đồng</DoloresPanelTitle><DoloresFieldGrid>{contractDefaults.map(([label, fallback], index) => <DoloresField key={label} label={label} required={index < 4}><input className="w-full bg-transparent text-sm leading-[17px] outline-none" aria-label={label} aria-invalid={invalid && index < 4 && !valueFor(label, fallback).trim()} value={valueFor(label, fallback)} onChange={event => setValues(current => ({ ...current, [label]: event.target.value }))} /></DoloresField>)}</DoloresFieldGrid><div className="mt-4 max-lg:mt-3"><DoloresUpload label="Hợp đồng đã ký ngoài hệ thống" value={filename} invalid={invalid && !filename} onChange={file => setDocument(file?.name ?? "")} /></div></DoloresPanel>
      <DoloresPanel><DoloresPanelTitle>Điều khoản</DoloresPanelTitle><DoloresDetails fields={[["Ngày bắt đầu", "Theo thỏa thuận"], ["Giữa tháng", "Tính theo thời gian thuê"], ["Chữ ký", "Thực hiện ngoài Dolores"]]} /></DoloresPanel>

    </DoloresPage>
    {dialog && <DoloresDialog labelledBy="contract-create-title" onClose={() => setDialog(null)}><section>
      <p>{dialog === "success" ? "✓  Đã hoàn tất" : dialog === "error" ? "Cần bổ sung thông tin" : "Xác nhận thông tin"}</p>
      <h2 id="contract-create-title">{dialog === "success" ? "Đã ghi nhận thành công" : dialog === "error" ? "Chưa thể gửi thông tin" : "Xác nhận · Đàm phán & lập hợp đồng thuê"}</h2>
      <p>{dialog === "error" ? "Hồ sơ đang thiếu trường bắt buộc hoặc tài liệu đính kèm. Bổ sung thông tin được đánh dấu rồi gửi lại." : message}</p>
      <div data-dialog-actions>{dialog === "success" ? <DoloresButton href={`${BASE}/contracts/C-204`}>Xem hồ sơ hợp đồng</DoloresButton> : <><DoloresButton onClick={dialog === "error" ? () => setDialog(null) : save}>{dialog === "error" ? "Quay lại bổ sung" : "Xác nhận"}</DoloresButton><DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton></>}</div>
    </section></DoloresDialog>}
  </>;
}

function ContractRecordPage({ standard = false }: { standard?: boolean }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const id = standard ? "C-205" : "C-204";
  const signedDocument = `${id}-signed.pdf`;
  const contractFields: [string, ReactNode][] = standard ? [
    ["Khách hàng / shop", "Nguyễn Minh Anh / Cà phê Mộc"],
    ["Máy chính", "C-031 · Máy thường"],
    ["Thời hạn", "15/05–14/11/2026"],
    ["Giá thuê", "1.500.000 đ/tháng"],
    ["Đặt cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"],
    ["Hợp đồng bản ký", `${signedDocument} · ký bên ngoài`],
    ["Địa điểm hợp đồng", "Quận 3, TP. HCM"],
  ] : [
    ["Khách hàng / shop", "Nguyễn Minh Anh / Cà phê Mộc"],
    ["Máy chính", "S-018 · Smart IoT"],
    ["Thời hạn", "01/04–31/10/2026"],
    ["Giá thuê / phí ly", "750.000 đ/tháng + 1.000 đ/ly"],
    ["Đặt cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"],
    ["Hợp đồng bản ký", `${signedDocument} · ký bên ngoài`],
    ["Ngưỡng offline thỏa thuận", "5 ngày"],
    ["Địa điểm hợp đồng", "Quận 3, TP. HCM"],
  ];
  return <>
    <DoloresPage
      title={`Hồ sơ hợp đồng ${id}`}
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<><DoloresButton className="lg:w-[124px]" onClick={() => setPreviewOpen(true)}>Xem bản ký</DoloresButton>{standard ? <DoloresButton className="lg:w-[205px]" href={`${BASE}/contracts/handover/standard`} variant="secondary">Bàn giao máy thường</DoloresButton> : <><DoloresButton className="lg:w-[195.8px]" href={`${BASE}/contracts/retrieval`} variant="secondary">Kết thúc thông thường</DoloresButton><DoloresButton className="lg:w-[203.6px]" href={`${BASE}/contracts/early-termination`} variant="secondary">Chấm dứt sớm / vi phạm</DoloresButton><DoloresButton className="lg:w-[219.2px]" href={`${BASE}/contracts/new`} variant="secondary">Tạo hợp đồng mới độc lập</DoloresButton><DoloresButton className="lg:w-[205px]" href={`${BASE}/contracts/handover/smart`} variant="secondary">Bàn giao Smart IoT</DoloresButton></>}</>}
    >
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <DoloresDetails fields={contractFields} />
      </DoloresPanel>
    </DoloresPage>
    {previewOpen && <DoloresDialog labelledBy="standard-contract-preview-title" onClose={() => setPreviewOpen(false)}>
      <section>
        <p>Tài liệu trong hồ sơ</p>
        <h2 id="standard-contract-preview-title">Hồ sơ hợp đồng <span className={shellStyles.desktopOnlyContent}>C-204</span><span className={shellStyles.mobileOnlyContent}>{id}</span></h2>
        <p>Tài liệu được lưu để xem và đối chiếu với hồ sơ.</p>
        <div className={shellStyles.documentPreview}>
          <h3 className={shellStyles.mobileOnlyContent}>Tài liệu</h3>
          <p><span className={shellStyles.desktopOnlyContent}>C-204-signed.pdf</span><span className={shellStyles.mobileOnlyContent}>{signedDocument}</span></p>

        </div>
        <DoloresButton variant="secondary" onClick={() => setPreviewOpen(false)}>Đóng</DoloresButton>
      </section>
    </DoloresDialog>}
  </>;
}

function ContractHandoverPage({ smart }: { smart: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const fields = smart ? [["Khách hàng / cửa hàng", "Nguyễn Minh Anh · Cà phê Mộc"], ["Hợp đồng", "C-204"], ["Máy Smart IoT", "S-018"], ["Địa điểm hợp đồng", "Quận 3, TP. HCM"], ["Mạng tại điểm lắp", "Đạt theo điều kiện công ty"], ["Vị trí thiết bị", "GPS · vị trí giám sát"]] : [["Khách hàng / cửa hàng", "Nguyễn Minh Anh · Cà phê Mộc"], ["Hợp đồng", "C-205"], ["Máy bàn giao", "C-031"], ["Địa điểm hợp đồng", "Quận 3, TP. HCM"], ["Phí lắp đặt", "Theo hợp đồng"], ["Trạng thái bàn giao", "Đã lắp đặt"]];
  return <DoloresPage title={smart ? "Bàn giao & kích hoạt Smart IoT" : "Bàn giao & lắp đặt máy thường"} description={smart ? "Thông tin lắp đặt và kích hoạt máy Smart IoT." : "Thông tin lắp đặt và bàn giao máy thường."} actions={<><DoloresButton className={smart ? "lg:w-[211.4px]" : "lg:w-[219.2px]"} href={`${BASE}/technical-requests/new/${smart ? "install-smart" : "install-standard"}`}>{smart ? "Giao việc lắp Smart IoT" : "Giao việc lắp máy thường"}</DoloresButton><DoloresButton className={smart ? "lg:w-[125.6px]" : "lg:w-[188px]"} href={`${BASE}/${smart ? "iot" : "technical-requests"}`} variant="secondary">{smart ? "Xem giám sát" : "Xem kết quả bàn giao"}</DoloresButton></>}>

    <DoloresPanel><DoloresPanelTitle>{smart ? "Thông tin kích hoạt" : "Thông tin bàn giao"}</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, fallback]) => <DoloresField key={label} label={label}><input className="w-full bg-transparent text-sm leading-[17px] outline-none" aria-label={label} value={values[label] ?? fallback} onChange={event => setValues(current => ({ ...current, [label]: event.target.value }))} /></DoloresField>)}</DoloresFieldGrid></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>{smart ? "Dữ liệu Smart IoT" : "Thông tin máy thường"}</DoloresPanelTitle><DoloresDetails fields={smart ? [["Ly hợp lệ", "Máy báo bán thành công"], ["Mất mạng", "Máy lưu và tự đồng bộ"], ["Vị trí", "GPS trên thiết bị Edge"]] : [["Vị trí", "Theo hợp đồng"], ["GPS giám sát", "Không áp dụng"], ["Số ly / telemetry", "Không có"]]} />{smart && <div className="mt-4 max-lg:mt-3"><DoloresDetails fields={[["Global Menu Dolores", "Đã nhận & áp dụng · v3 (minh họa)"]]} /></div>}</DoloresPanel>

  </DoloresPage>;
}

function ContractScreens({ path }: { path: string }) {
  if (path === "contracts" || path === "contracts/list") return <SceneTable title="Danh sách hợp đồng thuê" description="Theo dõi loại máy, khách hàng, thời hạn và hồ sơ hợp đồng." headers={["Hợp đồng", "Khách hàng", "Loại bàn giao", "Thời hạn", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={`${BASE}/contracts/C-204`} key="c204">C-204</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Smart IoT · S-018", "31/10/2026", "Sắp hết hạn", "Đã ký"],
    [<Link href={`${BASE}/contracts/C-205`} key="c205">C-205</Link>, "Cà phê Mộc · Nguyễn Minh Anh", "Máy thường · C-031", "14/11/2026", "Đang hiệu lực", "Đã ký"],
  ]} actions={[["Tạo hồ sơ hợp đồng", `${BASE}/contracts/new`, "primary"], ["Nhắc hợp đồng sắp hết hạn", `${BASE}/contracts/expiry`, "secondary"]]} />;
  if (path === "contracts/C-205") return <ContractRecordPage standard />;
  if (path === "contracts/C-204") return <ContractRecordPage />;
  if (path === "contracts/new") return <ContractCreatePage />;
  if (path === "contracts/handover/standard") return <ContractHandoverPage smart={false} />;
  if (path === "contracts/handover/smart") return <ContractHandoverPage smart />;
  if (path === "contracts/expiry") return <ActionForm title="Nhắc hợp đồng sắp hết hạn" description="Gửi thông báo để khách hàng phản hồi về hợp đồng C-204." fields={[["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Khách hàng", "Nguyễn Minh Anh", "text"], ["Hết hạn", "31/10/2026", "text"], ["Kết quả phản hồi", "Chưa phản hồi", "select"]]} recordKey="M11-C-204" action="Gửi nhắc hợp đồng" returnHref={`${BASE}/contracts`} />;
  if (path === "contracts/settlement") return <SettlementScreen />;
  if (path === "contracts/compensation" || path === "contracts/deposit-refund" || path === "contracts/refund-good") return <DepositActionScreen path={path} />;
  const pathConfigs: Record<string, [string, string, [string, string, "text" | "file" | "select"][], string, string, string]> = {
    "contracts/new": ["Đàm phán & lập hợp đồng thuê", "Ghi nhận thỏa thuận để chuyển sang bước lập và ký hợp đồng ngoài Dolores.", [["Khách hàng", "Nguyễn Minh Anh", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Loại máy", "Máy thường / Smart IoT", "select"], ["Điều khoản đã thống nhất", "Nhập theo thỏa thuận", "text"]], "M02", "Lưu thông tin đàm phán", `${BASE}/contracts`],
    "contracts/first-invoice": ["Hóa đơn tháng đầu", "Thông tin tiền đặt cọc và các khoản tháng đầu.", [["Hợp đồng", "C-204 · Cà phê Mộc", "text"], ["Tiền đặt cọc", "Theo hợp đồng", "text"], ["Khoản thuê kỳ đầu", "750.000 đ", "text"], ["Chứng từ", "Chọn chứng từ", "file"]], "M05", "Ghi nhận hóa đơn tháng đầu", `${BASE}/contracts`],
    "contracts/handover/standard": ["Bàn giao & lắp đặt máy thường", "Gửi yêu cầu kỹ thuật để hoàn thành việc bàn giao máy thường.", [["Hợp đồng", "C-205", "text"], ["Máy", "C-031 · máy thường", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Ngày bàn giao", "Theo lịch thỏa thuận", "text"]], "M03", "Gửi yêu cầu Technician", `${BASE}/technical-requests/new/install-standard`],
    "contracts/handover/smart": ["Bàn giao & kích hoạt Smart IoT", "Gửi yêu cầu kích hoạt thiết bị Smart theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Máy Smart IoT", "S-018", "text"], ["Cửa hàng", "Cà phê Mộc", "text"], ["Kết nối / kích hoạt", "Chờ Technician", "select"]], "M04", "Gửi yêu cầu Technician", `${BASE}/technical-requests/new/install-smart`],
    "contracts/retrieval": ["Thu hồi trước quyết toán cọc", "Gửi Technician thu hồi và đánh giá máy theo hợp đồng C-204.", [["Hợp đồng", "C-204", "text"], ["Máy", "S-018 · Smart IoT", "text"], ["Ngày thu hồi", "Chọn lịch", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"]], "M12", "Gửi yêu cầu thu hồi", `${BASE}/technical-requests/YC-017`],
    "contracts/settlement": ["Quyết toán & hoàn cọc", "Ghi nhận quyết toán khi kết quả thu hồi của Technician đã có.", [["Hợp đồng", "C-204", "text"], ["Máy đã thu hồi", "S-018", "text"], ["Kết quả đánh giá", "Chờ Technician", "select"], ["Khoản quyết toán", "Theo hồ sơ hợp đồng", "text"]], "M13", "Ghi nhận quyết toán", `${BASE}/contracts`],
    "contracts/early-termination": ["Chấm dứt sớm & vi phạm", "Ghi nhận trường hợp chấm dứt sớm theo hợp đồng và chứng từ liên quan.", [["Hợp đồng", "C-204", "text"], ["Lý do", "Chọn lý do", "select"], ["Khoản phí / bồi thường", "Theo hợp đồng", "text"], ["Tài liệu chứng minh", "Chọn tệp", "file"]], "M14", "Ghi nhận tình huống", `${BASE}/contracts`],
    "contracts/compensation": ["Bồi thường vượt tiền đặt cọc", "Theo dõi khoản bồi thường vượt giá trị tiền đặt cọc trong hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tiền đặt cọc", "Theo hồ sơ", "text"], ["Mức bồi thường", "Theo đánh giá", "text"], ["Chứng từ", "Chọn tệp", "file"]], "M30", "Ghi nhận khoản bồi thường", `${BASE}/contracts`],
    "contracts/deposit-refund": ["Ghi nhận hoàn cọc", "Ghi nhận trạng thái hoàn cọc sau khi đã đối chiếu điều kiện hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Số tiền cọc", "Theo hồ sơ", "text"], ["Trạng thái Technician", "Chưa có kết quả", "select"], ["Xác nhận thanh toán ngoài hệ thống", "Chọn chứng từ", "file"]], "M31", "Ghi nhận hoàn cọc", `${BASE}/contracts`],
    "contracts/refund-good": ["Hoàn cọc · máy được đánh giá tốt", "Ghi nhận nhánh hoàn đủ cọc khi máy được đánh giá tốt.", [["Hợp đồng", "C-204", "text"], ["Kết quả Technician", "Chưa có kết quả", "select"], ["Số tiền hoàn", "Theo hợp đồng", "text"], ["Chứng từ hoàn", "Chọn tệp", "file"]], "M35", "Ghi nhận hoàn cọc", `${BASE}/contracts`],
    "contracts/violations": ["Theo dõi vi phạm hợp đồng", "Theo dõi thông báo, phản hồi và bước xử lý theo hồ sơ hợp đồng.", [["Hợp đồng", "C-204", "text"], ["Tình trạng vi phạm", "Chọn trạng thái", "select"], ["Phản hồi khách hàng", "Chưa phản hồi", "text"], ["Ghi chú", "Nhập nội dung", "text"]], "M36", "Ghi nhận trạng thái", `${BASE}/contracts`],
  };
  const config = pathConfigs[path];
  if (!config) return <ContractsIndexFallback />;
  const [title, description, fields, key, action, back] = config;
  return <ActionForm title={title} description={description} fields={fields} recordKey={key} action={action} returnHref={back} />;
}

function ContractsIndexFallback() { return <SceneTable title="Hợp đồng thuê" description="Hồ sơ và quy trình hợp đồng trong Dolores." headers={["Hợp đồng", "Khách hàng", "Thiết bị", "Trạng thái"]} rows={[["C-204", "Nguyễn Minh Anh", "S-018 · Smart IoT", "Đang hiệu lực"], ["C-205", "Nguyễn Minh Anh", "C-031 · máy thường", "Đang hiệu lực"]]} actions={[["Hợp đồng", `${BASE}/contracts`, "primary"]]} />; }

function CustomerScreens({ path }: { path: string }) {
  if (path === "customers" || path === "customers/list") return <SceneTable title="Tài khoản khách hàng" description="Theo dõi thông tin khách hàng, cửa hàng và hợp đồng liên quan." headers={["Khách hàng", "Cửa hàng", "Hợp đồng", "Tài khoản", "Hồ sơ"]} rows={[[<Link href={`${BASE}/customers/nguyen-minh-anh`} key="customer">Nguyễn Minh Anh ›</Link>, "Cà phê Mộc", "C-204 · C-205", "Đang hoạt động", "Xem hồ sơ"]]} actions={[["Tạo tài khoản khách hàng", `${BASE}/customers/new`, "primary"]]} />;
  if (path === "customers/new") return <ActionForm title="Tạo tài khoản khách hàng" description="Tạo hồ sơ truy cập cho một khách hàng." fields={[["Họ và tên", "Nguyễn Minh Anh", "text"], ["Email", "minhanh@example.com", "text"], ["Số điện thoại", "0900000000", "text"], ["Cửa hàng", "Cà phê Mộc", "text"]]} recordKey="M48" action="Tạo tài khoản khách hàng" returnHref={`${BASE}/customers`} />;
  return <DoloresPage title="Hồ sơ khách hàng Nguyễn Minh Anh" description="Thông tin tài khoản khách, cửa hàng và các hợp đồng liên quan." actions={<ActionBar items={[["Xem hợp đồng C-204", `${BASE}/contracts/C-204`, "primary"], ["Danh sách khách hàng", `${BASE}/customers`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin khách hàng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Họ tên" value="Nguyễn Minh Anh" /><DoloresField label="Email" value="minhanh@example.com" /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Trạng thái tài khoản" value="Đang hoạt động" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
}

function InvoiceScreens({ path }: { path: string }) {
  if (path === "invoices" || path === "invoices/list") return <InvoicesList />;
  if (path === "invoices/reconcile") return <InvoiceReconcileScreen />;
  if (path === "invoices/shortfall") return <ActionForm title="Yêu cầu thanh toán phần còn thiếu" description="Gửi thông báo bổ sung cho phần còn thiếu của hóa đơn HD-09-204." fields={[["Hóa đơn", "HD-09-204", "text"], ["Tổng phải trả", "2.750.000 đ", "text"], ["Đã đối soát", "1.750.000 đ", "text"], ["Còn thiếu", "1.000.000 đ", "text"], ["Hạn thanh toán", "12/10/2026", "text"]]} recordKey="HD-09-204-shortfall" action="Gửi yêu cầu bổ sung" returnHref={`${BASE}/invoices/reconcile`} />;
  if (path === "invoices/excess") return <ActionForm title="Hoàn khoản thanh toán thừa" description="Thông tin khoản thanh toán thừa của hóa đơn HD-09-205." fields={[["Hóa đơn", "HD-09-205", "text"], ["Số phải trả", "1.500.000 đ", "text"], ["Đã nhận", "1.700.000 đ", "text"], ["Tiền thừa", "200.000 đ", "text"], ["Xác nhận khách hàng / ngân hàng", "Chờ đối chiếu", "select"]]} recordKey="HD-09-205-excess" action="Ghi nhận đã hoàn tiền thừa" returnHref={`${BASE}/invoices`} />;
  if (path === "invoices/late-cups" || path === "invoices/late-cups-final") return <LateCupsScreen finalized={path.endsWith("final")} />;
  if (path === "invoices/overdue") return <SceneTable title="Dư nợ quá hạn & phí cộng dồn" description="Theo dõi khoản quá hạn theo hóa đơn và kỳ phát sinh." headers={["Khách hàng", "Hóa đơn", "Gốc", "Phí cộng dồn", "Hạn thanh toán", "Trạng thái"]} rows={[["Cà phê Mộc", "HD-08-204", "1.000.000 đ", "Theo điều khoản", "11/09/2026", "Quá hạn"]]} actions={[["Mở hóa đơn", `${BASE}/invoices/reconcile`, "primary"], ["Danh sách hóa đơn", `${BASE}/invoices`, "secondary"]]} />;
  if (path === "invoices/history") return <InvoiceHistory />;
  if (path === "invoices/payg") return <SceneTable title="PAYG & số ly gửi về muộn" description="Đối chiếu dữ liệu theo máy, hợp đồng và chu kỳ." headers={["Máy", "Hợp đồng", "Loại", "Ly trong kỳ", "Giá/ly", "Thành tiền"]} rows={[["S-018", "C-204", "Smart IoT", "1.000", "2.000 đ", "2.000.000 đ"], ["S-022", "C-204", "Máy thay tạm", "120", "Theo hợp đồng", "Gộp C-204"]]} actions={[["Xử lý ly gửi muộn", `${BASE}/invoices/late-cups`, "primary"], ["Hóa đơn", `${BASE}/invoices`, "secondary"]]} />;
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
    <DoloresPage title={recalculate ? 'Xử lý số ly gửi về muộn' : 'Ly gửi muộn · hóa đơn đã hoàn tất'} description="Chọn nhánh phù hợp với trạng thái hóa đơn và kỳ đối chiếu." actions={<><DoloresButton onClick={()=>setDialog('confirm')}>{action}</DoloresButton><DoloresButton href={BASE + '/invoices'} variant="secondary">Quay lại</DoloresButton></>}>

      <DoloresPanel><DoloresPanelTitle>Thông tin xử lý</DoloresPanelTitle><DoloresFieldGrid>
        <DoloresField label="Hóa đơn" value={bill.id + (recalculate ? ' · chưa chốt' : ' · đã chốt / chuyển kỳ sau')} />
        <DoloresField label="Ngày nhận dữ liệu" value={values.receivedDate} />
        <DoloresField label="Số ly gửi muộn"><input aria-label="Số ly gửi muộn" className="bg-transparent text-sm outline-none" value={values.cups} onChange={event=>setValues(current=>({...current,cups:event.target.value}))} /></DoloresField>
        <DoloresField label="Giá trị bổ sung"><input aria-label="Giá trị bổ sung" className="bg-transparent text-sm outline-none" value={values.amount} onChange={event=>setValues(current=>({...current,amount:event.target.value}))} /></DoloresField>
        <DoloresField label="Trạng thái hóa đơn"><select aria-label="Trạng thái hóa đơn" className="bg-transparent text-sm outline-none" value={status} onChange={event=>{setStatus(event.target.value as BillStatus);setDialog(null);}}>{BILL_STATUSES.map(value=><option key={value}>{value}</option>)}</select></DoloresField>
      </DoloresFieldGrid></DoloresPanel>
    </DoloresPage>
    {dialog && <DecisionDialog success={dialog==='success'} title={dialog==='success' ? 'Đã ghi nhận thông tin' : 'Xác nhận · Xử lý số ly gửi về muộn'} message={action + '. ' + bill.id + ' · ' + values.cups + ' · ' + values.amount} onCancel={()=>setDialog(null)} onConfirm={()=>dialog==='success' ? setDialog(null) : save()} />}
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
  return <SceneTable title="Lịch sử phiên bản hóa đơn" description="Theo dõi các bản hóa đơn đã phát hành và thay đổi." headers={['Hóa đơn','Phiên bản','Ngày','Thay đổi','Trạng thái']} rows={rows} actions={[["Mở đối soát", BASE + '/invoices/reconcile', "primary"], ["Về hóa đơn", BASE + '/invoices', "secondary"]]} />;
}

function InvoicesList() {
  return <SceneTable title="Hóa đơn định kỳ & đối soát" description="Theo dõi chứng từ, khoản nhận, phần thiếu hoặc thừa và hóa đơn quá hạn." headers={["Khách hàng", "Kỳ bill", "Số tiền", "Chứng từ / đối soát", "Trạng thái", "Xem"]} rows={[
    ["Cà phê Mộc", "09/2026", "2.750.000 đ", "1.750.000 đ · có chứng từ", "Chờ đối soát", <Link href={`${BASE}/invoices/reconcile`} key="m21">Đối soát ›</Link>],
    ["Cà phê Mộc", "09/2026", "1.500.000 đ", "Nhận 1.700.000 đ", "Thừa 200.000 đ", <Link href={`${BASE}/invoices/excess`} key="m23">Hoàn thừa ›</Link>],
    ["Góc Phố", "08/2026", "1.200.000 đ", "Chưa nhận đủ", "Quá hạn", <Link href={`${BASE}/invoices/overdue`} key="m34">Mở ›</Link>],
  ]} actions={[["Đối soát chứng từ", `${BASE}/invoices/reconcile`, "primary"], ["PAYG", `${BASE}/invoices/payg`, "secondary"], ["Lịch sử phiên bản", `${BASE}/invoices/history`, "secondary"]]} />;
}

function RepairHistory() {
  const { record } = useDemoRecord('technician:repair:CF-STD-026');
  const fields = Object.fromEntries(readDemoFields(record));
  const rows: Row[] = record ? [['Đã lưu', 'CF-STD-026', fields['Mô tả công việc'] ?? '', fields['Linh kiện thay'] ?? '', (fields['Giá'] ?? '') + ' · ' + (fields['Ghi chú lịch sử'] ?? '')]] : [['01/10/2026', 'S-018', 'Kiểm tra kết nối', 'Không ghi nhận', 'Đã gửi YC-017']];
  return <SceneTable title="Lịch sử sửa chữa, bảo trì & linh kiện" description="Xem kết quả Technician đã gửi theo từng thiết bị." headers={['Ngày','Máy','Công việc','Linh kiện','Kết quả Technician']} rows={rows} actions={[["Yêu cầu kỹ thuật", BASE + '/technical-requests', "primary"]]} />;
}

function MachineScreens({ path }: { path: string }) {
  if (path === "machines" || path === "machines/list") return <SceneTable title="Máy & tồn kho" description="Quản lý máy trong kho, máy đang cho thuê, cho mượn và hồ sơ sửa chữa." headers={["Mã máy", "Loại", "Khách hàng / vị trí", "Hợp đồng", "Trạng thái", "Hồ sơ"]} rows={[
    [<Link href={`${BASE}/machines/S-022`} key="s022">S-022</Link>, "Smart IoT", "Kho Dolores", "—", "Sẵn sàng", "Chi tiết"],
    ["S-018", "Smart IoT", "Cà phê Mộc", "C-204", "Đang sử dụng", <Link href={`${BASE}/iot/machines`} key="iot">Smart IoT</Link>],
    ["C-031", "Máy thường", "Cà phê Mộc", "C-205", "Đang sử dụng", "Hồ sơ máy"],
  ]} actions={[["Máy chưa cho thuê", `${BASE}/machines/stock`, "primary"], ["Máy của khách hàng", `${BASE}/machines/customer`, "secondary"], ["Máy cho mượn", `${BASE}/machines/loans`, "secondary"], ["Lịch sử sửa chữa", `${BASE}/machines/repair-history`, "secondary"]]} />;
  if (path === "machines/customer") return <SceneTable title="Máy của Nguyễn Minh Anh" description="Thiết bị của khách hàng và trạng thái theo hợp đồng." headers={["Mã máy", "Loại", "Hợp đồng", "Cửa hàng / vị trí", "Trạng thái", "Mở"]} rows={[["S-018", "Smart IoT", "C-204", "Cà phê Mộc · Quận 3", "Đang thuê", <Link href={`${BASE}/iot/machines`} key="smart">Dữ liệu Smart ›</Link>], ["C-031", "Máy thường", "C-205", "Cà phê Mộc · Quận 3", "Đang thuê", <Link href={`${BASE}/contracts/C-205`} key="std">Hồ sơ ›</Link>], ["S-022", "Smart IoT · máy thay", "C-204", "Đã trả", "Đã kết thúc", <Link href={`${BASE}/machines/loans`} key="loan">Lịch sử ›</Link>]]} actions={[["Hồ sơ khách hàng", `${BASE}/customers/nguyen-minh-anh`, "primary"], ["Danh sách máy", `${BASE}/machines`, "secondary"]]} />;
  if (path === "machines/stock") return <SceneTable title="Máy trong kho · chưa cho thuê" description="Xem máy theo loại và tình trạng sẵn sàng." headers={["Mã máy", "Loại máy", "Nguồn nhập", "Tình trạng", "Thao tác"]} rows={[["S-022", "Smart IoT", "Kho Dolores", "Sẵn sàng cho thuê", <Link href={`${BASE}/machines/S-022`} key="detail">Hồ sơ ›</Link>], ["C-034", "Máy thường", "Tồn kho", "Chờ kiểm tra", "Mở hồ sơ"]]} actions={[["Máy & tồn kho", `${BASE}/machines`, "primary"]]} />;
  if (path === "machines/loans") return <SceneTable title="Máy cho mượn & lịch sử sử dụng" description="Theo dõi máy tạm, hợp đồng chính và thời gian sử dụng." headers={["Máy tạm", "Loại", "Hợp đồng chính", "Bàn giao", "Trả máy"]} rows={[["S-022", "Smart IoT", "C-204 · S-018", "12/09/2026", "Đã trả 12/09/2026"]]} actions={[["Gán máy thay", `${BASE}/machines/substitute`, "primary"], ["Danh sách máy", `${BASE}/machines`, "secondary"]]} />;
  if (path === "machines/repair-history") return <RepairHistory />;
  if (path === "machines/substitute") return <ActionForm title="Máy thay thế & phân bổ số ly" description="Gán máy thay tạm cùng loại vào hợp đồng chính." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "select"], ["Kỳ sử dụng", "Theo hợp đồng", "text"], ["Ngày bàn giao", "Chọn ngày", "text"]]} recordKey="C-204-substitute" action="Ghi nhận máy thay thế" returnHref={`${BASE}/machines/loans`} />;
  if (path === "machines/substitute/return") return <ActionForm title="Kết thúc sử dụng máy thay" description="Ghi nhận trả máy thay thế tạm thời về kho." fields={[["Hợp đồng chính", "C-204", "text"], ["Máy chính", "S-018 · Smart IoT", "text"], ["Máy thay thế", "S-022 · Smart IoT", "text"], ["Ngày trả", "12/09/2026", "text"], ["Usage theo kỳ", "Gộp vào C-204", "text"]]} recordKey="C-204-substitute-return" action="Ghi nhận trả máy thay" returnHref={`${BASE}/machines/loans`} />;
  if (path.startsWith("machines/")) return <DoloresPage title={`Hồ sơ máy ${path.split("/")[1]}`} description="Thông tin thiết bị và lịch sử gắn với hợp đồng." actions={<ActionBar items={[["Máy & tồn kho", `${BASE}/machines`, "primary"], ["Lịch sử sửa chữa", `${BASE}/machines/repair-history`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thông tin máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Mã máy" value={path.split("/")[1]} /><DoloresField label="Loại máy" value="Smart IoT" /><DoloresField label="Trạng thái" value="Sẵn sàng cho thuê" /><DoloresField label="Lịch sử" value="Chưa ghi nhận cho thuê" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <MachineScreens path="machines" />;
}

function IoTScreens({ path }: { path: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const front = searchParams.get("view") === "front";
  const [view, setView] = useState<MachineView>(front ? "Front" : "Angle");
  useEffect(() => { setView(front ? "Front" : "Angle"); }, [front]);
  if (path === "iot/machines") return <DoloresPage title="Chi tiết dữ liệu & mô hình máy" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton className="lg:w-[195.8px]" href={`${BASE}/machines/customer`}>Về máy của Nguyễn Minh Anh</DoloresButton><DoloresButton className="lg:w-[124px]" variant="secondary" href={`${BASE}/invoices/payg`}>Mở PAYG</DoloresButton></>}>
    <div className="dl-metrics grid grid-cols-4 gap-4"><DoloresMetric label="Kỳ xem" value="09/2026" /><DoloresMetric label="Máy chính S-018" value="1.840 ly" /><DoloresMetric label="Máy thay S-022" value="160 ly" /><DoloresMetric label="Tổng C-204" value="2.000 ly" /></div>
    <DoloresMachineModelPanel view={view} onToggle={() => setView(current => current === "Angle" ? "Front" : "Angle")} onFront={() => router.push(`${BASE}/iot/machines?view=front`)} onAngle={() => router.push(`${BASE}/iot/machines`)} />
  </DoloresPage>;
  const customerHref = `${BASE}/iot/customer`;
  return <DoloresPage title={path === "iot/machines" ? "Chi tiết dữ liệu & mô hình máy" : "Giám sát Smart IoT · theo khách hàng"} description="Thông tin vận hành Smart IoT theo khách hàng." actions={<ActionBar items={[["Danh sách máy Smart", `${BASE}/iot/machines`, "primary"], ["Hồ sơ khách hàng", customerHref, "secondary"]]} />}>
    <DoloresPanel><DoloresPanelTitle>{path === "iot/machines" ? "S-018 · dữ liệu gần nhất" : "Khách hàng có máy Smart"}</DoloresPanelTitle>{path === "iot/machines" ? <div className="grid grid-cols-3 gap-4"><DoloresMetric label="Trạng thái kết nối" value="Theo dữ liệu gần nhất" /><DoloresMetric label="Số ly trong kỳ" value="1.000" /><DoloresMetric label="Menu / phiên bản" value="Mùa hè · v3" /></div> : <DoloresTable headers={["Khách hàng", "Máy Smart", "Cửa hàng", "Dữ liệu", "Mở"]} rows={[["Nguyễn Minh Anh", "S-018", "Cà phê Mộc", "Đã đồng bộ 09:42", <Link href={`${BASE}/iot/machines`} key="open">Chi tiết ›</Link>]]} />}</DoloresPanel>

  </DoloresPage>;
}

function TechnicalDispatchPage({ kind = "retrieval" }: { kind?: string }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<"type" | "confirm" | "success" | null>(null);
  const fields = [["Loại công việc", "Thu hồi & đánh giá tình trạng"], ["Mã yêu cầu", "YC-017"], ["Hợp đồng / máy", "C-204 / S-018"], ["Technician được giao", "Nguyễn Văn Nam"], ["Địa điểm thực hiện", "Cà phê Mộc · Quận 3"], ["Nội dung yêu cầu", "Thu hồi máy và báo tình trạng để quyết toán cọc"]];
  const message = "Giao YC-017 cho Technician Nguyễn Văn Nam: thu hồi S-018, đánh giá tình trạng và gửi kết quả cho Moderator.";
  return <>
    <DoloresPage title="Gửi yêu cầu cho Technician" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton className="lg:w-[124px]" onClick={() => setDialog("confirm")}>Gửi yêu cầu</DoloresButton><DoloresButton className="lg:w-[219.2px]" variant="secondary" onClick={() => setDialog("type")}>Chọn loại công việc khác</DoloresButton><DoloresButton className="lg:w-[124px]" variant="secondary" href={`${BASE}/technical-requests`}>Hủy</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, fallback], index) => <DoloresField key={label} label={label} required={[0, 2, 3, 5].includes(index)}>{index === 5 ? <textarea rows={1} className="h-[17px] w-full resize-none bg-transparent text-sm leading-[17px] outline-none max-lg:h-[34px]" aria-label={label} value={values[label] ?? fallback} onChange={event => setValues(current => ({ ...current, [label]: event.target.value }))} /> : <input className="w-full bg-transparent text-sm leading-[17px] outline-none" aria-label={label} value={values[label] ?? fallback} onChange={event => setValues(current => ({ ...current, [label]: event.target.value }))} />}</DoloresField>)}</DoloresFieldGrid></DoloresPanel>

    </DoloresPage>
    {dialog && <DoloresDialog labelledBy="technical-dispatch-title" onClose={() => setDialog(null)}><section>
      <p>{dialog === "success" ? "✓  Đã hoàn tất" : "Xác nhận thông tin"}</p>
      <h2 id="technical-dispatch-title">{dialog === "type" ? "Chọn công việc kỹ thuật" : dialog === "confirm" ? "Xác nhận · Gửi yêu cầu cho Technician" : "Đã gửi yêu cầu cho Technician"}</h2>
      <p>{dialog === "type" ? "Chọn hồ sơ liên quan để điều phối Technician." : message}</p>
      <div data-dialog-actions>{dialog === "type" ? <>{[["Lắp máy thường", "technical-requests/new/install-standard"], ["Lắp Smart IoT", "technical-requests/new/install-smart"], ["Sửa chữa / lỗi menu", "technical-requests/new/repair"], ["Thu hồi & đánh giá", "contracts/retrieval"], ["Đánh giá máy thu mua", "technical-requests/new/buyback"]].map(([label, destination], index) => <DoloresButton key={destination} href={`${BASE}/${destination}`} variant={index === 0 ? "primary" : "secondary"}>{label}</DoloresButton>)}<DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton></> : dialog === "confirm" ? <><DoloresButton onClick={() => { if (writeDemoRecord(`moderator:M19-${kind}`, "submitted-demo", Object.fromEntries(fields.map(([label, fallback]) => [label, values[label] ?? fallback])))) setDialog("success"); }}>Xác nhận</DoloresButton><DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton></> : <DoloresButton href={`${BASE}/technical-requests`}>Xem yêu cầu và tiến trình</DoloresButton>}</div>
    </section></DoloresDialog>}
  </>;
}

function TechnicalScreens({ path }: { path: string }) {
  if (path === "technical-requests" || path === "technical-requests/list") return <SceneTable title="Yêu cầu kỹ thuật & kết quả" description="Theo dõi yêu cầu được gửi đến Technician và kết quả đã báo." headers={["Mã", "Máy / cửa hàng", "Công việc", "Technician", "Trạng thái", "Kết quả"]} rows={[
    ["YC-017", "S-018 · Cà phê Mộc", "Thu hồi & đánh giá", "Nguyễn Văn Nam", "Đã báo kết quả", <Link href={`${BASE}/technical-requests/YC-017`} key="r17">Mở ›</Link>],
    ["YC-018", "S-030 · Cà phê Mộc", "Sửa lỗi kết nối", "Nguyễn Văn Nam", "Đang xử lý", "Chờ báo cáo"],
    ["YC-019", "MB-017", "Đánh giá máy thu mua", "Chưa giao", "Chờ điều phối", "—"],
  ]} actions={[["Gửi yêu cầu mới", `${BASE}/technical-requests/new`, "primary"], ["Kết quả thu hồi YC-017", `${BASE}/technical-requests/YC-017`, "secondary"]]} />;
  if (path === "technical-requests/YC-017") return <TechResult />;
  if (path === "technical-requests/new") return <TechnicalDispatchPage />;
  if (path === "technical-requests/new/install-standard" || path === "technical-requests/new/install-smart") return <TechnicalDispatchPage key={path} kind={path.split("/").at(-1)} />;
  if (path.startsWith("technical-requests/new/")) {
    const kind = path.slice("technical-requests/new/".length);
    const label = ({ "install-standard": "Lắp đặt máy thường", "install-smart": "Lắp đặt & kích hoạt Smart IoT", repair: "Sửa chữa / lỗi kết nối", retrieval: "Thu hồi & đánh giá", buyback: "Đánh giá máy khách đề nghị bán", collection: "Thu gom máy đã thu mua" } as Record<string, string>)[kind] ?? "Gửi yêu cầu cho Technician";
    const isSmart = kind === "install-smart";
    return <ActionForm title={`Gửi yêu cầu: ${label}`} description="Ghi nhận đúng thông tin thiết bị, hợp đồng và công việc cần thực hiện." fields={[["Loại công việc", label, "text"], ["Hợp đồng / hồ sơ", isSmart ? "C-204" : "Chọn hồ sơ liên quan", "select"], ["Máy", isSmart ? "S-018 · Smart IoT" : "Chọn máy", "select"], ["Địa điểm", "Cà phê Mộc · Quận 3", "text"], ["Ghi chú", "Nhập mô tả công việc", "text"]]} recordKey={`M19-${kind}`} action="Gửi yêu cầu cho Technician" returnHref={`${BASE}/technical-requests`} nextHref={`${BASE}/technical-requests`} />;
  }
  if (path === "machine-history/S-018") return <DoloresPage title="Chi tiết lịch sử sửa chữa / bảo trì" description="Lịch sử xử lý thiết bị S-018 · C-204." actions={<ActionBar items={[["Danh sách lịch sử máy", `${BASE}/machine-history`, "primary"], ["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Ghi nhận Technician</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Ngày" value="01/10/2026" /><DoloresField label="Mã máy / hợp đồng" value="S-018 · C-204" /><DoloresField label="Loại công việc" value="Thu hồi & đánh giá" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Tình trạng" value="Đã thu hồi · có hư hại vỏ" /><DoloresField label="Kết quả" value="Đã báo Moderator" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <SceneTable title="Lịch sử bảo trì & sửa chữa" description="Lọc và mở lịch sử công việc theo máy." headers={["Ngày", "Mã máy", "Khách hàng", "Loại", "Trạng thái", "Chi tiết"]} rows={[["01/10/2026", "S-018", "Cà phê Mộc", "Thu hồi / đánh giá", "Đã ghi nhận", <Link href={`${BASE}/machine-history/S-018`} key="s18">Chi tiết ›</Link>], ["12/09/2026", "C-031", "Cà phê Mộc", "Sửa chữa", "Hoàn tất", <Link href={`${BASE}/machine-history/S-018`} key="c31">Mở hồ sơ ›</Link>]]} actions={[["Yêu cầu kỹ thuật", `${BASE}/technical-requests`, "primary"], ["Cảnh báo", `${BASE}/notifications`, "secondary"]]} />;
}

function TechResult() {
  const { record } = useDemoRecord("technician:retrieval:YC-017");
  const assessed = isRetrievalAssessment(record);
  return <DoloresPage title="Kết quả Technician · YC-017" description="Kết quả thu hồi máy và đánh giá được gửi từ Technician." actions={<ActionBar items={[["Mở giao diện Technician", "/technician/tasks/YC-017", "primary"], ["Hợp đồng C-204", `${BASE}/contracts/C-204`, "secondary"], ["Danh sách yêu cầu", `${BASE}/technical-requests`, "secondary"]]} />}><DoloresPanel><DoloresPanelTitle>Thu hồi & đánh giá máy</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng" value="C-204" /><DoloresField label="Máy" value="S-018 · Smart IoT" /><DoloresField label="Technician" value="Nguyễn Văn Nam" /><DoloresField label="Trạng thái" value={assessed ? "Đã nhận kết quả Technician" : "Đang chờ Technician gửi kết quả"} /><DoloresField label="Tình trạng" value={assessed ? (record?.payload.damage === "yes" ? "Có hư hỏng · " : "Không hư hỏng · ") + record?.payload.notes : "Chưa có kết quả"} /><DoloresField label="Chứng cứ" value="Ảnh / dữ liệu chưa đồng bộ" /></DoloresFieldGrid></DoloresPanel>{assessed && <DoloresButton href={`${BASE}/contracts/settlement`}>Mở quyết toán sau đánh giá</DoloresButton>}</DoloresPage>;
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

    {dialog && <DoloresDialog labelledBy={`m21-${dialog}-title`} onClose={() => setDialog(null)}>
      {dialog === "confirm" && <section>
        <p className="text-sm font-semibold leading-[1.45]">Xác nhận thông tin</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-confirm-title">Xác nhận · Đối soát chứng từ thanh toán</h2>
        <p className="text-base leading-[1.45]">Xác nhận 1.750.000 đ đã nhận qua ngân hàng công ty. Hóa đơn 2.750.000 đ còn thiếu 1.000.000 đ; chưa được ghi thanh toán đủ.</p>
        <div data-dialog-actions>
          <DoloresButton onClick={() => { writeDemoFlow("HD-09-204", "received-confirmed-demo"); setDialog("success"); }}>Xác nhận</DoloresButton>
          <DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton>
        </div>
      </section>}
      {dialog === "success" && <section>
        <p className="text-sm font-semibold leading-[1.45]">✓&nbsp; Đã hoàn tất</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-success-title">Đã ghi nhận thành công</h2>
        <p className="text-base leading-[1.45]">Xác nhận 1.750.000 đ đã nhận qua ngân hàng công ty. Hóa đơn 2.750.000 đ còn thiếu 1.000.000 đ; chưa được ghi thanh toán đủ.</p>
        <DoloresButton href={`${BASE}/invoices/shortfall`}>Xem yêu cầu và tiến trình</DoloresButton>
      </section>}
      {dialog === "preview" && <section>
        <p className="text-sm font-semibold leading-[1.45]">Tài liệu trong hồ sơ</p>
        <h2 className="text-[26px] font-semibold leading-[1.45]" id="m21-preview-title">Đối soát chứng từ thanh toán</h2>
        <p className="text-base leading-[1.45]">Tài liệu được lưu để xem và đối chiếu với hồ sơ.</p>
        <div className={shellStyles.documentPreview}>
          <h3 className={shellStyles.mobileOnlyContent}>Tài liệu</h3>
          <p>Chứng từ chuyển khoản</p>

        </div>
        <DoloresButton variant="secondary" onClick={() => setDialog(null)}>Đóng</DoloresButton>
      </section>}
    </DoloresDialog>}
  </>;
}

function SettlementScreen() {
  const { record: assessment } = useDemoRecord("technician:retrieval:YC-017");
  const technicianDone = isRetrievalAssessment(assessment);
  const { record: settlement } = useDemoRecord("moderator:C-204-settlement");
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  return <>
    <DoloresPage title="Quyết toán & hoàn cọc" description="Hồ sơ quyết toán tiền đặt cọc hợp đồng C-204." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>Ghi nhận quyết toán</DoloresButton><DoloresButton href={`${BASE}/technical-requests/YC-017`} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={`${BASE}/contracts`} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>C-204 · S-018</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận từ Technician" : "Chưa có kết quả Technician"} /><DoloresField label="Đánh giá máy" value={technicianDone ? assessment?.payload.notes ?? "Đã nhận đánh giá" : "Đang chờ đánh giá"} /><DoloresField label="Tiền đặt cọc" value="Theo hồ sơ hợp đồng" /><DoloresField label="Trạng thái quyết toán" value={settlement?.status === "recorded-demo" ? "Đã ghi nhận thông tin" : "Chưa quyết toán"} /></DoloresFieldGrid></DoloresPanel>

    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận thông tin" : "Xác nhận quyết toán C-204?"} message={dialog === "success" ? "Đã lưu thông tin quyết toán C-204." : "Ghi nhận thông tin quyết toán tiền đặt cọc hợp đồng C-204."} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { if (!isRetrievalAssessment(readDemoRecord("technician:retrieval:YC-017"))) { setDialog(null); return; } if (writeDemoRecord("moderator:C-204-settlement", "recorded-demo", { contract: "C-204", machine: "S-018", notes: assessment?.payload.notes ?? "" })) setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function DepositActionScreen({ path }: { path: string }) {
  const config = path === "contracts/compensation"
    ? { title: "Bồi thường vượt tiền đặt cọc", action: "Ghi nhận khoản bồi thường", key: "C-204-compensation" }
    : path === "contracts/refund-good"
      ? { title: "Hoàn cọc · máy được đánh giá tốt", action: "Ghi nhận hoàn cọc", key: "C-204-refund-good" }
      : { title: "Ghi nhận hoàn cọc", action: "Ghi nhận hoàn cọc", key: "C-204-deposit-refund" };
  const { record: assessment } = useDemoRecord("technician:retrieval:YC-017");
  const technicianDone = isRetrievalAssessment(assessment);
  const { record: settlement } = useDemoRecord("moderator:C-204-settlement");
  const [dialog, setDialog] = useState<"confirm" | "success" | null>(null);
  return <>
    <DoloresPage title={config.title} description="C-204 · S-018 · thông tin quyết toán tiền cọc." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setDialog("confirm")}>{config.action}</DoloresButton><DoloresButton href={`${BASE}/technical-requests/YC-017`} variant="secondary">Xem kết quả Technician</DoloresButton><DoloresButton href={`${BASE}/contracts`} variant="secondary">Về hợp đồng</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin quyết toán</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng / máy" value="C-204 / S-018" /><DoloresField label="Kết quả thu hồi" value={technicianDone ? "Đã nhận" : "Chưa có kết quả Technician"} /><DoloresField label="Tiền đặt cọc" value="Theo hợp đồng" /><DoloresField label="Số tiền" value="Theo kết quả đánh giá và thỏa thuận" /></DoloresFieldGrid></DoloresPanel>

    </DoloresPage>
    {dialog && <DecisionDialog success={dialog === "success"} title={dialog === "success" ? "Đã ghi nhận thông tin" : `Xác nhận · ${config.title}`} message={dialog === "success" ? "Đã lưu thông tin khoản tiền." : `${config.action} · C-204 / S-018.`} onCancel={() => setDialog(null)} onConfirm={() => { if (dialog === "confirm") { if (!isRetrievalAssessment(readDemoRecord("technician:retrieval:YC-017"))) { setDialog(null); return; } if (writeDemoRecord("moderator:" + config.key, "recorded-demo", { contract: "C-204", machine: "S-018" })) setDialog("success"); } else setDialog(null); }} />}
  </>;
}

function MenuScreens({ path }: { path: string }) {
  if (path === "menu" || path === "menu/items") return <SceneTable title="Global Menu mùa hè · các món" description="Quản lý món và công thức dùng chung trong Global Menu Dolores." headers={["Món", "Danh mục", "Thành phần / định lượng", "Trạng thái", "Thao tác"]} rows={[["Espresso", "Cà phê", "18 g cà phê · 40 ml nước", "Đang áp dụng", <Link href={`${BASE}/menu/espresso`} key="espresso">Chỉnh ›</Link>], ["Cà phê sữa tươi", "Cà phê", "18 g cà phê · sữa tươi", "Đang áp dụng", <Link href={`${BASE}/menu/add`} key="add">Chi tiết ›</Link>]]} actions={[["Thêm món", `${BASE}/menu/add`, "primary"], ["Thành phần", `${BASE}/menu/ingredients`, "secondary"], ["Gửi menu xuống máy Smart", `${BASE}/menu/send`, "secondary"]]} />;
  if (path === "menu/ingredients") return <SceneTable title="Thành phần món" description="Theo dõi định lượng theo đơn vị thành phần." headers={["Món", "Cà phê", "Nước", "Sữa tươi", "Kiểm tra"]} rows={[["Espresso", "18 g", "40 ml", "—", "Đủ"], ["Cà phê sữa tươi", "18 g", "—", "120 ml", "Đủ"]]} actions={[["Danh sách món", `${BASE}/menu`, "primary"], ["Thêm món", `${BASE}/menu/add`, "secondary"]]} />;
  if (path === "menu/send") return <ActionForm title="Gửi menu đến máy Smart" description="Chọn Global Menu và các máy Smart đích." fields={[["Global Menu", "Mùa hè · v3", "select"], ["Máy đích", "Chọn máy Smart IoT", "select"], ["Trạng thái gửi", "Chưa gửi", "text"]]} recordKey="global-menu-send" action="Gửi menu" returnHref={`${BASE}/menu`} nextHref={`${BASE}/menu/sent`} />;
  if (path === "menu/sent") return <SceneTable title="Trạng thái gửi Global Menu" description="Theo dõi trạng thái gửi và xác nhận áp dụng từ máy." headers={["Máy", "Global Menu", "Gửi lúc", "Trạng thái"]} rows={[["S-018", "Mùa hè · v3", "02/10/2026", "Đang chờ xác nhận từ máy"]]} actions={[["Về danh sách menu", `${BASE}/menu`, "primary"]]} />;
  if (path === "menu/add/missing") return <MenuMissingIngredient />;
  if (path === "menu/add") return <ActionForm title="Thêm món · Cà phê sữa tươi" description="Nhập công thức theo đúng thành phần máy hỗ trợ." fields={[["Tên món", "Cà phê sữa tươi", "text"], ["Cà phê", "18 g", "text"], ["Sữa tươi", "120 ml", "text"], ["Nước pha", "Theo thiết bị", "text"]]} recordKey="menu-add-milk" action="Lưu món" returnHref={`${BASE}/menu`} />;
  const is20g = path.endsWith("20g");
  const is60ml = path.endsWith("60");
  return <ActionForm title={`Chỉnh công thức Espresso${is60ml ? " · nước pha 60 ml" : is20g ? " · cà phê 20 g" : ""}`} description="Sửa công thức Global Menu theo định lượng nguồn." fields={[["Cà phê", is20g ? "20 g" : "18 g", "text"], ["Nước pha", is60ml ? "60 ml" : "40 ml", "text"]]} recordKey="espresso-recipe" action="Lưu công thức Espresso" returnHref={`${BASE}/menu`} />;
}

function MenuMissingIngredient() {
  const [milk, setMilk] = useState("");
  const [invalid, setInvalid] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { const record = readDemoRecord("moderator:menu-add-milk"); if (record && positiveQuantity(record.payload["field-2"] ?? "")) { setMilk(record.payload["field-2"]); setInvalid(false); } }, []);
  if (saved) return <DoloresPage title="Đã lưu món Cà phê sữa tươi" description="Global Menu mùa hè · Cà phê sữa tươi." actions={<DoloresButton href={`${BASE}/menu`}>Về danh sách món</DoloresButton>}><DoloresPanel><DoloresPanelTitle>Công thức đã lưu</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Tên món" value="Cà phê sữa tươi" /><DoloresField label="Cà phê" value="18 g" /><DoloresField label="Sữa tươi" value={milk} /><DoloresField label="Nước pha" value="Theo công thức máy" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  return <>
    <DoloresPage title="Thêm món · thiếu thành phần bắt buộc" description="Global Menu mùa hè · thêm món Cà phê sữa tươi." actions={<><DoloresButton onClick={() => { if (!positiveQuantity(milk)) setInvalid(true); else { setInvalid(false); setDialog(true); } }}>Lưu món</DoloresButton><DoloresButton href={`${BASE}/menu`} variant="secondary">Về danh sách món</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thành phần của món</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Tên món" value="Cà phê sữa tươi" /><DoloresField label="Cà phê" value="18 g" /><DoloresField label="Sữa tươi *" required><input aria-label="Sữa tươi bắt buộc" className="bg-transparent text-sm outline-none" value={milk} onChange={(event) => { setMilk(event.target.value); setInvalid(!positiveQuantity(event.target.value)); }} /></DoloresField><DoloresField label="Nước pha" value="Theo công thức máy" /></DoloresFieldGrid></DoloresPanel>
      {invalid && <p role="alert" className="text-sm font-medium text-[#B81724]">Món cà phê sữa tươi cần có định lượng sữa tươi. Chưa lưu công thức.</p>}
    </DoloresPage>
    {dialog && <DecisionDialog title="Xác nhận · Lưu món Cà phê sữa tươi" message={`Sữa tươi: ${milk}. Global Menu mùa hè.`} onCancel={() => setDialog(false)} onConfirm={() => { if (!positiveQuantity(milk)) { setInvalid(true); setDialog(false); return; } if (writeDemoRecord("moderator:menu-add-milk", "submitted-demo", { "field-0": "Cà phê sữa tươi", "field-1": "18 g", "field-2": milk, "field-3": "Theo thiết bị" })) { setDialog(false); setSaved(true); } }} />}
  </>;
}

function BuybackScreens({ path }: { path: string }) {
  if (path === "buyback" || path === "buyback/list") return <SceneTable title="Thu mua máy cũ" description="Theo dõi đề nghị bán, chứng từ, thu gom và đưa máy qua tân trang/kiểm thử." headers={["Mã hồ sơ", "Khách hàng", "Máy", "Chứng từ / phản hồi", "Thu gom", "Trạng thái"]} rows={[[<Link href={`${BASE}/buyback/MB-2026-017`} key="mb">MB-2026-017</Link>, "Nguyễn Minh Anh", "MB-017", "Khách hàng đã xác nhận", "Chờ thu gom", "Chờ Technician"]]} actions={[["Mở đánh giá", `${BASE}/buyback/MB-2026-017`, "primary"], ["Yêu cầu thu gom", `${BASE}/technical-requests/new/collection`, "secondary"]]} />;
  if (path.includes("documents")) return <ActionForm title="Chứng từ mua bán máy cũ" description="Ghi nhận chứng từ và phản hồi khách hàng cho hồ sơ MB-2026-017." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Giá mua", "Theo thỏa thuận", "text"], ["Chứng từ mua bán", "Chọn tệp", "file"], ["Khách hàng xác nhận", "Chờ phản hồi", "select"]]} recordKey="MB-2026-017-document" action="Ghi nhận hồ sơ" returnHref={`${BASE}/buyback`} />;
  if (path.includes("refurbishment")) return <RefurbishmentScreen />;
  return <ActionForm title="Đánh giá máy mua cũ & thương lượng" description="Ghi nhận tình trạng thiết bị và mức giá thỏa thuận." fields={[["Mã hồ sơ", "MB-2026-017", "text"], ["Máy", "MB-017", "text"], ["Tình trạng Technician", "Chưa có kết quả", "select"], ["Giá đề nghị", "Theo thỏa thuận", "text"], ["Chứng từ", "Chọn tệp", "file"]]} recordKey="MB-2026-017-assessment" action="Ghi nhận đánh giá" returnHref={`${BASE}/buyback`} nextHref={`${BASE}/buyback/documents`} />;
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
  return <DoloresPage title="Tân trang & nhập kho" description="Ghi nhận kết quả Technician sau khi máy được thu gom." actions={<><DoloresButton disabled={!technicianDone} onClick={() => setRecorded(true)}>Ghi nhận kết quả tân trang</DoloresButton><DoloresButton href="/technician/tasks/refurbishment" variant="secondary">Mở công việc Technician</DoloresButton><DoloresButton href={`${BASE}/buyback`} variant="secondary">Về thu mua máy cũ</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>MB-017 · MB-2026-017</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Thu gom" value={technicianDone ? "Đã nhận từ Technician" : "Chờ kết quả Technician"} /><DoloresField label="Tân trang" value={technicianDone ? "Đã ghi kết quả tân trang và kiểm thử" : "Chưa hoàn tất"} /><DoloresField label="Trạng thái kho" value={recorded ? "Đã ghi nhận" : "Chưa sẵn sàng cho thuê"} /></DoloresFieldGrid></DoloresPanel>

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
  return <DoloresPage title="Không tìm thấy màn hình" description="Không tìm thấy trang được yêu cầu." actions={<DoloresButton href={`${BASE}`}>Về tổng quan</DoloresButton>}>{null}</DoloresPage>;
}
