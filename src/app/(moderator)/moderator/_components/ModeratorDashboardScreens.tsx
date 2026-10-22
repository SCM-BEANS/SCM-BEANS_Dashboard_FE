"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DashboardOverview } from "@/app/_features/dashboard/DashboardOverview";
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
import { useDashboardOverview } from "@/hooks/dolores/useDashboardOverview";
import { useAlerts } from "@/hooks/dolores/useAlerts";
import { useMarkNotificationRead, useNotifications, useUnreadNotificationCount } from "@/hooks/dolores/useNotifications";
import { useTenant, useTenants } from "@/hooks/dolores/useTenants";
import { useContractById, useContractDocuments, usePlatformContracts } from "@/hooks/dolores/useContracts";
import { ModeratorIoTScreen, ModeratorMachinesScreen, ModeratorTechnicalScreen } from "./ModeratorOperationalScreens";
import { ModeratorBuybackScreen, ModeratorInvoicesScreen, ModeratorRecipesScreen } from "./ModeratorBillingRecipeScreens";

const getCentralizedModeratorPath = (relativePath: string) => relativePath ? `${PATH_MODERATOR.root}/${relativePath}` : PATH_MODERATOR.root;

type Row = ReactNode[];

function ActionBar({ items }: { items: [string, string, "primary" | "secondary"][] }) {
  return <>{items.map(([label, href, variant]) => <DoloresButton key={href + label} href={href} variant={variant}>{label}</DoloresButton>)}</>;
}

function formatCount(value: number | null | undefined) {
  return value == null ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function formatApiDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, time] = match;
  return `${day}/${month}/${year}${includeTime && time ? ` ${time}` : ""}`;
}

function getReadErrorMessage(error: unknown, subject: string) {
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
  if (status === 401) return "Dolores trả về 401: phiên đăng nhập hoặc token chưa được xác thực. Cần hoàn tất phần xác thực riêng để kiểm tra quyền Moderator.";
  if (status === 403) return "Dolores trả về 403: tài khoản hiện tại không có quyền hoặc scope để đọc dữ liệu này.";
  if (status === 404) return `Dolores trả về 404: không tìm thấy ${subject} theo đường dẫn hoặc ID hiện tại. Hồ sơ có thể đã bị xóa hoặc đường dẫn đã cũ.`;
  if (status !== undefined) return `Dolores trả về lỗi HTTP ${status}. Vui lòng thử lại sau khi kiểm tra API.`;
  return "Không thể kết nối hoặc đọc dữ liệu từ Dolores. Vui lòng thử lại.";
}

function ApiReadStatus<T>({ query, subject }: {
  query: {
    data: T | undefined;
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => Promise<unknown>;
  };
  subject: string;
}) {
  const hasData = query.data !== undefined;
  if (query.isPending && !hasData) {
    return <div role="status" aria-live="polite"><DoloresNotice title={`Đang tải ${subject}`}>Đang lấy dữ liệu mới nhất từ Dolores.</DoloresNotice></div>;
  }
  if (query.isError) {
    return <div role="alert" aria-live="assertive"><DoloresNotice title={hasData ? `Không thể cập nhật ${subject}` : `Không thể tải ${subject}`}>
      <p>{getReadErrorMessage(query.error, subject)}</p>
      <DoloresButton onClick={() => { void query.refetch(); }} variant="secondary">Thử lại</DoloresButton>
    </DoloresNotice></div>;
  }
  if (query.isFetching && hasData) {
    return <div role="status" aria-live="polite"><DoloresNotice title={`Đang cập nhật ${subject}`}>Đang kiểm tra dữ liệu mới từ Dolores.</DoloresNotice></div>;
  }
  return null;
}

function Dashboard() {
  const query = useDashboardOverview();
  const metrics = query.data?.operationalMetrics;
  const dailyUsage = metrics?.dailyAcceptedCupUsage?.slice(-7) ?? [];
  const maximumCups = Math.max(1, ...dailyUsage.map(({ cups }) => cups ?? 0));
  const usagePeriod = query.data?.usagePeriodStart && query.data.usagePeriodEnd
    ? `${formatApiDate(query.data.usagePeriodStart, false)} – ${formatApiDate(query.data.usagePeriodEnd, false)}`
    : "—";

  return <DashboardOverview title="Tổng quan vận hành" description="Chỉ số vận hành do Dolores trả về cho Moderator." actions={<DoloresButton href={PATH_MODERATOR.invoices}>Việc cần xử lý</DoloresButton>} showMobileActionsMenu={false} metrics={[
    { label: "Tenant toàn hệ thống", value: formatCount(metrics?.totalTenants) },
    { label: "Hợp đồng sắp hết hạn · 30 ngày", value: formatCount(metrics?.expiringContractsWithin30Days) },
    { label: "Ticket bảo trì đang mở", value: formatCount(metrics?.openMaintenanceTickets) },
    { label: "Work order lắp đặt đang mở", value: formatCount(metrics?.openInstallationWorkOrders) },
  ]}>
    <ApiReadStatus query={query} subject="tổng quan vận hành" />
    {query.data && <>
      <DoloresPanel className="dl-moderator-chart">
        <DoloresPanelTitle>Số ly hợp lệ theo ngày</DoloresPanelTitle>
        <p className="-mt-3 text-[13px] leading-[1.45] text-[#706561]">Khoảng thống kê: {usagePeriod} · tổng {formatCount(metrics?.cupsInSelectedPeriod)} ly</p>
        {dailyUsage.length > 0 ? <div className="dl-moderator-bars mt-6 grid grid-cols-[32px_1fr] gap-4">
          <div className="flex h-[186px] flex-col justify-between pb-5 text-[10px] text-[#706561]"><span>{formatCount(maximumCups)}</span><span>{formatCount(Math.round(maximumCups / 2))}</span><span>0</span></div>
          <div className="grid grid-cols-7 items-end gap-3">
            {dailyUsage.map(({ date, cups }, index) => {
              const value = cups ?? 0;
              return <div className="flex h-[186px] flex-col items-stretch justify-end" key={date ?? index}>
                <span className="mb-1 text-center text-[11px] font-medium">{formatCount(value)}</span>
                <div className="rounded-t-[5px] bg-[#F4E9E3]" style={{ height: `${Math.round((value / maximumCups) * 132)}px` }} />
                <span className="pt-2 text-center text-[10px] text-[#706561]">{formatApiDate(date, false).slice(0, 5)}</span>
              </div>;
            })}
          </div>
        </div> : <div role="status" aria-live="polite"><DoloresNotice title="Chưa có dữ liệu theo ngày">Dolores chưa trả về số ly hợp lệ trong khoảng thống kê này.</DoloresNotice></div>}
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Phạm vi dữ liệu</DoloresPanelTitle>
        <p className="text-sm">Scope: {query.data.scope}</p>
        <p className="mt-1 text-[13px] text-[#706561]">Cập nhật đến {formatApiDate(query.data.asOfDate, false)}.</p>
      </DoloresPanel>
    </>}
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

function isCanonicalUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function UnsupportedModeratorWrite({ title, description, returnHref }: {
  title: string;
  description: string;
  returnHref: string;
}) {
  return <DoloresPage title={title} description={description} actions={<DoloresButton href={returnHref} variant="secondary">Quay lại danh sách</DoloresButton>}>
    <DoloresNotice title="Chưa khả dụng trong Phase 2">
      Phase này chỉ bật các lượt đọc đã được xác nhận cho Moderator. Không có yêu cầu ghi nào được gửi từ màn hình này.
    </DoloresNotice>
  </DoloresPage>;
}

function LegacyRecordUnavailable({ subject, returnHref }: { subject: string; returnHref: string }) {
  return <DoloresPage title={`Không tìm thấy ${subject}`} description="Đường dẫn này dùng ID của dữ liệu minh họa cũ, không phải ID chuẩn từ Dolores." actions={<DoloresButton href={returnHref} variant="secondary">Mở danh sách API</DoloresButton>}>
    <DoloresNotice title="ID mẫu cũ">Hãy mở hồ sơ từ danh sách đang lấy dữ liệu API. Không gửi ID này tới Dolores.</DoloresNotice>
  </DoloresPage>;
}

function TenantListScreen() {
  const query = useTenants();
  const rows = (query.data ?? []).map((tenant) => [
    <Link href={PATH_MODERATOR.customerDetail(tenant.id)} key={tenant.id}>{tenant.name}</Link>,
    tenant.type ?? "—",
    tenant.billingExempt == null ? "—" : tenant.billingExempt ? "Có" : "Không",
    tenant.id,
  ]);

  return <DoloresPage title="Khách hàng & tổ chức" description="Danh sách tenant do Dolores trả về. API cung cấp tên tổ chức, loại tenant và trạng thái miễn trừ hóa đơn." actions={<ActionBar items={[["Danh sách hợp đồng", PATH_MODERATOR.contracts, "secondary"]]} />}>
    <ApiReadStatus query={query} subject="tổ chức" />
    {query.data !== undefined && query.data.length === 0 && !query.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có tổ chức">Dolores hiện không trả về tenant nào.</DoloresNotice></div>}
    {rows.length > 0 && <DoloresPanel><DoloresPanelTitle>Tổ chức từ Dolores</DoloresPanelTitle><DoloresTable headers={["Tổ chức", "Loại tenant", "Miễn trừ hóa đơn", "Tenant ID"]} rows={rows} /></DoloresPanel>}
    <DoloresNotice title="Tạo tài khoản chưa khả dụng">Dữ liệu API này mô tả tổ chức (tenant), không phải tài khoản đăng nhập. Tạo tài khoản khách hàng chưa nằm trong Phase 2.</DoloresNotice>
  </DoloresPage>;
}

function TenantDetailScreen({ tenantId }: { tenantId: string }) {
  const query = useTenant(tenantId);
  const tenant = query.data;

  return <DoloresPage title="Hồ sơ tổ chức" description="Thông tin tổ chức do Dolores trả về." actions={<ActionBar items={[["Danh sách tổ chức", PATH_MODERATOR.customers, "secondary"], ["Danh sách hợp đồng", PATH_MODERATOR.contracts, "primary"]]} />}>
    <ApiReadStatus query={query} subject="tổ chức" />
    {tenant && <DoloresPanel><DoloresPanelTitle>{tenant.name}</DoloresPanelTitle><DoloresFieldGrid>
      <DoloresField label="Tenant ID" value={tenant.id} />
      <DoloresField label="Loại tenant" value={tenant.type ?? "—"} />
      <DoloresField label="Miễn trừ hóa đơn" value={tenant.billingExempt == null ? "—" : tenant.billingExempt ? "Có" : "Không"} />
    </DoloresFieldGrid></DoloresPanel>}
  </DoloresPage>;
}

function ContractListScreen() {
  const tenantsQuery = useTenants();
  const platform = usePlatformContracts(tenantsQuery.data, tenantsQuery.data !== undefined && !tenantsQuery.isError);
  const rows = platform.contracts.map(({ tenant, contract }) => [
    <Link href={PATH_MODERATOR.contractDetail(contract.id)} key={contract.id}>{contract.id}</Link>,
    <Link href={PATH_MODERATOR.customerDetail(tenant.id)} key={tenant.id}>{tenant.name}</Link>,
    contract.machineId ?? "—",
    contract.startDate ? formatApiDate(contract.startDate, false) : "—",
    formatApiDate(contract.endDate, false),
    contract.status,
  ]);

  return <DoloresPage title="Danh sách hợp đồng" description="Hợp đồng được đọc từ API theo từng tenant; ID điều hướng là UUID do Dolores cấp." actions={<ActionBar items={[["Danh sách tổ chức", PATH_MODERATOR.customers, "secondary"]]} />}>
    <ApiReadStatus query={tenantsQuery} subject="danh sách tổ chức" />
    {tenantsQuery.data !== undefined && tenantsQuery.data.length === 0 && !tenantsQuery.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có hợp đồng">Không có tenant để truy vấn hợp đồng.</DoloresNotice></div>}
    {tenantsQuery.data && tenantsQuery.data.length > 0 && platform.isLoading && <div role="status" aria-live="polite"><DoloresNotice title="Đang tải hợp đồng">Đang đọc hợp đồng theo từng tenant từ Dolores.</DoloresNotice></div>}
    {platform.failedTenants.length > 0 && <div role="alert" aria-live="assertive"><DoloresNotice title="Một số tenant chưa tải được hợp đồng">
      <p>Đã tải xong {platform.completedTenantCount} / {tenantsQuery.data?.length ?? 0} tenant. Các tenant lỗi không bị coi là danh sách rỗng.</p>
      <DoloresButton onClick={platform.retryFailed} variant="secondary">Thử lại tenant lỗi</DoloresButton>
    </DoloresNotice></div>}
    {rows.length === 0 && tenantsQuery.data && tenantsQuery.data.length > 0 && !platform.isLoading && platform.failedTenants.length === 0 && !tenantsQuery.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có hợp đồng">Dolores không trả về hợp đồng cho các tenant đã tải.</DoloresNotice></div>}
    {rows.length > 0 && <DoloresPanel><DoloresPanelTitle>Hợp đồng từ Dolores ({rows.length})</DoloresPanelTitle><DoloresTable headers={["Contract ID", "Tổ chức", "Machine ID", "Bắt đầu", "Kết thúc", "Trạng thái"]} rows={rows} /></DoloresPanel>}
    <DoloresNotice title="Tạo hợp đồng chưa khả dụng">Danh sách hiện chỉ hỗ trợ đọc. Không có thao tác tạo, kích hoạt, quyết định hết hạn, chấm dứt, thay thế hoặc tải tài liệu ở Phase 2.</DoloresNotice>
  </DoloresPage>;
}

function ContractDetailScreen({ contractId }: { contractId: string }) {
  const query = useContractById(contractId);
  const contract = query.data;
  const tenantQuery = useTenant(contract?.tenantId);
  const documentsQuery = useContractDocuments(contract?.tenantId, contract?.id, Boolean(contract));
  const documents = documentsQuery.data ?? [];

  return <DoloresPage title="Chi tiết hợp đồng" description="Thông tin hợp đồng và metadata hồ sơ do Dolores trả về." actions={<ActionBar items={[["Danh sách hợp đồng", PATH_MODERATOR.contracts, "secondary"]]} />}>
    <ApiReadStatus query={query} subject="hợp đồng" />
    {contract && <ApiReadStatus query={tenantQuery} subject="tổ chức của hợp đồng" />}
    {contract && <DoloresPanel><DoloresPanelTitle>Hợp đồng {contract.id}</DoloresPanelTitle><DoloresFieldGrid>
      <DoloresField label="Tổ chức" value={tenantQuery.data?.name ?? contract.tenantId} />
      <DoloresField label="Tenant ID" value={contract.tenantId} />
      <DoloresField label="Machine ID" value={contract.machineId ?? "—"} />
      <DoloresField label="Loại máy theo hợp đồng" value={contract.machineTypeSnapshot ?? "—"} />
      <DoloresField label="Ngày bắt đầu" value={contract.startDate ? formatApiDate(contract.startDate, false) : "—"} />
      <DoloresField label="Ngày kết thúc" value={formatApiDate(contract.endDate, false)} />
      <DoloresField label="Trạng thái" value={contract.status} />
      <DoloresField label="Tiền thuê tháng" value={contract.monthlyRentalFee == null ? "—" : `${contract.monthlyRentalFee} đ`} />
      <DoloresField label="Tiền đặt cọc" value={contract.depositAmount == null ? "—" : `${contract.depositAmount} đ`} />
      <DoloresField label="Điều khoản" value={contract.terms ?? contract.termsSnapshot ?? "—"} />
    </DoloresFieldGrid></DoloresPanel>}
    {contract && <section aria-label="Contract document metadata">
      <ApiReadStatus query={documentsQuery} subject="metadata tài liệu hợp đồng" />
      {documents.length === 0 && documentsQuery.data !== undefined && !documentsQuery.isError && <div role="status" aria-live="polite"><DoloresNotice title="Chưa có metadata tài liệu">Dolores không trả về tài liệu nào cho hợp đồng này.</DoloresNotice></div>}
      {documents.length > 0 && <DoloresPanel><DoloresPanelTitle>Metadata tài liệu</DoloresPanelTitle><DoloresTable headers={["Loại", "Tên tệp", "Content type", "Kích thước", "Phiên bản", "Người tải", "Thời điểm", "Lưu trữ"]} rows={documents.map((document) => [
        document.documentType,
        document.originalFilename,
        document.contentType,
        formatCount(document.sizeBytes),
        document.version,
        document.uploadedBy ?? "—",
        formatApiDate(document.uploadedAt),
        document.archivedAt ? "Đã lưu trữ" : "Đang hoạt động",
      ])} /></DoloresPanel>}
    </section>}
  </DoloresPage>;
}

function ContractScreens({ path }: { path: string }) {
  const route = getCentralizedModeratorPath(path);
  if (route === PATH_MODERATOR.contracts || route === PATH_MODERATOR.contractsList) return <ContractListScreen />;
  if (route.startsWith(`${PATH_MODERATOR.contracts}/`)) {
    const contractId = route.slice(PATH_MODERATOR.contracts.length + 1);
    if (contractId === "new") return <UnsupportedModeratorWrite title="Tạo hợp đồng chưa khả dụng" description="Phase 2 chỉ cung cấp dữ liệu đọc từ Dolores." returnHref={PATH_MODERATOR.contracts} />;
    if (isCanonicalUuid(contractId)) return <ContractDetailScreen contractId={contractId} />;
    if (/^C-\d{3}$/i.test(contractId)) return <LegacyRecordUnavailable subject="hợp đồng" returnHref={PATH_MODERATOR.contracts} />;
    if (contractId === "expiry") return <UnsupportedModeratorWrite title="Quyết định hết hạn chưa khả dụng" description="Quyết định hết hạn chỉ thuộc chủ tenant; màn hình Moderator không gửi quyết định hoặc lời nhắc." returnHref={PATH_MODERATOR.contracts} />;
  }
  return <UnsupportedModeratorWrite title="Tác vụ hợp đồng chưa khả dụng" description="Route này không thuộc nhóm đọc hợp đồng đã được xác nhận cho Moderator." returnHref={PATH_MODERATOR.contracts} />;
}

function CustomerScreens({ path }: { path: string }) {
  const route = getCentralizedModeratorPath(path);
  if (route === PATH_MODERATOR.customers || route === PATH_MODERATOR.customersList) return <TenantListScreen />;
  if (route === PATH_MODERATOR.newCustomer) return <UnsupportedModeratorWrite title="Tạo tài khoản khách hàng chưa khả dụng" description="Phase 2 chỉ đọc tenant/organization. Không tạo tài khoản đăng nhập hoặc hồ sơ mới." returnHref={PATH_MODERATOR.customers} />;
  if (route.startsWith(`${PATH_MODERATOR.customers}/`)) {
    const tenantId = route.slice(PATH_MODERATOR.customers.length + 1);
    if (isCanonicalUuid(tenantId)) return <TenantDetailScreen tenantId={tenantId} />;
    return <LegacyRecordUnavailable subject="tổ chức" returnHref={PATH_MODERATOR.customers} />;
  }
  return <UnsupportedModeratorWrite title="Màn hình khách hàng chưa khả dụng" description="Chỉ danh sách và chi tiết tenant có ID UUID chuẩn được nối trong Phase 2." returnHref={PATH_MODERATOR.customers} />;
}
function InvoiceScreens({ path }: { path: string }) {
  return <ModeratorInvoicesScreen path={path} />;
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
  return <ModeratorRecipesScreen path={path} />;
}

function BuybackScreens({ path }: { path: string }) {
  return <ModeratorBuybackScreen path={path} />;
}
function Alerts() {
  const query = useAlerts();
  const rows = (query.data ?? []).map((alert) => [
    alert.level,
    alert.message,
    alert.machineId ? `Mã máy ${alert.machineId}` : "Hệ thống",
    formatApiDate(alert.ts),
    alert.acknowledged ? "Đã ghi nhận" : "Chưa ghi nhận",
  ]);
  return <DoloresPage title="Cảnh báo hệ thống" description="Cảnh báo đang hoạt động do Dolores trả về. API hiện không giới hạn danh sách theo tenant." actions={<ActionBar items={[["Yêu cầu kỹ thuật", PATH_MODERATOR.technicalRequests, "primary"], ["Thông báo", PATH_MODERATOR.notifications, "secondary"]]} />}>
    <ApiReadStatus query={query} subject="cảnh báo" />
    {query.data !== undefined && rows.length === 0 && !query.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có cảnh báo đang hoạt động">Dolores hiện không trả về cảnh báo nào.</DoloresNotice></div>}
    {query.data !== undefined && rows.length > 0 && <DoloresPanel><DoloresPanelTitle>Cảnh báo từ Dolores</DoloresPanelTitle><DoloresTable headers={["Mức độ", "Cảnh báo", "Đối tượng", "Thời điểm", "Trạng thái"]} rows={rows} /></DoloresPanel>}
  </DoloresPage>;
}

function Notifications() {
  const notificationsQuery = useNotifications();
  const unreadCountQuery = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();
  const rows = (notificationsQuery.data ?? []).map((notification) => [
    <div key={notification.id}><strong>{notification.title}</strong><p>{notification.message}</p></div>,
    notification.type,
    formatApiDate(notification.createdAt),
    notification.read ? "Đã đọc" : <div className="flex flex-wrap items-center gap-2"><span>Chưa đọc</span><DoloresButton
      variant="secondary"
      disabled={markReadMutation.isPending}
      onClick={() => markReadMutation.mutate(notification.id)}
    >{markReadMutation.isPending && markReadMutation.variables === notification.id ? "Đang đánh dấu…" : "Đánh dấu đã đọc"}</DoloresButton></div>,
  ]);
  return <DoloresPage title="Thông báo" description="Thông báo trong phạm vi operator do Dolores trả về." actions={<ActionBar items={[["Cảnh báo & nhắc việc", PATH_MODERATOR.notificationAlerts, "primary"]]} />}>
    <DoloresPanel><DoloresPanelTitle>Thông báo chưa đọc</DoloresPanelTitle>
      <p className="text-2xl font-semibold" role="status" aria-live="polite">{unreadCountQuery.data ? formatCount(unreadCountQuery.data.unreadCount) : "—"}</p>
      <ApiReadStatus query={unreadCountQuery} subject="số thông báo chưa đọc" />
    </DoloresPanel>
    <ApiReadStatus query={notificationsQuery} subject="thông báo" />
    {markReadMutation.isError && <div role="alert" aria-live="assertive"><DoloresNotice title="Không thể đánh dấu thông báo đã đọc">{getReadErrorMessage(markReadMutation.error, "thông báo")}</DoloresNotice></div>}
    {notificationsQuery.data !== undefined && rows.length === 0 && !notificationsQuery.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có thông báo">Dolores hiện không trả về thông báo nào.</DoloresNotice></div>}
    {notificationsQuery.data !== undefined && rows.length > 0 && <DoloresPanel><DoloresPanelTitle>Danh sách thông báo</DoloresPanelTitle><DoloresTable headers={["Nội dung", "Loại", "Ngày", "Trạng thái"]} rows={rows} /></DoloresPanel>}
  </DoloresPage>;
}


export function ModeratorSectionPage({ sections }: { sections: string[] }) {
  const path = sections.join("/");
  if (!path) return <Dashboard />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.contracts)) return <ContractScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.customers)) return <CustomerScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.invoices)) return <InvoiceScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.machines)) return <ModeratorMachinesScreen path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.iot)) return <ModeratorIoTScreen path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.menu)) return <MenuScreens path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.technicalRequests)) return <ModeratorTechnicalScreen path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.machineHistory)) return <ModeratorTechnicalScreen path={path} />;
  if (getCentralizedModeratorPath(path).startsWith(PATH_MODERATOR.buyback)) return <BuybackScreens path={path} />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.notificationAlerts) return <Alerts />;
  if (getCentralizedModeratorPath(path) === PATH_MODERATOR.notifications) return <Notifications />;
  return <DoloresPage title="Không tìm thấy màn hình" description={`Đường dẫn ${getCentralizedModeratorPath(path)} chưa được ánh xạ.`} actions={<DoloresButton href={PATH_MODERATOR.root}>Về tổng quan</DoloresButton>}><DoloresNotice title="Không có frame tương ứng">Chọn một mục trong menu để tiếp tục.</DoloresNotice></DoloresPage>;
}
