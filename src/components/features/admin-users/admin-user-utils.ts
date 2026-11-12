import {
  AdminUserRoleSchema,
  type AdminUser,
  type AdminUserRole,
} from "@/schema/admin-users.schema";
import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";

export const ADMIN_USER_ROLE_LABELS: Record<AdminUserRole, string> = {
  owner: T.COMMON.OWNER,
  moderator: T.COMMON.MODERATOR,
  technician: T.COMMON.TECHNICIAN,
};

export function getAdminUserRole(user: AdminUser): AdminUserRole | null {
  for (const role of user.roles) {
    const parsed = AdminUserRoleSchema.safeParse(role.toLowerCase().replace(/^role_/, ""));
    if (parsed.success) return parsed.data;
  }
  return null;
}

export function formatAdminUserDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
