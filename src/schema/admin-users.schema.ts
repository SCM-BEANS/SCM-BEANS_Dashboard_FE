import { z } from "zod";

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });

export const AdminUserRoleSchema = z.enum(["owner", "technician", "moderator"]);
export const AdminUserStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

export const AdminUserSchema = z.object({
  id: uuid,
  name: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
  tenant_id: uuid.nullish(),
  status: AdminUserStatusSchema,
  email_verified: z.boolean(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const AdminUserListParamsSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().min(1).max(100),
  q: z.string().trim().max(100).optional(),
  role: AdminUserRoleSchema.optional(),
  status: AdminUserStatusSchema.optional(),
  tenant_id: uuid.optional(),
});

export const AdminUserListSchema = z.object({
  items: z.array(AdminUserSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export const AdminUserCreateSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().email().max(255),
  role: AdminUserRoleSchema,
  tenant_id: uuid.optional(),
}).superRefine((value, context) => {
  if (value.role !== "owner" && value.tenant_id) {
    context.addIssue({ code: "custom", path: ["tenant_id"], message: "Chỉ owner được gán tenant." });
  }
});

export const AdminUserCreateResponseSchema = z.object({
  id: uuid,
  name: z.string(),
  email: z.string().email(),
  role: AdminUserRoleSchema,
  tenant_id: uuid.nullish(),
  status: AdminUserStatusSchema,
  email_verification_started: z.boolean().optional(),
  onboarding_email_sent: z.boolean().optional(),
  temporary_password: z.string().min(1),
  temporary_password_expires_at: timestamp.nullish(),
}).refine(
  (response) =>
    response.email_verification_started !== undefined ||
    response.onboarding_email_sent !== undefined,
  { message: "Response must include an onboarding or email verification status." },
);

export const AdminUserUpdateSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: AdminUserRoleSchema.optional(),
  status: z.literal("ACTIVE").optional(),
  tenant_id: uuid.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "Chưa có thay đổi để lưu.");

export const AdminUserUpdateResponseSchema = z.object({
  user: AdminUserSchema,
  email_verification_started: z.boolean(),
});

export const AdminUserReissueResponseSchema = z.object({
  user_id: uuid,
  temporary_password: z.string().min(1),
  temporary_password_expires_at: timestamp,
});

export const AdminUserIdSchema = uuid;

export type AdminUser = z.infer<typeof AdminUserSchema>;
export type AdminUserRole = z.infer<typeof AdminUserRoleSchema>;
export type AdminUserListParams = z.infer<typeof AdminUserListParamsSchema>;
export type AdminUserCreate = z.infer<typeof AdminUserCreateSchema>;
export type AdminUserUpdate = z.infer<typeof AdminUserUpdateSchema>;
