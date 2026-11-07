import type { PageAction } from "./page-action.types";
import type { MaintenanceTicket, MaintenanceRequest, RepairCase } from "@/schema/machines.schema";
import type { Machine } from "@/schema/machines.schema";
import type { CoffeePackageOrder } from "@/schema/coffee-packages.schema";
import type { RecallWorkOrder } from "@/schema/recall-work-orders.schema";

export type MaintenanceActionRole = "ADMIN" | "MODERATOR" | "OWNER" | "TECHNICIAN";
export type OperatorActionRole = "admin" | "moderator" | "owner" | "technician";

export function buildMaintenanceTicketCreateActions(role: MaintenanceActionRole, onCreate: () => void): PageAction[] {
  if (!(role === "ADMIN" || role === "MODERATOR" || role === "OWNER")) return [];
  return [{ id: "maintenance-ticket-create", label: "Tạo phiếu bảo trì", variant: "primary", priority: 20, onClick: onCreate }];
}

export function buildMaintenanceTicketCreatePageActions(role: MaintenanceActionRole, onCreate: () => void, pending = false): PageAction[] {
  return buildMaintenanceTicketCreateActions(role, onCreate).map((action) => ({
    ...action,
    pending,
    pendingLabel: "Đang tạo phiếu",
  }));
}

export function buildTechnicianMaintenanceTicketActions(input: {
  role: MaintenanceActionRole;
  status: string;
  hasRepairCase: boolean;
  startPending: boolean;
  partsPending: boolean;
  partsEntered: boolean;
  partsFormId: string;
  onStart: () => void;
}): PageAction[] {
  if (input.role !== "TECHNICIAN" || input.hasRepairCase) return [];
  if (input.status === "ASSIGNED") return [{
    id: "maintenance-ticket-start-work",
    label: "Bắt đầu công việc",
    variant: "primary",
    priority: 50,
    pending: input.startPending,
    pendingLabel: "Đang cập nhật",
    onClick: input.onStart,
  }];
  if (input.status === "IN_PROGRESS") return [{
    id: "maintenance-ticket-save-parts",
    label: "Lưu vật tư",
    variant: "primary",
    priority: 100,
    type: "submit",
    form: input.partsFormId,
    disabled: input.partsPending || !input.partsEntered,
    disabledReason: input.partsPending ? "Đang lưu thông tin vật tư." : "Nhập linh kiện đã thay hoặc chi phí vật tư trước khi lưu.",
    pending: input.partsPending,
    pendingLabel: "Đang lưu",
  }];
  return [];
}

export function buildMaintenanceTicketDetailActions(input: {
  role: MaintenanceActionRole;
  ticket: MaintenanceTicket;
  editing: boolean;
  dirty: boolean;
  pending: boolean;
  overduePending?: boolean;
  unassignPending?: boolean;
  hasVersion: boolean;
  formId: string;
  onEdit: () => void;
  onCancelEdit: () => void;
  onOverdueReview: () => void;
  onUnassign: () => void;
}): PageAction[] {
  if (input.role !== "ADMIN" && input.role !== "MODERATOR") return [];
  if (input.editing) return [
    {
      id: "maintenance-ticket-cancel-edit",
      label: "Hủy chỉnh sửa",
      variant: "secondary",
      priority: 100,
      onClick: input.onCancelEdit,
      confirm: input.dirty ? { title: "Hủy chỉnh sửa?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy chỉnh sửa" } : undefined,
      disabled: input.pending,
    },
    {
      id: "maintenance-ticket-save",
      label: "Lưu thay đổi",
      variant: "primary",
      priority: 100,
      type: "submit",
      form: input.formId,
      disabled: input.pending || !input.dirty || !input.hasVersion,
      disabledReason: !input.hasVersion ? "Phiếu chưa có phiên bản dữ liệu để cập nhật an toàn." : !input.dirty ? "Chưa có thay đổi để lưu." : undefined,
      pending: input.pending,
      pendingLabel: "Đang lưu",
    },
  ];

  const actions: PageAction[] = [];
  if (input.ticket.status === "ASSIGNED") actions.push({
    id: "maintenance-ticket-unassign",
    label: "Hủy phân công",
    variant: "danger",
    priority: 0,
    pending: input.unassignPending,
    pendingLabel: "Đang hủy phân công",
    onClick: input.onUnassign,
  });
  if (input.ticket.overdueReviewRequired === true && !input.ticket.overdueReviewedAt) actions.push({
    id: "maintenance-ticket-overdue-review",
    label: "Rà soát quá hạn",
    variant: "primary",
    priority: 50,
    pending: input.overduePending,
    pendingLabel: "Đang rà soát",
    onClick: input.onOverdueReview,
  });
  actions.push({ id: "maintenance-ticket-edit", label: "Chỉnh sửa chi tiết", variant: actions.length ? "secondary" : "primary", priority: 10, disabled: input.pending, disabledReason: input.pending ? "Đang lưu thay đổi phiếu bảo trì." : undefined, onClick: input.onEdit });
  const editAction = actions.find((action) => action.id === "maintenance-ticket-edit");
  if (editAction && !actions.some((action) => action.variant === "primary")) editAction.variant = "primary";
  return actions;
}

export function buildMaintenanceRequestActions(input: {
  role: OperatorActionRole;
  request: Pick<MaintenanceRequest, "requestType" | "status" | "overdueReviewedAt" | "replacementAssignmentId">;
  primaryReturned?: boolean;
  candidateReady?: boolean;
  onOverdueReview?: () => void;
  onLinkReplacement?: () => void;
  onCloseException?: () => void;
  overduePending?: boolean;
  linkPending?: boolean;
  closePending?: boolean;
}): PageAction[] {
  if (input.role !== "admin" && input.role !== "moderator") return [];
  const actions: PageAction[] = [];
  if (input.request.status === "OVERDUE_REVIEW" && !input.request.overdueReviewedAt && input.onOverdueReview) actions.push({
    id: "maintenance-request-overdue-review",
    label: "Rà soát quá hạn",
    variant: "primary",
    priority: 50,
    pending: input.overduePending,
    pendingLabel: "Đang rà soát",
    onClick: input.onOverdueReview,
  });
  if (input.candidateReady && input.onLinkReplacement) actions.push({
    id: "maintenance-request-link-replacement",
    label: "Liên kết máy thay thế",
    variant: "secondary",
    priority: 50,
    pending: input.linkPending,
    pendingLabel: "Đang liên kết",
    onClick: input.onLinkReplacement,
  });
  if (input.primaryReturned && input.request.status !== "CLOSED" && input.onCloseException) actions.push({
    id: "maintenance-request-close-exception",
    label: "Đóng yêu cầu",
    variant: "danger",
    priority: 0,
    pending: input.closePending,
    pendingLabel: "Đang đóng yêu cầu",
    onClick: input.onCloseException,
  });
  return actions;
}

export function buildMaintenanceRequestCreateTicketAction(input: {
  role: OperatorActionRole;
  request: Pick<MaintenanceRequest, "requestType" | "status" | "maintenanceTicketId" | "confirmedAppointmentAt">;
  pending: boolean;
  onCreate: () => void;
}): PageAction[] {
  if (!(input.role === "admin" || input.role === "moderator") || input.request.requestType !== "PREVENTIVE" || input.request.status !== "CONFIRMED" || !input.request.confirmedAppointmentAt || input.request.maintenanceTicketId) return [];
  return [{ id: "maintenance-request-create-ticket", label: "Tạo phiếu bảo trì", variant: "primary", priority: 20, pending: input.pending, pendingLabel: "Đang tạo phiếu", onClick: input.onCreate }];
}

export function buildMaintenanceRequestAssignTicketAction(input: {
  role: OperatorActionRole;
  hasTicket: boolean;
  assignedTechnicianId?: string | null;
  technicianSelected: boolean;
  pending: boolean;
  onAssign: () => void;
}): PageAction[] {
  if (input.role !== "admin" || !input.hasTicket || input.assignedTechnicianId) return [];
  return [{ id: "maintenance-request-assign-technician", label: "Giao kỹ thuật viên", variant: "primary", priority: 50, pending: input.pending, pendingLabel: "Đang giao việc", disabled: !input.technicianSelected || input.pending, disabledReason: !input.technicianSelected ? "Chọn một kỹ thuật viên đủ điều kiện trước khi giao việc." : undefined, onClick: input.onAssign }];
}

export function buildOwnerMaintenanceAppointmentActions(input: {
  role: OperatorActionRole;
  request: Pick<MaintenanceRequest, "requestType" | "status">;
  appointmentAt: string;
  pending: boolean;
  formId: string;
}): PageAction[] {
  const eligible = input.role === "owner" && input.request.requestType === "PREVENTIVE" && ["REQUESTED", "RESCHEDULE_REQUESTED"].includes(input.request.status);
  if (!eligible) return [];
  return [{
    id: "maintenance-request-confirm-appointment",
    label: "Xác nhận lịch",
    variant: "primary",
    priority: 100,
    type: "submit",
    form: input.formId,
    pending: input.pending,
    pendingLabel: "Đang xác nhận",
    disabled: input.pending || !input.appointmentAt,
    disabledReason: !input.appointmentAt ? "Chọn thời gian hẹn trong khung bảo trì trước khi xác nhận." : undefined,
  }];
}

export function buildMachineTransferActions(input: {
  role: OperatorActionRole;
  machine: Pick<Machine, "id" | "ownerId">;
  onTransfer: () => void;
}): PageAction[] {
  if (!(input.role === "admin" || input.role === "moderator" || input.role === "owner") || !input.machine.ownerId) return [];
  return [{ id: "machine-transfer-location", label: "Chuyển điểm bán", variant: "secondary", priority: 0, onClick: input.onTransfer }];
}

export function buildRepairCaseActions(input: {
  role: OperatorActionRole;
  repairCase: RepairCase;
  disputed: boolean;
  reviewTicketId?: string | null;
  pending?: boolean;
  onOffer: () => void;
  onAuthorizeEmergency: () => void;
}): PageAction[] {
  if (input.role !== "admin" && input.role !== "moderator") return [];
  const canOffer = ["WAITING_REPLACEMENT", "WAITING_OWNER_DECISION"].includes(input.repairCase.status);
  const canAuthorize = ["DIAGNOSIS", "REPAIR_IN_PROGRESS"].includes(input.repairCase.status) && input.disputed && input.reviewTicketId === input.repairCase.maintenanceTicketId;
  const actions: PageAction[] = [];
  if (canOffer) actions.push({ id: "repair-case-offer-replacement", label: "Đề xuất máy thay thế", variant: "primary", priority: 50, pending: input.pending, pendingLabel: "Đang xử lý", onClick: input.onOffer });
  if (canAuthorize) actions.push({ id: "repair-case-authorize-emergency", label: "Cho phép xử lý khẩn cấp", variant: "primary", priority: 50, pending: input.pending, pendingLabel: "Đang xử lý", onClick: input.onAuthorizeEmergency });
  return actions;
}

export function buildCoffeeOrderReceiptActions(input: {
  role: OperatorActionRole;
  order: Pick<CoffeePackageOrder, "status" | "ownerReceivedAt">;
  pending: boolean;
  onConfirm: () => void;
}): PageAction[] {
  if (input.role !== "owner" || input.order.status !== "DELIVERED" || input.order.ownerReceivedAt) return [];
  return [{ id: "coffee-order-confirm-received", label: "Xác nhận đã nhận hàng", variant: "primary", priority: 50, disabled: input.pending, pending: input.pending, pendingLabel: "Đang xác nhận", onClick: input.onConfirm, confirm: { title: "Xác nhận đã nhận hàng", description: "Bạn xác nhận đã nhận đơn hàng này?", confirmLabel: "Xác nhận" } }];
}

export function buildRecallLegacyReviewActions(input: {
  role: OperatorActionRole;
  workOrder: Pick<RecallWorkOrder, "status">;
  onReview: () => void;
}): PageAction[] {
  if (input.role !== "admin" || input.workOrder.status !== "LEGACY_REVIEW_REQUIRED") return [];
  return [{ id: "recall-work-order-legacy-review", label: "Rà soát thu hồi", variant: "primary", priority: 50, onClick: input.onReview }];
}

export function buildContractDetailActions(input: {
  status: string; machineId?: string | null; hasSnapshot: boolean; lifecycleView: "amend" | "continue" | null;
  dirty: boolean; pending: boolean; formId: string; terminationHref: string;
  onCancel: () => void; onAmend: () => void; onContinue: () => void; onHistory: () => void;
}): PageAction[] {
  if (input.lifecycleView) {
    const amend = input.lifecycleView === "amend";
    return [
      { id: `contract-lifecycle-cancel-${input.lifecycleView}`, label: "Hủy", variant: "secondary", priority: 100, onClick: input.onCancel,
        confirm: input.dirty ? { title: amend ? "Hủy sửa chính sách?" : "Hủy hợp đồng tiếp nối?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined },
      { id: `contract-lifecycle-submit-${input.lifecycleView}`, label: amend ? "Xác nhận sửa đổi" : "Tạo bản nháp tiếp nối", variant: "primary", priority: 100, type: "submit", form: input.formId,
        disabled: input.pending || (amend && !input.hasSnapshot), disabledReason: amend && !input.hasSnapshot ? "Hợp đồng chưa có snapshot chính sách" : input.pending ? "Đang xử lý." : undefined,
        pending: input.pending, pendingLabel: amend ? "Đang xác nhận sửa đổi" : "Đang tạo bản nháp" },
    ];
  }
  const actions: PageAction[] = [];
  if (input.status === "ACTIVE") {
    actions.push({ id: "contract-lifecycle-terminate", label: "Chấm dứt hợp đồng", variant: "danger", priority: 0, href: input.terminationHref });
    actions.push({ id: "contract-lifecycle-amend", label: "Sửa chính sách", variant: "secondary", priority: 10, disabled: !input.hasSnapshot, disabledReason: !input.hasSnapshot ? "Hợp đồng chưa có snapshot chính sách" : undefined, onClick: input.onAmend });
  }
  if (input.status === "TERMINATED") actions.push({ id: "contract-lifecycle-continue", label: "Tạo hợp đồng tiếp nối", variant: "primary", priority: 50, onClick: input.onContinue });
  if (input.machineId) actions.push({ id: "contract-lifecycle-history", label: "Lịch sử hợp đồng", variant: "secondary", priority: 0, onClick: input.onHistory });
  return actions;
}

export function buildInvoiceExportActions(input: { count: number; loading: boolean; pending: boolean; ownerRequired?: boolean; ownerId?: string | null; onExport: () => void }): PageAction[] {
  if (!input.count) return [];
  const reason = input.loading ? "Đang tải danh sách hóa đơn." : input.count > 1000 ? "Chỉ có thể xuất tối đa 1.000 hóa đơn." : input.ownerRequired && !input.ownerId ? "Lọc theo một chủ sở hữu để xuất hóa đơn." : undefined;
  return [{ id: "invoice-export", label: "Xuất hóa đơn", variant: "primary", priority: 20, disabled: Boolean(reason), disabledReason: reason, pending: input.pending, pendingLabel: "Đang xuất hóa đơn", onClick: input.onExport }];
}

export function buildInvoiceStatusActions(input: { status: string; dueDate?: string | null; pending: boolean; pendingStatus?: string; onChange: (status: "PENDING" | "OVERDUE" | "CANCELLED") => void }): PageAction[] {
  const overdue = Boolean(input.dueDate && Date.parse(input.dueDate) < Date.now());
  const targets: ("PENDING" | "OVERDUE" | "CANCELLED")[] = input.status === "DRAFT" ? ["PENDING", "CANCELLED"] : input.status === "PENDING" || input.status === "UNPAID" ? [...(overdue ? ["OVERDUE" as const] : []), "CANCELLED"] : input.status === "OVERDUE" ? ["CANCELLED"] : [];
  return targets.map((status) => ({
    id: `invoice-status-${status.toLowerCase()}`,
    label: status === "PENDING" ? "Gửi hóa đơn" : status === "OVERDUE" ? "Đánh dấu quá hạn" : "Hủy hóa đơn",
    variant: status === "CANCELLED" ? "danger" : "primary", priority: status === "CANCELLED" ? 0 : 50,
    pending: input.pending && input.pendingStatus === status, pendingLabel: "Đang cập nhật…",
    onClick: () => input.onChange(status),
    confirm: status === "CANCELLED" ? { title: "Hủy hóa đơn?", description: "Hóa đơn sẽ được đánh dấu đã hủy.", confirmLabel: "Hủy hóa đơn" } : undefined,
  }));
}
