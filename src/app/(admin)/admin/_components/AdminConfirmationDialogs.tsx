"use client";

import { useRef } from "react";
import { DoloresDialog } from "@/app/_ui/dolores/DoloresDialog";
import { DoloresButton } from "@/app/_ui/dolores/DoloresUI";
import type { AdminUserRole } from "@/schemas/idaas/adminUsers";

const accountRoleLabels: Record<AdminUserRole, string> = {
  owner: "Khách hàng / Tenant",
  moderator: "Moderator",
  technician: "Technician",
};

type AccountConfirmationProps = {
  open: boolean;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function AdminConfirmAccountCreateDialog({
  open,
  accountName,
  email,
  role,
  isPending,
  onConfirm,
  onClose,
}: AccountConfirmationProps & {
  accountName: string;
  email: string;
  role: AdminUserRole | "";
}) {
  const roleLabel = role ? accountRoleLabels[role] : "chưa chọn vai trò";
  const description = `${accountName} · ${email} · ${roleLabel}. ${role === "owner" ? "Tài khoản chưa được gán tenant. " : ""}IDaaS sẽ tạo tài khoản, ghi nhận vai trò, đưa hồ sơ vào hàng đợi đồng bộ Dolores và trả mật khẩu tạm thời một lần.`;

  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Kiểm tra trước khi tiếp tục"
      title="Xác nhận tạo tài khoản"
      description={description}
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary" disabled={isPending}>Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmAccountUpdateDialog({ open, isPending, onConfirm, onClose }: AccountConfirmationProps) {
  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Kiểm tra trước khi tiếp tục"
      title="Xác nhận lưu thay đổi"
      description="Chỉ các trường đã thay đổi sẽ được gửi lên API. Thay đổi email hoặc vai trò có thể thu hồi phiên đăng nhập hiện tại."
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary" disabled={isPending}>Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmAccountDisableDialog({ open, isPending, onConfirm, onClose }: AccountConfirmationProps) {
  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Kiểm tra trước khi tiếp tục"
      title="Xác nhận vô hiệu hóa tài khoản"
      description="Tài khoản sẽ bị chuyển sang DISABLED và các phiên đăng nhập sẽ bị thu hồi. Đây là vô hiệu hóa, không xóa lịch sử tài khoản."
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary" disabled={isPending}>Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmAccountReactivateDialog({ open, isPending, onConfirm, onClose }: AccountConfirmationProps) {
  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Kiểm tra trước khi tiếp tục"
      title="Xác nhận kích hoạt lại tài khoản"
      description="Tài khoản sẽ được chuyển lại sang ACTIVE. Yêu cầu đổi mật khẩu lần đăng nhập đầu vẫn được giữ."
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary" disabled={isPending}>Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmPasswordReissueDialog({ open, isPending, onConfirm, onClose }: AccountConfirmationProps) {
  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Kiểm tra trước khi tiếp tục"
      title="Xác nhận cấp lại mật khẩu tạm"
      description="Mật khẩu hiện tại sẽ bị thay thế ngay. Mật khẩu mới chỉ hiển thị một lần và người dùng phải đổi mật khẩu khi đăng nhập."
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>{isPending ? "Đang xử lý…" : "Xác nhận"}</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary" disabled={isPending}>Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmStoreCreateDialog({
  open,
  storeName,
  tenantName,
  onConfirm,
  onClose,
}: {
  open: boolean;
  storeName: string;
  tenantName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      closeOnEscape={false}
      eyebrow="Xác nhận thông tin"
      title="Xác nhận · Thông tin cửa hàng"
      description={`Tên cửa hàng: ${storeName}. Tenant phụ trách: ${tenantName}.`}
      actions={(
        <>
          <DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onClose} variant="secondary">Đóng</DoloresButton>
        </>
      )}
    />
  );
}

export function AdminConfirmGlobalRecipePublishDialog({
  open,
  recipeName,
  isPending,
  onConfirm,
  onClose,
}: {
  open: boolean;
  recipeName: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <DoloresDialog
      open={open}
      onRequestClose={onClose}
      eyebrow="Xác nhận tác động toàn hệ thống"
      title={recipeName ? `Phát hành ${recipeName}?` : "Xác nhận phát hành"}
      description="API sẽ tạo Global Recipe mới, biên dịch lại effective recipes liên quan và yêu cầu đồng bộ trên tất cả máy. Thao tác này không giới hạn vào một tenant hoặc máy."
      initialFocusRef={cancelRef}
      actions={(
        <>
          <DoloresButton onClick={onConfirm} disabled={isPending}>Xác nhận phát hành</DoloresButton>
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 text-sm font-medium text-[#302927] transition-opacity hover:opacity-[0.88] active:opacity-[0.72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B81724]"
            onClick={onClose}
          >
            Quay lại
          </button>
        </>
      )}
    />
  );
}
