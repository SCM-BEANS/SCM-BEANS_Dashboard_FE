import type { z } from 'zod';
import type { GlobalRecipeSchema, RecipePublishRequestSchema } from '@/schemas/dolores/recipes';

export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
