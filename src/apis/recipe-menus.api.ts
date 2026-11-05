import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { GlobalRecipeSchema } from "@/schema/recipes.schema";
import {
  GlobalMenuRecipeSummarySchema,
  GlobalMenuSchema,
  LocalRecipeSnapshotRequestSchema,
  OwnerMenuRecipeSchema,
  OwnerMenuRecipeSummarySchema,
  OwnerMenuSchema,
  RecipeCopyRequestSchema,
  RecipeMenuNameRequestSchema,
  RecipeMenuPageSchema,
  CreateRecipeDslRequestSchema,
  type GlobalMenu,
  type OwnerMenu,
  type OwnerMenuRecipe,
} from "@/schema/recipe-menus.schema";

const id = (value: string) => z.string().uuid().parse(value);
const menuPath = (scope: "global" | "local", menuId: string) => `/recipe-menus/${scope}/${encodeURIComponent(id(menuId))}`;
const pageSchema = z.object({ page: z.number().int().nonnegative().default(0), size: z.number().int().min(1).max(100).default(20), q: z.string().trim().max(200).optional() }).strict();
const menuName = (name: string) => RecipeMenuNameRequestSchema.parse({ name });

export const recipeMenusApi = {
  async listGlobal(input: z.input<typeof pageSchema> = {}, signal?: AbortSignal) {
    const params = pageSchema.parse(input);
    const response = await axiosClient.get<unknown>("/recipe-menus/global", { baseURL: DOLORES_API_BASE_URL, params, signal });
    return RecipeMenuPageSchema(GlobalMenuSchema).parse(response.data);
  },
  async getGlobal(menuId: string, signal?: AbortSignal) {
    const validId = id(menuId);
    const response = await axiosClient.get<unknown>(menuPath("global", validId), { baseURL: DOLORES_API_BASE_URL, signal });
    const menu = GlobalMenuSchema.parse(response.data);
    if (menu.id !== validId) throw new Error("Dolores returned a different global menu.");
    return menu;
  },
  async createGlobal(name: string) {
    const response = await axiosClient.post<unknown>("/recipe-menus/global", menuName(name), { baseURL: DOLORES_API_BASE_URL });
    return GlobalMenuSchema.parse(response.data);
  },
  async renameGlobal(menuId: string, name: string) {
    const validId = id(menuId);
    const response = await axiosClient.patch<unknown>(menuPath("global", validId), menuName(name), { baseURL: DOLORES_API_BASE_URL });
    const menu = GlobalMenuSchema.parse(response.data);
    if (menu.id !== validId) throw new Error("Dolores returned a different global menu.");
    return menu;
  },
  async deleteGlobal(menuId: string) {
    await axiosClient.delete(menuPath("global", menuId), { baseURL: DOLORES_API_BASE_URL });
  },
  async listGlobalRecipes(menuId: string, input: z.input<typeof pageSchema> = {}, signal?: AbortSignal) {
    const validId = id(menuId);
    const params = pageSchema.parse(input);
    const response = await axiosClient.get<unknown>(`${menuPath("global", validId)}/recipes`, { baseURL: DOLORES_API_BASE_URL, params, signal });
    const page = RecipeMenuPageSchema(GlobalMenuRecipeSummarySchema).parse(response.data);
    if (page.content.some((recipe) => recipe.menuId && recipe.menuId !== validId)) throw new Error("Dolores returned a recipe outside this global menu.");
    return page;
  },
  async assignGlobalRecipe(menuId: string, recipeId: string) {
    const validMenuId = id(menuId);
    const validRecipeId = id(recipeId);
    const response = await axiosClient.put<unknown>(`${menuPath("global", validMenuId)}/recipes/${encodeURIComponent(validRecipeId)}`, undefined, { baseURL: DOLORES_API_BASE_URL });
    const recipe = GlobalRecipeSchema.parse(response.data);
    if (recipe.id !== validRecipeId || recipe.menuId !== validMenuId) throw new Error("Dolores returned a different global recipe or menu.");
    return recipe;
  },
  async removeGlobalRecipe(menuId: string, recipeId: string) {
    const validMenuId = id(menuId);
    const validRecipeId = id(recipeId);
    const response = await axiosClient.delete<unknown>(`${menuPath("global", validMenuId)}/recipes/${encodeURIComponent(validRecipeId)}`, { baseURL: DOLORES_API_BASE_URL });
    const recipe = GlobalRecipeSchema.parse(response.data);
    if (recipe.id !== validRecipeId) throw new Error("Dolores returned a different global recipe.");
    return recipe;
  },
  async listLocal(input: z.input<typeof pageSchema> = {}, signal?: AbortSignal) {
    const params = pageSchema.parse(input);
    const response = await axiosClient.get<unknown>("/recipe-menus/local", { baseURL: DOLORES_API_BASE_URL, params, signal });
    return RecipeMenuPageSchema(OwnerMenuSchema).parse(response.data);
  },
  async getLocal(menuId: string, signal?: AbortSignal) {
    const validId = id(menuId);
    const response = await axiosClient.get<unknown>(menuPath("local", validId), { baseURL: DOLORES_API_BASE_URL, signal });
    const menu = OwnerMenuSchema.parse(response.data);
    if (menu.id !== validId) throw new Error("Dolores returned a different local menu.");
    return menu;
  },
  async createLocal(name: string) {
    const response = await axiosClient.post<unknown>("/recipe-menus/local", menuName(name), { baseURL: DOLORES_API_BASE_URL });
    return OwnerMenuSchema.parse(response.data);
  },
  async renameLocal(menuId: string, name: string) {
    const validId = id(menuId);
    const response = await axiosClient.patch<unknown>(menuPath("local", validId), menuName(name), { baseURL: DOLORES_API_BASE_URL });
    const menu = OwnerMenuSchema.parse(response.data);
    if (menu.id !== validId) throw new Error("Dolores returned a different local menu.");
    return menu;
  },
  async deleteLocal(menuId: string) {
    await axiosClient.delete(menuPath("local", menuId), { baseURL: DOLORES_API_BASE_URL });
  },
  async listLocalRecipes(menuId: string, input: z.input<typeof pageSchema> = {}, signal?: AbortSignal) {
    const validId = id(menuId);
    const params = pageSchema.parse(input);
    const response = await axiosClient.get<unknown>(`${menuPath("local", validId)}/recipes`, { baseURL: DOLORES_API_BASE_URL, params, signal });
    const page = RecipeMenuPageSchema(OwnerMenuRecipeSummarySchema).parse(response.data);
    if (page.content.some((recipe) => recipe.menuId !== validId)) throw new Error("Dolores returned a recipe outside this Owner menu.");
    return page;
  },
  async getLocalRecipe(recipeId: string, signal?: AbortSignal) {
    const validId = id(recipeId);
    const response = await axiosClient.get<unknown>(`/recipe-menus/local/recipes/${encodeURIComponent(validId)}`, { baseURL: DOLORES_API_BASE_URL, signal });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (recipe.id !== validId) throw new Error("Dolores returned a different Owner recipe.");
    return recipe;
  },
  async createLocalRecipe(menuId: string, input: z.input<typeof LocalRecipeSnapshotRequestSchema>) {
    const validMenuId = id(menuId);
    const request = LocalRecipeSnapshotRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(`${menuPath("local", validMenuId)}/recipes`, request, { baseURL: DOLORES_API_BASE_URL });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (recipe.menuId !== validMenuId) throw new Error("Dolores created the recipe in a different Owner menu.");
    return recipe;
  },
  async createLocalDsl(input: z.input<typeof CreateRecipeDslRequestSchema>, menuId?: string) {
    const { menuId: bodyMenuId, ...fields } = CreateRecipeDslRequestSchema.parse(input);
    const targetId = menuId ? id(menuId) : bodyMenuId;
    const path = menuId ? `${menuPath("local", menuId)}/recipes/dsl` : "/recipe-menus/local/dsl";
    const request = menuId ? fields : { ...fields, ...(bodyMenuId ? { menuId: bodyMenuId } : {}) };
    const response = await axiosClient.post<unknown>(path, request, { baseURL: DOLORES_API_BASE_URL });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (targetId && recipe.menuId !== targetId) throw new Error("Dolores created the recipe in a different Owner menu.");
    return recipe;
  },
  async copyGlobalRecipe(input: { globalRecipeId: string; menuId?: string }): Promise<OwnerMenuRecipe> {
    const request = RecipeCopyRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>("/recipe-menus/local/copies", request, { baseURL: DOLORES_API_BASE_URL });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (recipe.sourceGlobalRecipeId !== request.globalRecipeId || (request.menuId && recipe.menuId !== request.menuId)) {
      throw new Error("Dolores copied a different recipe or menu.");
    }
    return recipe;
  },
  async moveLocalRecipe(menuId: string, recipeId: string) {
    const validMenuId = id(menuId);
    const validRecipeId = id(recipeId);
    const response = await axiosClient.put<unknown>(`${menuPath("local", validMenuId)}/recipes/${encodeURIComponent(validRecipeId)}`, undefined, { baseURL: DOLORES_API_BASE_URL });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (recipe.id !== validRecipeId || recipe.menuId !== validMenuId) throw new Error("Dolores moved a different local recipe.");
    return recipe;
  },
  async editLocalRecipe(recipeId: string, input: z.input<typeof LocalRecipeSnapshotRequestSchema>) {
    const validId = id(recipeId);
    const response = await axiosClient.patch<unknown>(`/recipe-menus/local/recipes/${encodeURIComponent(validId)}`, LocalRecipeSnapshotRequestSchema.parse(input), { baseURL: DOLORES_API_BASE_URL });
    const recipe = OwnerMenuRecipeSchema.parse(response.data);
    if (recipe.id !== validId) throw new Error("Dolores edited a different local recipe.");
    return recipe;
  },
  async deleteLocalRecipe(recipeId: string) {
    await axiosClient.delete(`/recipe-menus/local/recipes/${encodeURIComponent(id(recipeId))}`, { baseURL: DOLORES_API_BASE_URL });
  },
};
