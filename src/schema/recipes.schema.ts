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

export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
