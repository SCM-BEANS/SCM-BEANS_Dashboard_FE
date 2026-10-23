"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { useRouteView } from "@/app/(admin)/admin/_components/useRouteView";
import {
  AdminConfirmAccountCreateDialog,
  AdminConfirmAccountDisableDialog,
  AdminConfirmAccountReactivateDialog,
  AdminConfirmAccountUpdateDialog,
  AdminConfirmPasswordReissueDialog,
} from "@/app/(admin)/admin/_components/AdminConfirmationDialogs";
import { DoloresButton, DoloresField, DoloresFieldGrid, DoloresNotice, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/app/_ui/dolores/DoloresUI";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import { useTenants } from "@/hooks/dolores/useTenants";
import { useAdminUser, useAdminUserMutations, useAdminUsers } from "@/hooks/idaas/useAdminUsers";
import {
  AdminUserCreateRequestSchema,
  AdminUserUpdateRequestSchema,
  type AdminUser,
  type AdminUserRole,
  type AdminUserUpdateRequest,
} from "@/schemas/idaas/adminUsers";
import type { AdminAccountView } from "@/routes/query";

type AccountForm = { name: string; email: string; role: AdminUserRole | ""; tenantId: string };
type Overlay = "confirm" | "success" | "error" | null;
type PendingAction = "create" | "update" | "disable" | "reactivate" | "reissue";

const roleLabels: Record<AdminUserRole, string> = {
  owner: "Khách hàng / Tenant",
  moderator: "Moderator",
  technician: "Technician",
};
const userIdSchema = z.string().uuid();
const accountViewSchema = z.enum(["list", "create", "tenant", "staff"]);
const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

function supportedRole(user: AdminUser): AdminUserRole | null {
  return user.roles.find((role): role is AdminUserRole => role === "owner" || role === "technician" || role === "moderator") ?? null;
}

function formFromUser(user: AdminUser): AccountForm {
  return { name: user.name, email: user.email, role: supportedRole(user) ?? "moderator", tenantId: user.tenant_id ?? "" };
}

function roleLabel(role: string | null) {
  if (role === "owner") return roleLabels.owner;
  if (role === "moderator") return roleLabels.moderator;
  if (role === "technician") return roleLabels.technician;
  return role || "Không rõ";
}

function getApiErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    if (error.includes("email_already_exists")) return "Email này đã được sử dụng.";
    if (error.includes("forbidden")) return "Tài khoản hiện tại không có quyền thực hiện thao tác này.";
    if (error.includes("user_not_found")) return "Không tìm thấy tài khoản này.";
    if (error.includes("invalid_request")) return "Thông tin gửi lên chưa hợp lệ.";
    return error;
  }
  if (error && typeof error === "object") {
    const payload = error as { error?: unknown; message?: unknown };
    if (typeof payload.error === "string") return getApiErrorMessage(payload.error);
    if (typeof payload.message === "string") return payload.message;
  }
  return "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

function fieldErrorMessage(error: z.ZodError, field: string): string | undefined {
  if (!error.issues.some((issue) => issue.path[0] === field)) return undefined;
  if (field === "name") return "Họ tên cần có từ 2 đến 50 ký tự.";
  if (field === "email") return "Vui lòng nhập email hợp lệ.";
  if (field === "role") return "Vui lòng chọn vai trò tài khoản.";
  if (field === "tenant_id") return "Chọn một tenant hợp lệ cho tài khoản khách hàng.";
  return "Thông tin chưa hợp lệ.";
}

function AccountInput({
  label, value, onChange, required, error, type = "text", className = "",
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean;
  error?: string; type?: "text" | "email"; className?: string;
}) {
  const id = useId();
  return <DoloresField label={label} required={required} className={className}>
    <input id={id} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      autoComplete={type === "email" ? "email" : "off"} className="min-h-5 bg-transparent text-[13px] leading-5 text-[#302927] outline-none"
      type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    {error && <span id={`${id}-error`} className="text-xs text-[#B81724]">{error}</span>}
  </DoloresField>;
}

function AccountSelect({
  label, value, onChange, options, required, disabled = false, error,
}: {
  label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>;
  required?: boolean; disabled?: boolean; error?: string;
}) {
  const id = useId();
  return <DoloresField label={label} required={required}>
    <select id={id} aria-label={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      className="min-h-5 bg-transparent text-[13px] leading-5 text-[#302927] outline-none disabled:text-[#9A918C]"
      value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error && <span id={`${id}-error`} className="text-xs text-[#B81724]">{error}</span>}
  </DoloresField>;
}

function ModalFrame({ children, labelledBy }: { children: React.ReactNode; labelledBy: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>{children}</div>;
}

function ModalButton({ children, onClick, primary = false, disabled = false }: {
  children: string; onClick: () => void; primary?: boolean; disabled?: boolean;
}) {
  return <button type="button" disabled={disabled} onClick={onClick}
    className={"flex min-h-12 w-full items-center justify-center rounded-[10px] px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 " + (primary ? "bg-[#B81724] text-white hover:opacity-[0.88] active:opacity-[0.72]" : "border border-[#E9E2DC] bg-white text-[#302927] hover:bg-[#F7F5F3]")}>
    {children}
  </button>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminAccountScreens({ initialView = "list" }: { initialView?: string }) {
  const accountParam = useSearchParams().get("account");
  const entryView = accountViewSchema.catch("list").parse(initialView);
  const [view, setView] = useRouteView<AdminAccountView>(entryView);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>("create");
  const [form, setForm] = useState<AccountForm>({ name: "", email: "", role: "", tenantId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [queryText, setQueryText] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "DISABLED" | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isListView = view === "list";
  const isCreateView = view === "create";
  const isDetailView = view === "tenant" || view === "staff";
  const selectedUserId = accountParam && userIdSchema.safeParse(accountParam).success ? accountParam : null;
  const listParams = useMemo(() => ({
    page,
    page_size: pageSize,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(queryText ? { q: queryText } : {}),
  }), [page, pageSize, roleFilter, statusFilter, queryText]);

  const listQuery = useAdminUsers(listParams, isListView);
  const detailQuery = useAdminUser(selectedUserId, isDetailView);
  const tenantsQuery = useTenants(isListView || (isDetailView && form.role === "owner"));
  const mutations = useAdminUserMutations();
  const { clearOneTimeCredential } = mutations;
  const currentUser = detailQuery.data;
  const currentRole = currentUser ? supportedRole(currentUser) : null;
  const canManageCurrentUser = Boolean(currentUser && currentRole);
  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data]);
  const tenantNames = useMemo(() => new Map(tenants.map((tenant) => [tenant.id, tenant.name])), [tenants]);

  useEffect(() => {
    setOverlay(null);
    setErrors({});
    setRequestError("");
    if (entryView === "create") setForm({ name: "", email: "", role: "", tenantId: "" });
  }, [entryView]);

  useEffect(() => {
    if (currentUser) setForm(formFromUser(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (overlay !== "success" && overlay !== "confirm") clearOneTimeCredential();
  }, [overlay, clearOneTimeCredential]);

  useEffect(() => {
    if (!listQuery.data) return;
    const totalPages = Math.max(1, Math.ceil(listQuery.data.total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [listQuery.data, page, pageSize]);

  const updateField = (field: keyof AccountForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "role" && value !== "owner" ? { tenantId: "" } : {}) }));
  };

  const beginCreate = () => {
    mutations.clearOneTimeCredential();
    setForm({ name: "", email: "", role: "", tenantId: "" });
    setErrors({});
    setRequestError("");
    setView("create", { account: null });
    setOverlay(null);
  };

  const openUser = (user: AdminUser) => {
    setForm(formFromUser(user));
    setView(supportedRole(user) === "owner" ? "tenant" : "staff", { account: user.id });
    setErrors({});
    setOverlay(null);
  };

  const buildCreateRequest = () => ({
    name: form.name,
    email: form.email,
    ...(form.role ? { role: form.role } : {}),
  });

  const buildUpdateRequest = (): AdminUserUpdateRequest => {
    if (!currentUser || !currentRole) throw new Error("Không thể cập nhật tài khoản này.");
    const next: AdminUserUpdateRequest = {};
    if (form.name.trim() !== currentUser.name) next.name = form.name.trim();
    if (form.email.trim() !== currentUser.email) next.email = form.email.trim();
    if (form.role && form.role !== currentRole) next.role = form.role;
    if (form.role === "owner") {
      const nextTenantId = form.tenantId || null;
      if (nextTenantId !== (currentUser.tenant_id ?? null)) next.tenant_id = nextTenantId;
    } else if (currentUser.tenant_id) {
      next.tenant_id = null;
    }
    return next;
  };

  const startSave = (action: "create" | "update") => {
    setErrors({});
    setRequestError("");
    if (action === "create") {
      const parsed = AdminUserCreateRequestSchema.safeParse(buildCreateRequest());
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const field of ["name", "email", "role", "tenant_id"]) {
          const message = fieldErrorMessage(parsed.error, field);
          if (message) next[field] = message;
        }
        setErrors(next);
        setRequestError("Vui lòng kiểm tra lại các trường được đánh dấu.");
        setOverlay("error");
        return;
      }
    } else {
      if (form.role === "owner" && !form.tenantId) {
        setErrors({ tenant_id: "Tài khoản owner bắt buộc có tenant." });
        setRequestError("Chọn tenant trước khi lưu.");
        setOverlay("error");
        return;
      }
      const parsed = AdminUserUpdateRequestSchema.safeParse(buildUpdateRequest());
      if (!parsed.success) {
        const next: Record<string, string> = {};
        for (const field of ["name", "email", "role", "tenant_id"]) {
          const message = fieldErrorMessage(parsed.error, field);
          if (message) next[field] = message;
        }
        setErrors(next);
        setRequestError(Object.keys(next).length ? "Vui lòng kiểm tra lại các trường được đánh dấu." : "Chưa có thay đổi nào để lưu.");
        setOverlay("error");
        return;
      }
    }
    setPendingAction(action);
    setOverlay("confirm");
  };

  const confirmAction = async () => {
    setRequestError("");
    try {
      if (pendingAction === "create") {
        await mutations.create.mutateAsync(AdminUserCreateRequestSchema.parse(buildCreateRequest()));
      } else if (pendingAction === "update") {
        if (!currentUser) throw new Error("Không tìm thấy tài khoản cần cập nhật.");
        await mutations.update.mutateAsync({ userId: currentUser.id, input: AdminUserUpdateRequestSchema.parse(buildUpdateRequest()) });
      } else if (pendingAction === "disable") {
        if (!currentUser) throw new Error("Không tìm thấy tài khoản cần vô hiệu hóa.");
        await mutations.disable.mutateAsync(currentUser.id);
      } else if (pendingAction === "reactivate") {
        if (!currentUser) throw new Error("Không tìm thấy tài khoản cần kích hoạt lại.");
        await mutations.update.mutateAsync({ userId: currentUser.id, input: { status: "ACTIVE" } });
      } else if (pendingAction === "reissue") {
        if (!currentUser) throw new Error("Không tìm thấy tài khoản cần cấp lại mật khẩu.");
        await mutations.reissueTemporaryPassword.mutateAsync(currentUser.id);
      }
      setOverlay("success");
    } catch (error) {
      setRequestError(getApiErrorMessage(error));
      setOverlay("error");
    }
  };

  const finishSuccess = () => {
    const stayOnUser = pendingAction === "reissue";
    mutations.clearOneTimeCredential();
    setOverlay(null);
    setRequestError("");
    if (!stayOnUser) setView("list", { account: null });
  };

  const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQueryText(searchDraft.trim().slice(0, 100));
    setPage(1);
  };

  let pageContent: React.ReactNode;
  if (isListView) {
    const users = listQuery.data?.items ?? [];
    const total = listQuery.data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pageContent = <DoloresPage title="Tài khoản toàn hệ thống" description="Quản lý tài khoản IDaaS theo vai trò, trạng thái và tenant." actions={<DoloresButton onClick={beginCreate}>Tạo tài khoản</DoloresButton>}>
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách tài khoản</DoloresPanelTitle>
        <form className="mb-4 grid gap-3 md:grid-cols-[minmax(200px,1fr)_180px_180px_auto]" onSubmit={applySearch}>
          <input aria-label="Tìm theo họ tên hoặc email" className="min-h-11 rounded-[10px] border border-[#E9E2DC] bg-white px-3 text-sm outline-none focus:border-[#B81724]" maxLength={100} placeholder="Tìm tên hoặc email" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
          <select aria-label="Lọc theo vai trò" className="min-h-11 rounded-[10px] border border-[#E9E2DC] bg-white px-3 text-sm" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as AdminUserRole | ""); setPage(1); }}>
            <option value="">Tất cả vai trò</option><option value="owner">Khách hàng / Tenant</option><option value="moderator">Moderator</option><option value="technician">Technician</option>
          </select>
          <select aria-label="Lọc theo trạng thái" className="min-h-11 rounded-[10px] border border-[#E9E2DC] bg-white px-3 text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "ACTIVE" | "DISABLED" | ""); setPage(1); }}>
            <option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="DISABLED">Đã vô hiệu hóa</option>
          </select>
          <DoloresButton type="submit" variant="secondary">Tìm kiếm</DoloresButton>
        </form>
        {listQuery.isLoading ? <p className="py-8 text-center text-sm text-[#706561]" role="status">Đang tải danh sách tài khoản…</p>
          : listQuery.isError ? <DoloresNotice title="Không tải được tài khoản" tone="warning"><p>{getApiErrorMessage(listQuery.error)}</p><div className="mt-3"><DoloresButton variant="secondary" onClick={() => void listQuery.refetch()}>Thử lại</DoloresButton></div></DoloresNotice>
            : <>
              <DoloresTable headers={["Họ tên", "Email", "Vai trò", "Phạm vi tenant", "Trạng thái", ""]} emptyMessage="Không tìm thấy tài khoản phù hợp."
                rows={users.map((user) => {
                  const role = supportedRole(user);
                  const tenantLabel = user.tenant_id ? tenantNames.get(user.tenant_id) ?? user.tenant_id : role === "owner" ? "Chưa gán tenant" : "Toàn hệ thống";
                  return [
                    <span className="font-semibold" key="name">{user.name}</span>, user.email, roleLabel(role),
                    <span className="break-all text-xs" key="tenant">{tenantLabel}</span>,
                    user.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa",
                    <button className="font-medium text-[#B81724] hover:underline" key="open" onClick={() => openUser(user)} type="button">Chi tiết</button>,
                  ];
                })} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#706561]">
                <span>{total === 0 ? "0 tài khoản" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} / ${total} tài khoản`}</span>
                <div className="flex items-center gap-2"><label className="flex items-center gap-2">Mỗi trang
                  <select aria-label="Số tài khoản mỗi trang" className="rounded border border-[#E9E2DC] bg-white px-2 py-1" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>{[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select>
                </label>
                  <DoloresButton variant="secondary" disabled={page <= 1 || listQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Trước</DoloresButton>
                  <span>Trang {page} / {totalPages}</span>
                  <DoloresButton variant="secondary" disabled={page >= totalPages || listQuery.isFetching} onClick={() => setPage((current) => current + 1)}>Sau</DoloresButton>
                </div>
              </div>
            </>}
      </DoloresPanel>
    </DoloresPage>;
  } else if (isCreateView) {
    pageContent = <DoloresPage title="Tạo tài khoản" description="Nhập thông tin và chọn vai trò cho tài khoản mới. Mật khẩu tạm thời chỉ được trả về một lần." actions={<>
      <DoloresButton disabled={mutations.create.isPending} onClick={() => startSave("create")}>{mutations.create.isPending ? "Đang tạo…" : "Tạo tài khoản"}</DoloresButton>
      <DoloresButton onClick={() => setView("list", { account: null })} variant="secondary">Hủy</DoloresButton>
    </>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin tài khoản</DoloresPanelTitle><DoloresFieldGrid>
        <AccountInput label="Họ tên" required error={errors.name} value={form.name} onChange={(value) => updateField("name", value)} />
        <AccountInput label="Email đăng nhập" required type="email" error={errors.email} value={form.email} onChange={(value) => updateField("email", value)} />
        <AccountSelect label="Vai trò" required value={form.role} error={errors.role} onChange={(value) => updateField("role", value)} options={[{ value: "", label: "Chọn vai trò" }, ...roleOptions]} />
      </DoloresFieldGrid></DoloresPanel>
      {mutations.create.isError && <DoloresNotice title="Không tạo được tài khoản" tone="warning">{getApiErrorMessage(mutations.create.error)}</DoloresNotice>}
    </DoloresPage>;
  } else if (isDetailView) {
    const tenantOptions = [
      { value: "", label: "Chọn tenant" },
      ...(form.tenantId && !tenantNames.has(form.tenantId) ? [{ value: form.tenantId, label: `Tenant hiện tại · ${form.tenantId}` }] : []),
      ...tenants.map((tenant) => ({ value: tenant.id, label: `${tenant.name} · ${tenant.id}` })),
    ];
    const title = currentRole === "owner" ? "Quản lý tài khoản Tenant" : currentRole === "technician" ? "Quản lý tài khoản Technician" : "Quản lý tài khoản nhân sự";
    pageContent = <DoloresPage title={title} description="Thông tin được lấy từ IDaaS. Thay đổi vai trò hoặc email có thể thu hồi phiên đăng nhập hiện tại." actions={<>
      <DoloresButton disabled={!canManageCurrentUser || mutations.update.isPending} onClick={() => startSave("update")}>{mutations.update.isPending ? "Đang lưu…" : "Lưu thay đổi"}</DoloresButton>
      {currentUser?.status === "ACTIVE" ? <DoloresButton variant="secondary" disabled={!canManageCurrentUser || mutations.disable.isPending} onClick={() => { setPendingAction("disable"); setOverlay("confirm"); }}>Vô hiệu hóa tài khoản</DoloresButton>
        : currentUser?.status === "DISABLED" ? <DoloresButton variant="secondary" disabled={!canManageCurrentUser || mutations.update.isPending} onClick={() => { setPendingAction("reactivate"); setOverlay("confirm"); }}>Kích hoạt lại</DoloresButton> : null}
      <DoloresButton variant="secondary" disabled={!canManageCurrentUser || currentUser?.status !== "ACTIVE" || mutations.reissueTemporaryPassword.isPending} onClick={() => { setPendingAction("reissue"); setOverlay("confirm"); }}>Cấp lại mật khẩu tạm</DoloresButton>
      <DoloresButton onClick={() => setView("list", { account: null })} variant="secondary">Về danh sách</DoloresButton>
    </>}>
      {detailQuery.isLoading ? <DoloresPanel><p className="py-6 text-center text-sm text-[#706561]" role="status">Đang tải hồ sơ…</p></DoloresPanel>
        : detailQuery.isError ? <DoloresNotice title="Không tải được hồ sơ" tone="warning"><p>{getApiErrorMessage(detailQuery.error)}</p><div className="mt-3"><DoloresButton variant="secondary" onClick={() => void detailQuery.refetch()}>Thử lại</DoloresButton></div></DoloresNotice>
          : !currentUser ? <DoloresNotice title="Không tìm thấy tài khoản" tone="warning">Mở tài khoản từ danh sách IDaaS để xem chi tiết.</DoloresNotice>
            : <>
              {!currentRole && <DoloresNotice title="Vai trò chưa được hỗ trợ" tone="warning">API này chỉ cho phép quản lý tài khoản owner, moderator và technician. Hồ sơ này chỉ hiển thị thông tin.</DoloresNotice>}
              <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
                <AccountInput label="Họ tên" required error={errors.name} value={form.name} onChange={(value) => updateField("name", value)} />
                <AccountInput label="Email đăng nhập" required type="email" error={errors.email} value={form.email} onChange={(value) => updateField("email", value)} />
                <AccountSelect label="Vai trò" value={form.role} onChange={(value) => updateField("role", value)} options={roleOptions} disabled={!canManageCurrentUser} />
                {form.role === "owner" && <AccountSelect label="Tenant được cấp" required value={form.tenantId} error={tenantsQuery.isError ? "Không tải được danh sách tenant." : errors.tenant_id} disabled={!canManageCurrentUser || tenantsQuery.isLoading || tenantsQuery.isError || tenants.length === 0} onChange={(value) => updateField("tenantId", value)} options={tenantOptions} />}
                <DoloresField label="Trạng thái">{currentUser.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa"}</DoloresField>
                <DoloresField label="Email đã xác minh">{currentUser.email_verified ? "Đã xác minh" : "Chưa xác minh"}</DoloresField>
                <DoloresField label="Tạo lúc">{formatDate(currentUser.created_at)}</DoloresField>
                <DoloresField label="Cập nhật lúc">{formatDate(currentUser.updated_at)}</DoloresField>
              </DoloresFieldGrid></DoloresPanel>
              {currentUser.status === "DISABLED" && <DoloresNotice title="Tài khoản đã bị vô hiệu hóa">Kích hoạt lại sẽ không bỏ yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.</DoloresNotice>}
              {mutations.update.isError && <DoloresNotice title="Không lưu được thay đổi" tone="warning">{getApiErrorMessage(mutations.update.error)}</DoloresNotice>}
            </>}
    </DoloresPage>;
  } else {
    pageContent = <DoloresPage title="Không tìm thấy tài khoản" actions={<DoloresButton onClick={() => setView("list", { account: null })}>Về danh sách</DoloresButton>}><DoloresNotice title="Đường dẫn không hợp lệ" tone="warning">Chọn tài khoản từ danh sách để tiếp tục.</DoloresNotice></DoloresPage>;
  }

  const isMutationPending = mutations.create.isPending || mutations.update.isPending || mutations.disable.isPending || mutations.reissueTemporaryPassword.isPending;
  return <>
    {pageContent}
    {overlay === "error" && <ModalFrame labelledBy="account-error-title"><section className="flex w-full max-w-[580px] flex-col gap-5 rounded-[20px] bg-white p-8 text-[#292625]">
      <p className="text-sm font-semibold leading-[1.45]">Yêu cầu chưa hoàn tất</p><h2 id="account-error-title" className="text-[26px] font-semibold leading-[1.45]">Có lỗi khi xử lý tài khoản</h2>
      <p className="text-base leading-[1.45]">{requestError || "Vui lòng thử lại sau."}</p>
      {Object.entries(errors).map(([field, message]) => <div key={field} className="rounded-[10px] border border-[#B81724] px-4 py-3"><p className="text-xs text-[#706561]">{field === "name" ? "Họ tên" : field === "email" ? "Email đăng nhập" : field === "role" ? "Vai trò" : field === "tenant_id" ? "Tenant" : "Thông tin"}</p><p className="mt-1 text-sm">{message}</p></div>)}
      <ModalButton primary onClick={() => setOverlay(null)}>Đóng</ModalButton>
    </section></ModalFrame>}
    {overlay === "success" && <ModalFrame labelledBy="account-success-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
      <p className="text-[11px] font-medium leading-4 text-[#706561]">Thông tin tài khoản</p>
      <h2 id="account-success-title" className="mt-3 text-xl font-semibold leading-7">{pendingAction === "create" ? "Đã tạo tài khoản" : pendingAction === "update" ? "Đã lưu thay đổi" : pendingAction === "disable" ? "Đã vô hiệu hóa tài khoản" : pendingAction === "reactivate" ? "Đã kích hoạt lại tài khoản" : "Đã cấp mật khẩu tạm mới"}</h2>
      {mutations.oneTimeCredential && <div className="mt-4 rounded-[10px] border border-[#E9E2DC] bg-[#F7F5F3] p-4">
        <p className="text-sm font-medium">Mật khẩu tạm thời · chỉ hiển thị lần này</p><code className="mt-2 block select-all break-all rounded bg-white p-3 text-sm">{mutations.oneTimeCredential.password}</code>
        <p className="mt-2 text-xs text-[#706561]">Hết hạn: {formatDate(mutations.oneTimeCredential.expiresAt)}. Mật khẩu không được lưu vào bộ nhớ trình duyệt.</p>
        {mutations.oneTimeCredential.emailVerificationStarted !== undefined && <p className="mt-2 text-xs text-[#706561]">{mutations.oneTimeCredential.emailVerificationStarted ? "Email xác minh đã được khởi tạo." : "Chưa khởi tạo được email xác minh."}</p>}
      </div>}
      <div className="mt-5"><ModalButton onClick={finishSuccess} primary>{pendingAction === "reissue" ? "Đóng" : "Về danh sách"}</ModalButton></div>
    </section></ModalFrame>}
    <AdminConfirmAccountCreateDialog open={overlay === "confirm" && pendingAction === "create"} accountName={form.name.trim()} email={form.email.trim()} role={form.role} isPending={isMutationPending} onConfirm={() => void confirmAction()} onClose={() => setOverlay(null)} />
    <AdminConfirmAccountUpdateDialog open={overlay === "confirm" && pendingAction === "update"} isPending={isMutationPending} onConfirm={() => void confirmAction()} onClose={() => setOverlay(null)} />
    <AdminConfirmAccountDisableDialog open={overlay === "confirm" && pendingAction === "disable"} isPending={isMutationPending} onConfirm={() => void confirmAction()} onClose={() => setOverlay(null)} />
    <AdminConfirmAccountReactivateDialog open={overlay === "confirm" && pendingAction === "reactivate"} isPending={isMutationPending} onConfirm={() => void confirmAction()} onClose={() => setOverlay(null)} />
    <AdminConfirmPasswordReissueDialog open={overlay === "confirm" && pendingAction === "reissue"} isPending={isMutationPending} onConfirm={() => void confirmAction()} onClose={() => setOverlay(null)} />
  </>;
}
