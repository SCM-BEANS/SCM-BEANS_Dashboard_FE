import { z } from "zod";

export const GlobalRecipeIdSchema = z.string().uuid();

export const RecipePublishRequestSchema = z.object({
  name: z.string().trim().min(1).max(160),
  steps: z.array(z.string().trim().min(1)).min(1),
  dosageBounds: z.array(z.string()).min(1),
}).strict();

export const GlobalRecipeSchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string().min(1),
  steps: z.array(z.string()),
  dosageBounds: z.array(z.string()),
}).passthrough();

export const GlobalRecipesSchema = z.array(GlobalRecipeSchema);

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
