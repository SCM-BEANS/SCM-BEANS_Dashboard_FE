"use client";

import { useState } from "react";
import type { Tenant } from "@/types/dolores/tenants";
import { AdminConfirmStoreCreateDialog } from "@/app/(admin)/admin/_components/AdminConfirmationDialogs";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
} from "@/app/_ui/dolores/DoloresUI";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";

type StoreForm = {
  name: string;
  tenantId: string;
  address: string;
  city: string;
  contactPerson: string;
  phoneNumber: string;
  active: boolean;
};

type StoreField = keyof StoreForm;
type StoreDialogState = "confirm" | "success" | null;

function StoreSuccessDialog({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="presentation">
      <section aria-labelledby="store-success-title" aria-modal="true" className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl" role="dialog">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">✓  Đã hoàn tất</p>
        <h2 id="store-success-title" className="mt-3 text-xl font-semibold leading-7">Đã hoàn tất bản xem trước</h2>
        <p className="mt-3 text-[13px] leading-5 text-[#706561]">Luồng tạo cửa hàng đã hoàn tất ở giao diện mẫu. Thông tin chưa được lưu vào hệ thống.</p>
        <div className="mt-6 flex flex-wrap gap-3"><DoloresButton onClick={onComplete}>Về danh sách</DoloresButton></div>
      </section>
    </div>
  );
}

export default function AdminStoreCreateScreen({
  tenants,
  initialTenantId,
  tenantsLoading,
  tenantsError,
  onCancel,
  onComplete,
}: {
  tenants: Tenant[];
  initialTenantId?: string;
  tenantsLoading: boolean;
  tenantsError: boolean;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const [form, setForm] = useState<StoreForm>({
    name: "",
    tenantId: initialTenantId ?? "",
    address: "",
    city: "",
    contactPerson: "",
    phoneNumber: "",
    active: true,
  });
  const [errors, setErrors] = useState<Partial<Record<StoreField, string>>>({});
  const [dialog, setDialog] = useState<StoreDialogState>(null);
  const tenantName = tenants.find((tenant) => tenant.id === form.tenantId)?.name ?? "";

  const updateField = <K extends StoreField,>(field: K, value: StoreForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const openConfirmation = () => {
    const nextErrors: Partial<Record<StoreField, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên cửa hàng.";
    if (!form.tenantId) nextErrors.tenantId = "Vui lòng chọn tenant phụ trách.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setDialog("confirm");
  };

  const closeDialog = () => setDialog(null);
  const finishPreview = () => {
    setDialog(null);
    onComplete();
  };

  return (
    <>
      <DoloresPage
        title="Tạo cửa hàng"
        description="Nhập thông tin cửa hàng theo luồng tạo trên nhánh Ni."
        actions={(
          <>
            <DoloresButton onClick={openConfirmation}>Lưu cửa hàng</DoloresButton>
            <DoloresButton onClick={onCancel} variant="secondary">Hủy</DoloresButton>
          </>
        )}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin cửa hàng</DoloresPanelTitle>
          <DoloresFieldGrid>
            <DoloresField label="Tên cửa hàng" required>
              <input
                aria-label="Tên cửa hàng"
                aria-invalid={Boolean(errors.name)}
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
              />
              {errors.name && <span className="text-xs text-[#B81724]">{errors.name}</span>}
            </DoloresField>
            <DoloresField label="Tenant phụ trách" required>
              <select
                aria-label="Tenant phụ trách"
                aria-invalid={Boolean(errors.tenantId)}
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.tenantId}
                onChange={(event) => updateField("tenantId", event.target.value)}
              >
                <option value="">{tenantsLoading ? "Đang tải tenant…" : "Chọn tenant"}</option>
                {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
              {errors.tenantId && <span className="text-xs text-[#B81724]">{errors.tenantId}</span>}
            </DoloresField>
            <DoloresField label="Địa chỉ">
              <input
                aria-label="Địa chỉ"
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.address}
                onChange={(event) => updateField("address", event.target.value)}
              />
            </DoloresField>
            <DoloresField label="Thành phố">
              <input
                aria-label="Thành phố"
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </DoloresField>
            <DoloresField label="Người liên hệ">
              <input
                aria-label="Người liên hệ"
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.contactPerson}
                onChange={(event) => updateField("contactPerson", event.target.value)}
              />
            </DoloresField>
            <DoloresField label="Số điện thoại">
              <input
                aria-label="Số điện thoại"
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.phoneNumber}
                onChange={(event) => updateField("phoneNumber", event.target.value)}
              />
            </DoloresField>
            <DoloresField label="Trạng thái">
              <select
                aria-label="Trạng thái"
                className="w-full bg-transparent text-sm leading-[17px] outline-none"
                value={form.active ? "active" : "inactive"}
                onChange={(event) => updateField("active", event.target.value === "active")}
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
            </DoloresField>
          </DoloresFieldGrid>
        </DoloresPanel>

        {tenantsError && <DoloresNotice title="Không tải được tenant" tone="warning">Tải lại danh sách tenant trước khi chọn cửa hàng phụ trách.</DoloresNotice>}
        {!tenantsLoading && !tenantsError && tenants.length === 0 && <DoloresNotice title="Chưa có tenant" tone="warning">Cần có tenant trước khi tạo thông tin cửa hàng.</DoloresNotice>}
      </DoloresPage>

      <AdminConfirmStoreCreateDialog open={dialog === "confirm"} storeName={form.name.trim()} tenantName={tenantName} onConfirm={() => setDialog("success")} onClose={closeDialog} />
      {dialog === "success" && <StoreSuccessDialog onComplete={finishPreview} />}
    </>
  );
}
