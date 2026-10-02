"use client";

import { useState } from "react";
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
type Overlay = "role-picker" | "confirm" | "success" | null;
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
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <DoloresField label={label} required={required} className={className}>
      <input className="min-h-5 bg-transparent text-[13px] leading-5 text-[#302927] outline-none" value={value} onChange={(event) => onChange(event.target.value)} />
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
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNT_FIXTURES);
  const entryView: AccountView = initialView === "create-customer" ? "create-customer" : initialView === "tenant" ? "tenant" : initialView === "staff" ? "staff" : "list";
  const [view, setView] = useState<AccountView>(entryView);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [returnTo, setReturnTo] = useState<"list" | "form">("list");
  const [action, setAction] = useState<SaveAction>("create");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(entryView === "tenant" ? 0 : entryView === "staff" ? 1 : null);
  const [form, setForm] = useState<Account>(entryView === "staff" ? ROLE_DEFAULTS.Moderator : ROLE_DEFAULTS["Khách hàng"]);

  const updateField = (field: keyof Account, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const beginCreate = (role: AccountRole) => {
    setForm({ ...ROLE_DEFAULTS[role] });
    setView(role === "Khách hàng" ? "create-customer" : role === "Moderator" ? "create-moderator" : "create-technician");
    setOverlay(null);
  };
  const openRolePicker = () => {
    setReturnTo(view === "list" ? "list" : "form");
    setOverlay("role-picker");
  };
  const openAccount = (account: Account, index: number) => {
    setForm({ ...account });
    setSelectedIndex(index);
    setView(account.role === "Khách hàng" ? "tenant" : "staff");
  };
  const startSave = (nextAction: SaveAction) => {
    setAction(nextAction);
    setOverlay("confirm");
  };
  const confirmSave = () => {
    if (action === "create") {
      setAccounts((current) => [...current, { ...form }]);
    } else if (selectedIndex !== null) {
      setAccounts((current) => current.map((account, index) => index === selectedIndex ? { ...form } : account));
    }
    setOverlay("success");
  };
  const finishSuccess = () => {
    setOverlay(null);
    setView("list");
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
      <DoloresPage title={formTitle} description={isCustomer ? "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." : undefined} actions={<><DoloresButton onClick={() => startSave("create")}>{formTitle}</DoloresButton><DoloresButton onClick={openRolePicker} variant="secondary">{isCustomer ? "Đổi vai trò tài khoản" : "Đổi vai trò"}</DoloresButton><DoloresButton onClick={() => setView("list")} variant="secondary">Hủy</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <AccountInput label="Họ tên" required value={form.name} onChange={(value) => updateField("name", value)} />
          <AccountInput label="Email đăng nhập" required value={form.email} onChange={(value) => updateField("email", value)} />
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
      <DoloresPage title={isTenant ? "Tài khoản Tenant · quyền & trạng thái" : isTechnician ? "Quản lý tài khoản Technician" : "Quản lý tài khoản nhân sự"} description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => startSave("update")}>{isTenant ? "Lưu thay đổi" : "Lưu thay đổi tài khoản"}</DoloresButton><DoloresButton onClick={() => setView("list")} variant="secondary">Về danh sách</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <AccountInput label={isTenant ? "Khách hàng" : "Họ tên"} value={form.name} onChange={(value) => updateField("name", value)} />
          {isTenant ? <AccountInput label="Cửa hàng" value={form.scope} onChange={(value) => updateField("scope", value)} /> : <AccountInput label="Vai trò" value={form.role} onChange={(value) => updateField("role", value === "Technician" ? "Technician" : "Moderator")} />}
          {isTenant ? <AccountInput label="Vai trò" value="Tenant" onChange={() => undefined} /> : <AccountInput label="Email đăng nhập" value={form.email} onChange={(value) => updateField("email", value)} />}
          <AccountInput label={isTenant ? "Trạng thái tài khoản" : "Trạng thái"} value={form.status} onChange={(value) => updateField("status", value)} />
          {!isTenant && <AccountInput className="col-span-2" label="Phạm vi theo vai trò" value={form.scope} onChange={(value) => updateField("scope", value)} />}
        </DoloresFieldGrid></DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <>
      {page}
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
