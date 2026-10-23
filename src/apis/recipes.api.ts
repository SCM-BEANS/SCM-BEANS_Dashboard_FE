import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  GlobalRecipeIdSchema,
  GlobalRecipesSchema,
  GlobalRecipeSchema,
  RecipePublishRequestSchema,
  type RecipePublishRequest,
} from "@/schema/recipes.schema";

const recipePath = (id: string) =>
  "/recipes/global/" + encodeURIComponent(GlobalRecipeIdSchema.parse(id));

export const recipesApi = {
  async listGlobal(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/recipes/global", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return GlobalRecipesSchema.parse(response.data);
  },

  async getGlobalById(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(recipePath(id), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const recipe = GlobalRecipeSchema.parse(response.data);
    if (recipe.id !== id) throw new Error("Dolores returned a different global recipe.");
    return recipe;
  },

  async publishGlobal(input: RecipePublishRequest) {
    const request = RecipePublishRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/recipes/global",
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return GlobalRecipeSchema.parse(response.data);
  },
};
