import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  GlobalRecipeIdSchema,
  GlobalRecipesSchema,
  GlobalRecipeSchema,
  GlobalRecipeSummariesSchema,
  RecipePublishRequestSchema,
  LocalRecipeIdSchema,
  LocalRecipesSchema,
  LocalRecipeSchema,
  LocalRecipeUpsertRequestSchema,
  type RecipePublishRequest,
  type LocalRecipeUpsertRequest,
} from "@/schema/recipes.schema";
import { RecipeSyncRequestSchema, RecipeSyncStatusSchema, RecipeSyncStatusesSchema } from "@/schema/recipe-menus.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import axios from "axios";


const recipePath = (id: string) =>
  "/recipes/global/" + encodeURIComponent(GlobalRecipeIdSchema.parse(id));

export const recipesApi =  {
  async listGlobalSummaries(signal?: AbortSignal, page = 0, size = 50) {
    const response = await axiosClient.get<unknown>("/recipes/global", {
      baseURL: DOLORES_API_BASE_URL,
      params: { page, size },
      signal,
    });
    return GlobalRecipeSummariesSchema.parse(response.data);
  },
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
  async requestSync(machineIds: string[]) {
    const request = RecipeSyncRequestSchema.parse({ machineIds });
    const response = await axiosClient.post<unknown>("/recipes/sync", request, { baseURL: DOLORES_API_BASE_URL });
    const statuses = RecipeSyncStatusesSchema.parse(response.data);
    const requested = new Set(request.machineIds);
    if (statuses.some((status) => !requested.has(status.machineId))) throw new Error("Dolores returned sync status for an unrequested machine.");
    return statuses;
  },
  async getSyncStatus(machineId: string, signal?: AbortSignal) {
    const validId = MachineIdSchema.parse(machineId);
    const response = await axiosClient.get<unknown>(`/recipes/sync/${encodeURIComponent(validId)}`, { baseURL: DOLORES_API_BASE_URL, signal });
    const status = RecipeSyncStatusSchema.parse(response.data);
    if (status.machineId !== validId) throw new Error("Dolores returned a different machine's recipe sync status.");
    return status;
  },
  async getSyncHistory(machineId: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = MachineIdSchema.parse(machineId);
    const params = { page, size };
    const response = await axiosClient.get<unknown>(`/recipes/sync/${encodeURIComponent(validId)}/history`, { baseURL: DOLORES_API_BASE_URL, params, signal });
    const history = RecipeSyncStatusesSchema.parse(response.data);
    if (history.some((item) => item.machineId !== validId)) throw new Error("Dolores returned sync history for a different machine.");
    return history;
  },
  async updateGlobal(id: string, input: RecipePublishRequest) {
    const validId = GlobalRecipeIdSchema.parse(id);
    const request = RecipePublishRequestSchema.parse(input);
    const response = await axiosClient.put<unknown>(
      recipePath(validId),
      request,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const recipe = GlobalRecipeSchema.parse(response.data);
    if (recipe.id !== validId) throw new Error("Dolores returned a different global recipe.");
    return recipe;
  },
  async deleteGlobal(id: string) {
    const validId = GlobalRecipeIdSchema.parse(id);
    await axiosClient.delete(recipePath(validId), { baseURL: DOLORES_API_BASE_URL });
  }
};
