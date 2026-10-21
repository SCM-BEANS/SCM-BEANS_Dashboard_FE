import { requestDolores } from './client';
import {
  GlobalRecipeIdSchema,
  GlobalRecipeSchema,
  GlobalRecipesSchema,
  RecipePublishRequestSchema,
  type RecipePublishRequest,
} from '@/schemas/dolores/recipes';

export const recipesApi = {
  listGlobal(signal?: AbortSignal) {
    return requestDolores(
      { method: 'GET', url: '/recipes/global', signal },
      GlobalRecipesSchema
    );
  },

  getGlobalById(id: string, signal?: AbortSignal) {
    const recipeId = GlobalRecipeIdSchema.parse(id);
    return requestDolores(
      { method: 'GET', url: '/recipes/global/' + recipeId, signal },
      GlobalRecipeSchema
    );
  },

  publishGlobal(input: RecipePublishRequest) {
    const data = RecipePublishRequestSchema.parse(input);
    return requestDolores(
      { method: 'POST', url: '/recipes/global', data },
      GlobalRecipeSchema
    );
  },
};
