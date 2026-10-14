"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { demoAccountSchema } from "@/schemas/doloresDemo";
import { useRouteView } from "@/components/dolores/useRouteView";
import { readDemoRecord, writeDemoRecord } from "@/components/dolores/demoFlowStore";
import type { ReactNode } from "react";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { DoloresNotice } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type AccountRole = "Khách hàng" | "Moderator" | "Technician";
type Account = { name: string; email: string; role: AccountRole; scope: string; status: string };
type AccountView = "list" | "create-customer" | "create-moderator" | "create-technician" | "tenant" | "staff";
type Overlay = "role-picker" | "confirm" | "success" | "error" | null;
type SaveAction = "create" | "update";

const ACCOUNT_FIXTURES: Account[] = [
  { name: "Nguyễn Minh Anh", email: "minhanh@example.vn", role: "Khách hàng", scope: "Cà phê Mộc", status: "Đang hoạt động" },
  { name: "Lan Anh", email: "lananh@example.vn", role: "Moderator", scope: "Vận hành Dolores", status: "Đang hoạt động" },
  { name: "Nguyễn Văn Nam", email: "nam@example.vn", role: "Technician", scope: "Công việc được giao", status: "Đang hoạt động" },
];

const ROLE_DEFAULTS: Record<AccountRole, Account> = {
  "Khách hàng": { name: "Nguyễn Minh Anh", email: "minhanh@example.vn", role: "Khách hàng", scope: "Cà phê Mộc", status: "Đang hoạt động" },
  Moderator: { name: "Lan Anh", email: "lananh@example.vn", role: "Moderator", scope: "Vận hành Dolores", status: "Đang hoạt động" },
  Technician: { name: "Nguyễn Văn Nam", email: "nam@example.vn", role: "Technician", scope: "Công việc được giao", status: "Đang hoạt động" },
};

function AccountInput({
  label,
  value,
  required,
  onChange,
  className = "",
  error,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
  className?: string;
  error?: string;
}) {
  const id = useId();
  return (
    <DoloresField label={label} required={required} className={className}>
      <input aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="min-h-5 bg-transparent text-[13px] leading-5 text-[#302927] outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <span id={`${id}-error`} className="text-xs text-[#B81724]">{error}</span>}
    </DoloresField>
  );
}

function AccountSummary({ account }: { account: Account }) {
  return <>{account.name} · {account.email} · vai trò {account.role === "Khách hàng" ? "Tenant" : account.role} · {account.status.toLowerCase()}.</>;
}

function ModalFrame({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>;
}

function ModalButton({ children, onClick, primary = false }: { children: string; onClick: () => void; primary?: boolean }) {
  return <button className={"flex h-12 w-full items-center justify-center rounded-[10px] px-4 py-3 text-sm font-medium " + (primary ? "bg-[#B81724] text-white hover:opacity-[0.88] active:opacity-[0.72]" : "border border-[#E9E2DC] bg-white text-[#302927] hover:bg-[#F7F5F3]")} onClick={onClick}>{children}</button>;
}

export default function AdminAccountScreens({ initialView = "list" }: { initialView?: string }) {
  const accountParam = useSearchParams().get("account");
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNT_FIXTURES);
  const entryView: AccountView = ["create-customer", "create-moderator", "create-technician", "tenant", "staff"].includes(initialView) ? initialView as AccountView : "list";
  const [view, setView] = useRouteView<AccountView>(entryView);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [returnTo, setReturnTo] = useState<"list" | "form">("list");
  const [action, setAction] = useState<SaveAction>("create");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(entryView === "tenant" ? 0 : entryView === "staff" ? 1 : null);
  const [form, setForm] = useState<Account>(entryView === "staff" ? ROLE_DEFAULTS.Moderator : ROLE_DEFAULTS["Khách hàng"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    const saved = readDemoRecord("admin:accounts");
    try {
      const parsed = demoAccountSchema.array().safeParse(JSON.parse(saved?.payload.accounts ?? "null"));
      if (parsed.success) setAccounts(parsed.data);
    } catch { /* Keep fixtures when stored data is invalid. */ }
  }, []);
  useEffect(() => {
    setOverlay(null);
    setErrors({});
    if (entryView.startsWith("create-")) {
      setForm({ ...ROLE_DEFAULTS[entryView === "create-moderator" ? "Moderator" : entryView === "create-technician" ? "Technician" : "Khách hàng"] });
    }
  }, [entryView]);

  useEffect(() => {
    if (entryView !== 'tenant' && entryView !== 'staff') return;
    const requested = accountParam !== null && /^\d+$/.test(accountParam) ? Number(accountParam) : entryView === 'tenant' ? 0 : 1;
    const account = accounts[requested];
    if (account && (entryView === 'tenant' ? account.role === 'Khách hàng' : account.role !== 'Khách hàng')) {
      setSelectedIndex(requested); setForm({ ...account });
    }
  }, [entryView, accountParam, accounts]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Vui lòng bổ sung trước khi gửi";
    if (!demoAccountSchema.shape.email.safeParse(form.email.trim()).success) next.email = "Vui lòng bổ sung email hợp lệ trước khi gửi";
    setErrors(next);
    if (Object.keys(next).length) { setOverlay("error"); return false; }
    return true;
  };

  const updateField = (field: keyof Account, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const beginCreate = (role: AccountRole) => {
    setForm({ ...ROLE_DEFAULTS[role] });
    setView(role === "Khách hàng" ? "create-customer" : role === "Moderator" ? "create-moderator" : "create-technician", { account: null });
    setOverlay(null);
  };
  const openRolePicker = () => {
    setReturnTo(view === "list" ? "list" : "form");
    setOverlay("role-picker");
  };
  const openAccount = (account: Account, index: number) => {
    setForm({ ...account });
    setSelectedIndex(index);
    setView(account.role === "Khách hàng" ? "tenant" : "staff", { account: String(index) });
  };
  const startSave = (nextAction: SaveAction) => {
    if (!validate()) return;
    setAction(nextAction);
    setOverlay("confirm");
  };
  const confirmSave = () => {
    if (!validate()) return;
    const clean = { ...form, name: form.name.trim(), email: form.email.trim() };
    const next = action === "create" ? [...accounts, clean] : accounts.map((account, index) => index === selectedIndex ? clean : account);
    if (!writeDemoRecord("admin:accounts", "saved", { accounts: JSON.stringify(next) })) return;
    setAccounts(next);
    setOverlay("success");
  };
  const finishSuccess = () => {
    setOverlay(null);
    setView("list", { account: null });
  };

  let page: React.ReactNode;
  if (view === "list") {
    page = (
      <DoloresPage title="Tài khoản toàn hệ thống" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton onClick={openRolePicker}>Tạo tài khoản</DoloresButton>}>
        <DoloresPanel>
          <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
          <DoloresTable headers={["Họ tên", "Vai trò", "Phạm vi", "Trạng thái"]} rows={accounts.map((account, index) => [
            <button className="font-semibold text-left hover:text-[#B81724]" key={account.email + index} onClick={() => openAccount(account, index)}>{account.name}</button>,
            account.role,
            account.scope,
            account.status.replace("Đang ", ""),
          ])} />
        </DoloresPanel>
      </DoloresPage>
    );
  } else if (view === "create-customer" || view === "create-moderator" || view === "create-technician") {
    const isCustomer = view === "create-customer";
    const roleTitle = isCustomer ? "khách hàng" : view === "create-moderator" ? "Moderator" : "Technician";
    const formTitle = isCustomer ? "Tạo tài khoản khách hàng" : `Tạo tài khoản ${roleTitle}`;
    page = (
      <DoloresPage title={formTitle} description={isCustomer ? "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." : undefined} actions={<><DoloresButton onClick={() => startSave("create")}>{formTitle}</DoloresButton><DoloresButton onClick={openRolePicker} variant="secondary">{isCustomer ? "Đổi vai trò tài khoản" : "Đổi vai trò"}</DoloresButton><DoloresButton onClick={() => setView("list", { account: null })} variant="secondary">Hủy</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <AccountInput label="Họ tên" required error={errors.name} value={form.name} onChange={(value) => updateField("name", value)} />
          <AccountInput label="Email đăng nhập" required error={errors.email} value={form.email} onChange={(value) => updateField("email", value)} />
          <AccountInput label="Vai trò" value={isCustomer ? "Khách hàng / Tenant" : form.role} onChange={(value) => updateField("role", value === "Moderator" || value === "Technician" ? value : "Khách hàng")} />
          {isCustomer ? <AccountInput label="Cửa hàng được cấp" value={form.scope} onChange={(value) => updateField("scope", value)} /> : <AccountInput label="Trạng thái" value={form.status} onChange={(value) => updateField("status", value)} />}
          {isCustomer && <AccountInput className="col-span-2" label="Trạng thái" value={form.status} onChange={(value) => updateField("status", value)} />}
        </DoloresFieldGrid></DoloresPanel>
        {isCustomer && <DoloresNotice title="Quyền tạo tài khoản">Admin tạo và quản lý cả Khách hàng, Moderator và Technician. Moderator được tạo tài khoản khách hàng.</DoloresNotice>}
      </DoloresPage>
    );
  } else {
    const isTenant = view === "tenant";
    const isTechnician = form.role === "Technician";
    page = (
      <DoloresPage title={isTenant ? "Tài khoản Tenant · quyền & trạng thái" : isTechnician ? "Quản lý tài khoản Technician" : "Quản lý tài khoản nhân sự"} description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => startSave("update")}>{isTenant ? "Lưu thay đổi" : "Lưu thay đổi tài khoản"}</DoloresButton><DoloresButton onClick={() => setView("list", { account: null })} variant="secondary">Về danh sách</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <AccountInput label={isTenant ? "Khách hàng" : "Họ tên"} error={errors.name} value={form.name} onChange={(value) => updateField("name", value)} />
          {isTenant ? <AccountInput label="Cửa hàng" value={form.scope} onChange={(value) => updateField("scope", value)} /> : <AccountInput label="Vai trò" value={form.role} onChange={(value) => updateField("role", value === "Technician" ? "Technician" : "Moderator")} />}
          {isTenant ? <AccountInput label="Vai trò" value="Tenant" onChange={() => undefined} /> : <AccountInput label="Email đăng nhập" error={errors.email} value={form.email} onChange={(value) => updateField("email", value)} />}
          <AccountInput label={isTenant ? "Trạng thái tài khoản" : "Trạng thái"} value={form.status} onChange={(value) => updateField("status", value)} />
          {!isTenant && <AccountInput className="col-span-2" label="Phạm vi theo vai trò" value={form.scope} onChange={(value) => updateField("scope", value)} />}
        </DoloresFieldGrid></DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <>
      {page}
      {overlay === "error" && <ModalFrame labelledBy="account-error-title"><section className="flex w-full max-w-[580px] flex-col gap-5 rounded-[20px] bg-white p-8 text-[#292625]">
        <p className="text-sm font-semibold leading-[1.45]">Cần bổ sung thông tin</p>
        <h2 id="account-error-title" className="text-[26px] font-semibold leading-[1.45]">Chưa thể gửi thông tin</h2>
        <p className="text-base leading-[1.45]">Hồ sơ đang thiếu trường bắt buộc hoặc tài liệu đính kèm. Bổ sung thông tin được đánh dấu rồi gửi lại.</p>
        {Object.entries(errors).map(([field, message]) => <div key={field} className="rounded-[10px] border border-[#B81724] px-4 py-3"><p className="text-xs text-[#706561]">{field === "name" ? "Họ tên *" : "Email đăng nhập *"}</p><p className="mt-1 text-sm">{message}</p></div>)}
        <ModalButton primary onClick={() => { setOverlay(null); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus()); }}>Quay lại bổ sung</ModalButton>
        <ModalButton onClick={() => setOverlay(null)}>Đóng</ModalButton>
      </section></ModalFrame>}
      {overlay === "role-picker" && <ModalFrame labelledBy="role-picker-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">Kiểm tra trước khi tiếp tục</p><h2 id="role-picker-title" className="mt-3 text-xl font-semibold leading-7">Chọn vai trò tài khoản</h2><p className="mt-3 text-[13px] leading-5">Admin được tạo và quản lý cả ba nhóm tài khoản.</p>
        <div className="mt-5 grid gap-5"><ModalButton onClick={() => beginCreate("Khách hàng")} primary>Khách hàng</ModalButton><ModalButton onClick={() => beginCreate("Moderator")}>Moderator</ModalButton><ModalButton onClick={() => beginCreate("Technician")}>Technician</ModalButton><ModalButton onClick={() => setOverlay(null)}>Đóng</ModalButton></div>
      </section></ModalFrame>}
      {overlay === "confirm" && <ModalFrame labelledBy="account-confirm-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">Kiểm tra trước khi tiếp tục</p>
        <h2 id="account-confirm-title" className="mt-3 text-xl font-semibold leading-7">{action === "create" ? view === "create-customer" ? "Xác nhận · Tạo tài khoản Tenant" : `Tạo tài khoản ${form.role}` : view === "tenant" ? "Xác nhận" : "Lưu quyền và trạng thái tài khoản"}</h2>
        <p className="mt-3 text-[13px] leading-5">{action === "create" ? <AccountSummary account={form} /> : view === "tenant" ? `Cập nhật trạng thái và phạm vi Tenant ${form.name} theo thông tin đang hiển thị.` : "Admin cập nhật trạng thái, vai trò và phạm vi tài khoản đang quản lý."}</p>
        <div className="mt-5 grid gap-5"><ModalButton onClick={confirmSave} primary>Xác nhận</ModalButton><ModalButton onClick={() => setOverlay(null)}>Đóng</ModalButton></div>
      </section></ModalFrame>}
      {overlay === "success" && <ModalFrame labelledBy="account-success-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">Thông tin tài khoản</p><h2 id="account-success-title" className="mt-3 text-xl font-semibold leading-7">{action === "create" && view === "create-customer" ? "Đã ghi nhận thành công" : "Đã lưu thông tin"}</h2><p className="mt-3 text-[13px] leading-5"><AccountSummary account={form} /></p>
        <div className="mt-5"><ModalButton onClick={finishSuccess} primary>Về danh sách</ModalButton></div>
      </section></ModalFrame>}
    </>
  );
}
