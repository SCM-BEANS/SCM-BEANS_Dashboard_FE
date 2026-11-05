import { z } from "zod";

export const GlobalRecipeIdSchema = z.string().uuid();

export const RecipeDosageBoundSchema = z.string().trim().superRefine((value, context) => {
  const parts = value.split(":");
  if (parts.length !== 3) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Use the format parameter:min:max." });
    return;
  }

  const [parameter, minValue, maxValue] = parts.map((part) => part.trim());
  if (!parameter || !minValue || !maxValue) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Parameter, minimum, and maximum are required." });
    return;
  }

  const min = Number(minValue);
  const max = Number(maxValue);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum and maximum must be numbers." });
    return;
  }
  if (min < 0 || max < 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Dosage limits cannot be negative." });
    return;
  }
  if (max < min) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Maximum must be greater than or equal to minimum." });
  }
}).transform((value) => value.split(":").map((part) => part.trim()).join(":"));

export const RecipePublishRequestSchema = z.object({
  id: GlobalRecipeIdSchema.optional(),
  name: z.string().trim().min(1).max(160),
  steps: z.array(z.string().trim().min(1)).min(1),
  dosageBounds: z.array(RecipeDosageBoundSchema).min(1),
}).strict();

export const GlobalRecipeSchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string().min(1),
  steps: z.array(z.string()),
  dosageBounds: z.array(z.string()),
  revision: z.number().int().nonnegative(),
  menuId: z.string().uuid().nullable(),
}).strict();

export const GlobalRecipesSchema = z.array(GlobalRecipeSchema);
export const GlobalRecipeSummarySchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string().min(1),
  revision: z.number().int().nonnegative(),
  menuId: z.string().uuid().nullish(),
}).passthrough();
export const GlobalRecipeSummariesSchema = z.array(GlobalRecipeSummarySchema);
export type GlobalRecipeSummary = z.infer<typeof GlobalRecipeSummarySchema>;

export const LocalRecipeIdSchema = z.string().uuid();
export const LocalRecipeSchema = z.object({
  id: LocalRecipeIdSchema,
  ownerId: z.string().uuid().nullish(),
  globalRecipeId: GlobalRecipeIdSchema,
  dosageOverrides: z.array(z.string()),
}).passthrough();
export const LocalRecipesSchema = z.array(LocalRecipeSchema);
export const LocalRecipeUpsertRequestSchema = z.object({
  id: LocalRecipeIdSchema.optional(),
  globalRecipeId: GlobalRecipeIdSchema,
  dosageOverrides: z.array(z.string()),
}).strict();

export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
export type LocalRecipe = z.infer<typeof LocalRecipeSchema>;
export type LocalRecipeUpsertRequest = z.infer<typeof LocalRecipeUpsertRequestSchema>;


export const LocalRecipeSummarySchema = z.object({
  id: LocalRecipeIdSchema,
  ownerId: z.string().uuid().nullish(),
  globalRecipeId: GlobalRecipeIdSchema,
  globalRecipeName: z.string().nullish(),
}).passthrough();
export const LocalRecipeSummariesSchema = z.array(LocalRecipeSummarySchema);

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

export type LocalRecipeSummary = z.infer<typeof LocalRecipeSummarySchema>;

export type RecipeSyncRequest = z.infer<typeof RecipeSyncRequestSchema>;

export type RecipeSyncStatus = z.infer<typeof RecipeSyncStatusSchema>;
