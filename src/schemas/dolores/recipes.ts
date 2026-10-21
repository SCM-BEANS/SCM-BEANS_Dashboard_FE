import { z } from 'zod';

export const GlobalRecipeIdSchema = z.string().uuid();

export const GlobalRecipeSchema = z.object({
  id: GlobalRecipeIdSchema,
  name: z.string(),
  steps: z.array(z.string()),
  dosageBounds: z.array(z.string()),
});

export const GlobalRecipesSchema = z.array(GlobalRecipeSchema);

export const RecipePublishRequestSchema = z.object({
  name: z.string().trim().min(1),
  steps: z.array(z.string().trim().min(1)).min(1),
  dosageBounds: z.array(z.string()),
});

export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
