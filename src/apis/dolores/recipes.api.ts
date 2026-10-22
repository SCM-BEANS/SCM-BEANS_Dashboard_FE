import { doloresAxiosClient, parseDoloresResponse } from './client';
import {
  GlobalRecipeIdSchema,
  GlobalRecipeSchema,
  GlobalRecipesSchema,
  RecipePublishRequestSchema,
} from '@/schemas/dolores/recipes';
import type { GlobalRecipe, RecipePublishRequest } from '@/types/dolores/recipes';

export const recipesApi = {
  listGlobal: async (signal?: AbortSignal): Promise<GlobalRecipe[]> => {
    const response = await doloresAxiosClient.get<unknown>('/recipes/global', { signal });
    return parseDoloresResponse(response.data, GlobalRecipesSchema);
  },

  getGlobalById: async (id: string, signal?: AbortSignal): Promise<GlobalRecipe> => {
    const recipeId = GlobalRecipeIdSchema.parse(id);
    const response = await doloresAxiosClient.get<unknown>('/recipes/global/' + recipeId, { signal });
    return parseDoloresResponse(response.data, GlobalRecipeSchema);
  },

  publishGlobal: async (input: RecipePublishRequest): Promise<GlobalRecipe> => {
    const data = RecipePublishRequestSchema.parse(input);
    const response = await doloresAxiosClient.post<unknown>('/recipes/global', data);
    return parseDoloresResponse(response.data, GlobalRecipeSchema);
  },
};
