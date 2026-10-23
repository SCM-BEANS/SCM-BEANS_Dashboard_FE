import { z } from "zod";

export const ProfileIdSchema = z.string().uuid();
export const ProfileSchema = z.object({
  idaasUserId: ProfileIdSchema,
  email: z.string().email().or(z.literal("")),
  fullName: z.string(),
  phone: z.string().nullish(),
  emailVerified: z.boolean(),
  roles: z.array(z.string()),
  status: z.enum(["UNVERIFIED", "PENDING_ASSIGNMENT", "ACTIVE", "DISABLED"]),
  createdAt: z.string().datetime().nullish(),
  updatedAt: z.string().datetime().nullish(),
  contractsUrl: z.string().nullish(),
});
export const ProfilePageSchema = z.object({
  items: z.array(ProfileSchema), page: z.number().int().nonnegative(),
  size: z.number().int().positive(), totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const ProfileListParamsSchema = z.object({
  role: z.string().optional(), status: z.string().optional(), q: z.string().optional(),
  page: z.number().int().nonnegative().default(0), size: z.number().int().min(1).max(100).default(20),
});
export const ProfileHistorySchema = z.object({
  id: z.string().optional(), changedAt: z.string().optional(), changedBy: z.string().nullish(),
  source: z.string().nullish(), changes: z.unknown().optional(),
}).passthrough();
export const ProfileHistoryPageSchema = z.object({
  items: z.array(ProfileHistorySchema), page: z.number().int().nonnegative(),
  size: z.number().int().positive(), totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const ProfileContractSummarySchema = z.object({
  id: z.string().uuid().optional(), contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().nullish(), status: z.string().nullish(),
  startDate: z.string().nullish(), endDate: z.string().nullish(),
}).passthrough();
export const ProfileContractPageSchema = z.object({
  items: z.array(ProfileContractSummarySchema), page: z.number().int().nonnegative(),
  size: z.number().int().positive(), totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type Profile = z.infer<typeof ProfileSchema>;
export type ProfilePage = z.infer<typeof ProfilePageSchema>;
export type ProfileListParams = z.infer<typeof ProfileListParamsSchema>;
export type ProfileContractSummary = z.infer<typeof ProfileContractSummarySchema>;
