import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  GlobalRecipeIdSchema,
  GlobalRecipeSchema,
  GlobalRecipeSummariesSchema,
  RecipePublishRequestSchema,
  LocalRecipeIdSchema,
  LocalRecipeSummariesSchema,
  LocalRecipeSchema,
  LocalRecipeUpsertRequestSchema,
  RecipeCommandReplaySchema,
  type RecipePublishRequest,
  type LocalRecipeUpsertRequest,
} from "@/schema/recipes.schema";
import { RecipeSyncRequestSchema, RecipeSyncStatusSchema, RecipeSyncStatusesSchema } from "@/schema/recipe-menus.schema";
import { MachineIdSchema } from "@/schema/machines.schema";

type BoundedRecipePage<T> = { items: T[]; page: number; size: number; hasNext: boolean };

function responseHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : undefined;
}

function boundedPage<T>(items: T[], headers: unknown, requested: { page: number; size: number }): BoundedRecipePage<T> {
  const page = Number(responseHeader(headers, "x-page"));
  const size = Number(responseHeader(headers, "x-page-size"));
  const hasNext = responseHeader(headers, "x-has-next");
  return {
    items,
    page: Number.isInteger(page) && page >= 0 ? page : requested.page,
    size: Number.isInteger(size) && size > 0 ? size : requested.size,
    hasNext: hasNext === undefined ? items.length >= requested.size : hasNext.toLowerCase() === "true",
  };
}


const recipePath = (id: string) =>
  "/recipes/global/" + encodeURIComponent(GlobalRecipeIdSchema.parse(id));

export const recipesApi =  {
  async listGlobalPage(page = 0, size = 50, signal?: AbortSignal, q?: string): Promise<BoundedRecipePage<import("@/schema/recipes.schema").GlobalRecipeSummary>> {
    const params = { page: z.number().int().nonnegative().parse(page), size: z.number().int().min(1).max(100).parse(size), ...(q?.trim() ? { q: q.trim() } : {}) };
    const response = await axiosClient.get<unknown>("/recipes/global", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = GlobalRecipeSummariesSchema.parse(response.data);
    return boundedPage(items, response.headers, params);
  },
  async listGlobalSummaries(signal?: AbortSignal, page = 0, size = 50) {
    return (await recipesApi.listGlobalPage(page, size, signal)).items;
  },
  async listGlobal(signal?: AbortSignal) {
    return recipesApi.listGlobalSummaries(signal);
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
  async listLocalPage(input: { page?: number; size?: number; globalRecipeId?: string } = {}, signal?: AbortSignal): Promise<BoundedRecipePage<import("@/schema/recipes.schema").LocalRecipeSummary>> {
    const params = {
      page: input.page ?? 0,
      size: input.size ?? 50,
      ...(input.globalRecipeId ? { globalRecipeId: GlobalRecipeIdSchema.parse(input.globalRecipeId) } : {}),
    };
    const response = await axiosClient.get<unknown>("/recipes/local", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = LocalRecipeSummariesSchema.parse(response.data);
    return boundedPage(items, response.headers, params);
  },
  async listLocal(signal?: AbortSignal) {
    return (await recipesApi.listLocalPage({}, signal)).items;
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
    if (statuses.some((status) => !requested.has(status.machineId)) || requested.size !== new Set(statuses.map((status) => status.machineId)).size) throw new Error("Dolores returned incomplete or unrequested machine sync statuses.");
    return statuses;
  },
  async getSyncStatus(machineId: string, signal?: AbortSignal) {
    const validId = MachineIdSchema.parse(machineId);
    const response = await axiosClient.get<unknown>(`/recipes/sync/${encodeURIComponent(validId)}`, { baseURL: DOLORES_API_BASE_URL, signal });
    const status = RecipeSyncStatusSchema.parse(response.data);
    if (status.machineId !== validId) throw new Error("Dolores returned a different machine's recipe sync status.");
    return status;
  },
  async getSyncHistoryPage(machineId: string, page = 0, size = 50, signal?: AbortSignal) {
    const validId = MachineIdSchema.parse(machineId);
    const params = { page, size };
    const response = await axiosClient.get<unknown>(`/recipes/sync/${encodeURIComponent(validId)}/history`, { baseURL: DOLORES_API_BASE_URL, params, signal });
    const history = RecipeSyncStatusesSchema.parse(response.data);
    if (history.some((item) => item.machineId !== validId)) throw new Error("Dolores returned sync history for a different machine.");
    return boundedPage(history, response.headers, params);
  },
  async getSyncHistory(machineId: string, page = 0, size = 50, signal?: AbortSignal) {
    return (await recipesApi.getSyncHistoryPage(machineId, page, size, signal)).items;
  },
  async replaySyncCommand(machineId: string, commandId: string) {
    const validId = MachineIdSchema.parse(machineId);
    const validCommandId = z.string().uuid().parse(commandId);
    const response = await axiosClient.post<unknown>(`/recipes/sync/${encodeURIComponent(validId)}/commands/${encodeURIComponent(validCommandId)}/replay`, undefined, { baseURL: DOLORES_API_BASE_URL });
    const command = RecipeCommandReplaySchema.parse(response.data);
    if (command.machineId !== validId) throw new Error("Dolores returned a command for a different machine.");
    return command;
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
