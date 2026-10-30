import { z } from "zod";

export const GlobalRecipeIdSchema = z.string().uuid();

export const RecipePublishRequestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  steps: z.array(z.string().trim().min(1)).min(1),
  dosageBounds: z.array(z.string()).min(1),
}).strict();

export const GlobalRecipeSummarySchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string().min(1),
  revision: z.number().int().nonnegative(),
  menuId: z.string().uuid().nullish(),
}).passthrough();

export const GlobalRecipeSchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string().min(1),
  steps: z.array(z.string()),
  dosageBounds: z.array(z.string()),
  revision: z.number().int().nonnegative().nullish(),
  menuId: z.string().uuid().nullish(),
}).passthrough();

export const GlobalRecipesSchema = z.array(GlobalRecipeSummarySchema);

export const LocalRecipeIdSchema = z.string().uuid();
export const LocalRecipeSchema = z.object({
  id: LocalRecipeIdSchema,
  ownerId: z.string().uuid().nullish(),
  globalRecipeId: GlobalRecipeIdSchema,
  dosageOverrides: z.array(z.string()),
}).passthrough();
export const LocalRecipeSummarySchema = z.object({
  id: LocalRecipeIdSchema,
  ownerId: z.string().uuid().nullish(),
  globalRecipeId: GlobalRecipeIdSchema,
}).passthrough();
export const LocalRecipesSchema = z.array(LocalRecipeSummarySchema);
export const LocalRecipeUpsertRequestSchema = z.object({
  id: LocalRecipeIdSchema.optional(),
  globalRecipeId: GlobalRecipeIdSchema,
  dosageOverrides: z.array(z.string()),
}).strict();

export const RecipeSyncRequestSchema = z.object({
  machineIds: z.array(z.string().uuid()).min(1),
}).strict();
export const RecipeSyncStatusSchema = z.object({
  machineId: z.string().uuid(),
  targetVersion: z.number().int().nonnegative(),
  targetHash: z.string().nullish(),
  appliedVersion: z.number().int().nonnegative().nullish(),
  appliedHash: z.string().nullish(),
  commandId: z.string().uuid().nullish(),
  state: z.string().min(1),
  retryCount: z.number().int().nonnegative(),
  lastError: z.string().nullish(),
  requestedAt: z.string().nullish(),
  lastAttemptAt: z.string().nullish(),
  appliedAt: z.string().nullish(),
  expiresAt: z.string().nullish(),
}).passthrough();
export const RecipeSyncStatusesSchema = z.array(RecipeSyncStatusSchema);

export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type GlobalRecipeSummary = z.infer<typeof GlobalRecipeSummarySchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
export type LocalRecipe = z.infer<typeof LocalRecipeSchema>;
export type LocalRecipeSummary = z.infer<typeof LocalRecipeSummarySchema>;
export type LocalRecipeUpsertRequest = z.infer<typeof LocalRecipeUpsertRequestSchema>;
export type RecipeSyncRequest = z.infer<typeof RecipeSyncRequestSchema>;
export type RecipeSyncStatus = z.infer<typeof RecipeSyncStatusSchema>;
