import { z } from "zod";

const uuid = z.string().uuid();
export const GlobalMenuSchema = z.object({ id: uuid, name: z.string().min(1), createdAt: z.string() }).passthrough();
export const OwnerMenuSchema = z.object({ id: uuid, ownerId: uuid, name: z.string().min(1), createdAt: z.string() }).passthrough();
export const GlobalMenuRecipeSummarySchema = z.object({ id: uuid, name: z.string(), revision: z.number().int(), menuId: uuid.nullish() }).passthrough();
export const OwnerMenuRecipeSummarySchema = z.object({ id: uuid, ownerId: uuid, menuId: uuid, sourceGlobalRecipeId: uuid, sourceRevision: z.number().int().nullish(), name: z.string(), createdAt: z.string(), updatedAt: z.string() }).passthrough();
export const OwnerMenuRecipeSchema = OwnerMenuRecipeSummarySchema.extend({
  steps: z.array(z.string()), dosageBounds: z.array(z.string()), dosageOverrides: z.array(z.string()),
});
export const RecipeMenuPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  content: z.array(itemSchema), page: z.number().int().nonnegative(), size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(),
  first: z.boolean().optional(), last: z.boolean().optional(),
}).passthrough();
export const RecipeMenuNameRequestSchema = z.object({ name: z.string().trim().min(1).max(160) }).strict();
export const RecipeCopyRequestSchema = z.object({ globalRecipeId: uuid, menuId: uuid.optional() }).strict();
export const LocalRecipeSnapshotRequestSchema = z.object({
  name: z.string().trim().min(1).max(160), steps: z.array(z.string().trim().min(1)).min(1),
  dosageBounds: z.array(z.string().trim().min(1)).min(1), dosageOverrides: z.array(z.string()).optional(),
}).strict();
export const RecipeSyncStatusSchema = z.object({
  machineId: uuid, targetVersion: z.number().int(), targetHash: z.string(), appliedVersion: z.number().int().nullish(),
  appliedHash: z.string().nullish(), commandId: uuid.nullish(), state: z.string(), retryCount: z.number().int(),
  lastError: z.string().nullish(), requestedAt: z.string().nullish(), lastAttemptAt: z.string().nullish(),
  appliedAt: z.string().nullish(), expiresAt: z.string().nullish(),
}).passthrough();
export const RecipeSyncRequestSchema = z.object({ machineIds: z.array(uuid).min(1).max(100) }).strict();
export const RecipeSyncStatusesSchema = z.array(RecipeSyncStatusSchema);
export type GlobalMenu = z.infer<typeof GlobalMenuSchema>;
export type OwnerMenu = z.infer<typeof OwnerMenuSchema>;
export type GlobalMenuRecipeSummary = z.infer<typeof GlobalMenuRecipeSummarySchema>;
export type OwnerMenuRecipe = z.infer<typeof OwnerMenuRecipeSchema>;
export type RecipeSyncStatus = z.infer<typeof RecipeSyncStatusSchema>;
