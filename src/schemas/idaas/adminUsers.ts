import { z } from 'zod';

export const AdminUserRoleSchema = z.enum(['owner', 'technician', 'moderator']);
export const AdminUserStatusSchema = z.enum(['ACTIVE', 'DISABLED']);

const TenantIdSchema = z.string().uuid();
const TimestampSchema = z.string().datetime({ offset: true });

export const AdminUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
  tenant_id: TenantIdSchema.optional(),
  status: AdminUserStatusSchema,
  email_verified: z.boolean(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const AdminUserListResponseSchema = z.object({
  items: z.array(AdminUserSchema),
  page: z.number().int().positive(),
  page_size: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

export const AdminUserListParamsSchema = z.object({
  page: z.number().int().positive(),
  page_size: z.number().int().positive().max(100),
  role: AdminUserRoleSchema.optional(),
  status: AdminUserStatusSchema.optional(),
  tenant_id: TenantIdSchema.optional(),
  q: z.string().max(100).optional(),
});

export const AdminUserCreateRequestSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.string().trim().email().max(255),
  role: AdminUserRoleSchema,
  tenant_id: TenantIdSchema.optional(),
}).superRefine((value, context) => {
  if (value.role === 'owner' && !value.tenant_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['tenant_id'], message: 'Tenant is required for owner accounts.' });
  }
  if (value.role !== 'owner' && value.tenant_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['tenant_id'], message: 'Only owner accounts can have a tenant.' });
  }
});

export const AdminUserCreateResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: AdminUserRoleSchema,
  tenant_id: TenantIdSchema.optional(),
  status: AdminUserStatusSchema,
  email_verification_started: z.boolean(),
  temporary_password: z.string().min(1),
  temporary_password_expires_at: TimestampSchema,
});

export const AdminUserUpdateRequestSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().email().max(255).optional(),
  role: AdminUserRoleSchema.optional(),
  status: z.literal('ACTIVE').optional(),
  tenant_id: TenantIdSchema.nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.');

export const AdminUserUpdateResponseSchema = z.object({
  user: AdminUserSchema,
  email_verification_started: z.boolean(),
});

export const AdminUserTemporaryPasswordResponseSchema = z.object({
  user_id: z.string().uuid(),
  temporary_password: z.string().min(1),
  temporary_password_expires_at: TimestampSchema,
});

export type AdminUserRole = z.infer<typeof AdminUserRoleSchema>;
export type AdminUserStatus = z.infer<typeof AdminUserStatusSchema>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
export type AdminUserListParams = z.infer<typeof AdminUserListParamsSchema>;
export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>;
export type AdminUserCreateRequest = z.infer<typeof AdminUserCreateRequestSchema>;
export type AdminUserUpdateRequest = z.infer<typeof AdminUserUpdateRequestSchema>;
export type AdminUserOneTimeCredential = {
  userId: string;
  password: string;
  expiresAt: string;
  emailVerificationStarted?: boolean;
};
