import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  GlobalRecipeIdSchema,
  GlobalRecipesSchema,
  GlobalRecipeSchema,
  RecipePublishRequestSchema,
  LocalRecipeIdSchema,
  LocalRecipesSchema,
  LocalRecipeSchema,
  LocalRecipeUpsertRequestSchema,
  type RecipePublishRequest,
  type LocalRecipeUpsertRequest,
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

  async listLocal(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/recipes/local", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return LocalRecipesSchema.parse(response.data);
  },

  async getLocalById(id: string, signal?: AbortSignal) {
    const validId = LocalRecipeIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(
      "/recipes/local/" + encodeURIComponent(validId),
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const recipe = LocalRecipeSchema.parse(response.data);
    if (recipe.id !== validId) throw new Error("Dolores returned a different local recipe.");
    return recipe;
  },

  async upsertLocal(input: LocalRecipeUpsertRequest) {
    const request = LocalRecipeUpsertRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      "/recipes/local",
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return LocalRecipeSchema.parse(response.data);
  },

  async deleteLocal(id: string) {
    const validId = LocalRecipeIdSchema.parse(id);
    await axiosClient.delete("/recipes/local/" + encodeURIComponent(validId), {
      baseURL: DOLORES_API_BASE_URL,
    });
  },
};
