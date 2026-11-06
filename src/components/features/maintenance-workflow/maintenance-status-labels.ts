import type { MaintenanceCustodyEventType, MaintenanceRequest } from "@/schema/machines.schema";
import { REPAIR_WORKFLOW_MESSAGES } from "@/text/repair-workflow/repair-workflow-messages";

const requestStatusLabels: Record<MaintenanceRequest["status"], string> = {
  REQUESTED: "Chờ xác nhận",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Chờ xác nhận lịch mới",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};

const custodyEventLabels: Record<MaintenanceCustodyEventType, string> = {
  PRIMARY_COLLECTED: "Nhận máy chính",
  REPLACEMENT_DELIVERED: "Bàn giao máy thay thế",
  REPLACEMENT_COLLECTED: "Thu máy thay thế",
  PRIMARY_RETURNED: "Trả máy chính",
};

const alertLevelLabels: Record<string, string> = {
  Info: "Thông tin",
  Warning: "Cảnh báo",
  Critical: "Nghiêm trọng",
};

export function maintenanceRequestStatusLabel(status: MaintenanceRequest["status"]): string {
  return requestStatusLabels[status];
}

export function maintenanceTicketStatusLabel(status: string | null | undefined): string {
  if (!status) return "Chưa xác định";
  return REPAIR_WORKFLOW_MESSAGES.TICKET_STATUS_LABELS[status as keyof typeof REPAIR_WORKFLOW_MESSAGES.TICKET_STATUS_LABELS] ?? status;
}

export function maintenanceAssignmentStatusLabel(status: string | null | undefined): string {
  if (!status) return "Chưa xác định";
  return REPAIR_WORKFLOW_MESSAGES.ASSIGNMENT_STATUS_LABELS[status as keyof typeof REPAIR_WORKFLOW_MESSAGES.ASSIGNMENT_STATUS_LABELS] ?? status;
}

export function maintenanceCustodyEventLabel(eventType: string): string {
  return custodyEventLabels[eventType as MaintenanceCustodyEventType] ?? eventType.replaceAll("_", " ");
}

export function maintenanceAlertLevelLabel(alertLevel: string | null | undefined): string {
  if (!alertLevel) return "Chưa đặt";
  return alertLevelLabels[alertLevel] ?? alertLevel;
}
