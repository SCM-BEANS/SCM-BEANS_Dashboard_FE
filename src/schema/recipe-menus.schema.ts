import { z } from "zod";
import { RecipeProcedureSchema } from "./recipes.schema";
export { RecipeSyncRequestSchema, RecipeSyncStatusSchema, RecipeSyncStatusesSchema, type RecipeSyncStatus } from "./recipes.schema";
const uuid = z.string().uuid();
export const GlobalMenuSchema = z.object({ id: uuid, name: z.string().min(1), createdAt: z.string() }).strict();
export const OwnerMenuSchema = GlobalMenuSchema.extend({ ownerId: uuid });
export const GlobalMenuRecipeSummarySchema = z.object({ id: uuid, name: z.string(), revision: z.number().int().nonnegative(), menuId: uuid.nullable() }).strict();
export const OwnerMenuRecipeSummarySchema = z.object({
  id: uuid, ownerId: uuid, menuId: uuid, sourceGlobalRecipeId: uuid.nullable(), sourceRevision: z.number().int().nonnegative().nullable(),
  name: z.string(), createdAt: z.string().nullable(), updatedAt: z.string().nullable(),
}).strict();
export const OwnerMenuRecipeSchema = OwnerMenuRecipeSummarySchema.extend({ steps: z.array(z.string()), dosageOverrides: z.array(z.string()) });
export const RecipeMenuPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  content: z.array(itemSchema), page: z.number().int().nonnegative(), size: z.number().int().min(1).max(100),
  totalElements: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), first: z.boolean(), last: z.boolean(),
}).strict();
export const RecipeMenuNameRequestSchema = z.object({ name: z.string().trim().min(1).max(255) }).strict();
export const RecipeCopyRequestSchema = z.object({ globalRecipeId: uuid, menuId: uuid.optional() }).strict();
export const LocalRecipeSnapshotRequestSchema = z.object({
  name: z.string().trim().min(1), steps: z.array(z.string().trim().min(1)).min(1), dosageOverrides: z.array(z.string()).optional(),
}).strict();
export const CreateRecipeDslRequestSchema = z.object({
  name: z.string().trim().min(1), procedure: RecipeProcedureSchema, menuId: uuid.optional(),
  slug: z.string().trim().min(1).optional(), imagePath: z.string().trim().min(1).optional(),
}).strict();
export type GlobalMenu = z.infer<typeof GlobalMenuSchema>;
export type OwnerMenu = z.infer<typeof OwnerMenuSchema>;
export type GlobalMenuRecipeSummary = z.infer<typeof GlobalMenuRecipeSummarySchema>;
export type OwnerMenuRecipe = z.infer<typeof OwnerMenuRecipeSchema>;
export type CreateRecipeDslRequest = z.infer<typeof CreateRecipeDslRequestSchema>;

const activeMenuIdentity = {
  machineId: uuid, activeMenuId: uuid.nullable(), menuName: z.string().nullable(),
};
// The published guide and controller DTO are explicit, different response versions.
export const ActiveMachineMenuSchema = z.union([
  z.object({ ...activeMenuIdentity, fallbackStrategy: z.enum(["ACTIVE_OWNER_MENU", "SYSTEM_DEFAULT_OR_GLOBAL_FALLBACK"]), description: z.string().nullable() }).strict(),
  z.object({ ...activeMenuIdentity, assigned: z.boolean(), fallbackStrategy: z.enum(["CUSTOM_ASSIGNED_MENU", "SYSTEM_DEFAULT_OR_GLOBAL_FALLBACK"]), recipeCount: z.number().int().nonnegative(), itemCount: z.number().int().nonnegative(), lastSyncedAt: z.string().nullable() }).strict(),
]).superRefine((value, context) => {
  const assigned = value.activeMenuId !== null;
  if (("assigned" in value && value.assigned !== assigned) || (value.fallbackStrategy === "SYSTEM_DEFAULT_OR_GLOBAL_FALLBACK") === assigned) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Inconsistent active menu state" });
  }
});
export const AvailableMachineMenusSchema = z.array(z.union([
  OwnerMenuSchema,
  z.object({ id: uuid, name: z.string().min(1), description: z.string().nullable().optional(), recipeCount: z.number().int().nonnegative(), createdAt: z.string() }).strict(),
]));
export const MachineMenuAssignmentSchema = z.object({
  machineId: uuid, activeMenuId: uuid, menuName: z.string(), commandId: z.string().min(1).nullable(),
  targetVersion: z.number().int().nonnegative().nullable(), targetHash: z.string().nullable(), syncState: z.string().nullable(),
  syncRequested: z.boolean(), syncError: z.string().nullable(),
}).strict();
