import { z } from "zod";

export const GlobalRecipeIdSchema = z.string().uuid();
export const LocalRecipeIdSchema = z.string().uuid();
export const RECIPE_DIRECTIVES = ["PREWATER", "PREMILK", "DOSE", "TAMP", "HOLDTAMP", "PREINFUSE", "BLOOM", "EXTRACT", "DRYTAMP", "POSTMILK", "POSTWATER"] as const;
export type RecipeDirective = typeof RECIPE_DIRECTIVES[number];
export type RecipeProcedureDraft = Record<Exclude<RecipeDirective, "DRYTAMP">, string>;
export const emptyRecipeProcedure = (): RecipeProcedureDraft => ({ PREWATER: "", PREMILK: "", DOSE: "", TAMP: "100", HOLDTAMP: "50", PREINFUSE: "", BLOOM: "", EXTRACT: "", POSTMILK: "", POSTWATER: "" });

// Forms emit canonical directives. Library steps may still contain older display strings.
export const RecipeProcedureSchema = z.array(z.string().trim().min(1)).min(1).superRefine((steps, ctx) => {
  const seen = new Set<string>();
  for (const [index, step] of steps.entries()) {
    const match = /^([A-Z]+):(-?\d+(?:\.\d+)?)$/.exec(step);
    if (!match || !RECIPE_DIRECTIVES.includes(match[1] as RecipeDirective)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "Bước pha phải có dạng lệnh chuẩn và giá trị số." });
      continue;
    }
    const [, directive, raw] = match;
    const value = Number(raw);
    const positive = ["DOSE", "EXTRACT", "TAMP"].includes(directive);
    const milk = directive === "PREMILK" || directive === "POSTMILK";
    if (seen.has(directive) || !Number.isFinite(value) || (positive ? Math.round(value * 10) / 10 <= 0 : value < (milk ? -1 : 0)) || (milk && !Number.isInteger(value)) || (directive === "DRYTAMP" && value !== 100)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: "Thông số không hợp lệ hoặc bị lặp. Kiểm tra giá trị và đơn vị." });
    }
    seen.add(directive);
  }
  if (!seen.has("DOSE") || !seen.has("EXTRACT")) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Cần nhập lượng cà phê và lượng nước chiết xuất." });
});
export function buildRecipeProcedure(draft: RecipeProcedureDraft, dryTamp?: string | null): string[] {
  return RecipeProcedureSchema.parse(RECIPE_DIRECTIVES.flatMap((key) => {
    if (key === "DRYTAMP") return dryTamp === null ? [] : [`DRYTAMP:${dryTamp ?? "100"}`];
    const value = draft[key].trim();
    return value ? [key + ":" + value] : [];
  }));
}
export const RecipePublishRequestSchema = z.object({
  name: z.string().trim().min(1), slug: z.string().trim().min(1).optional(),
  imagePath: z.string().trim().min(1).optional(), procedure: RecipeProcedureSchema,
}).strict();
export const GlobalRecipeSchema = z.object({
  id: GlobalRecipeIdSchema, name: z.string().min(1), steps: z.array(z.string()),
  revision: z.number().int().nonnegative(), menuId: z.string().uuid().nullable(),
}).strict();
export const GlobalRecipesSchema = z.array(GlobalRecipeSchema);
export const GlobalRecipeSummarySchema = GlobalRecipeSchema.omit({ steps: true });
export const GlobalRecipeSummariesSchema = z.array(GlobalRecipeSummarySchema);
export const RecipeOverrideValueSchema = z.string().trim().regex(/^[^:\s]+:-?\d+(?:\.\d+)?$/, "Dùng tên thông số và giá trị số, ví dụ water:40.");
export const LocalRecipeSchema = z.object({
  id: LocalRecipeIdSchema, ownerId: z.string().uuid(), globalRecipeId: GlobalRecipeIdSchema,
  globalRecipeName: z.string().nullish(), dosageOverrides: z.array(z.string()),
}).strict();
export const LocalRecipesSchema = z.array(LocalRecipeSchema);
export const LocalRecipeSummarySchema = LocalRecipeSchema.omit({ dosageOverrides: true });
export const LocalRecipeSummariesSchema = z.array(LocalRecipeSummarySchema);
export const LocalRecipeUpsertRequestSchema = z.object({
  id: LocalRecipeIdSchema.optional(), globalRecipeId: GlobalRecipeIdSchema,
  dosageOverrides: z.array(RecipeOverrideValueSchema),
}).strict();
export const RecipeSyncRequestSchema = z.object({ machineIds: z.array(z.string().uuid()).min(1).max(100) }).strict();
export const RecipeSyncStatusSchema = z.object({
  machineId: z.string().uuid(), targetVersion: z.number().int().nonnegative(), targetHash: z.string().nullable(),
  appliedVersion: z.number().int().nonnegative().nullable(), appliedHash: z.string().nullable(),
  commandId: z.string().uuid().nullable(), state: z.enum(["PENDING", "DELIVERED", "APPLIED", "OFFLINE", "EXPIRED", "FAILED"]),
  retryCount: z.number().int().nonnegative(), lastError: z.string().nullable(), requestedAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(), appliedAt: z.string().nullable(), expiresAt: z.string().nullable(),
}).strict();
export const RecipeSyncStatusesSchema = z.array(RecipeSyncStatusSchema);
export const RecipeCommandReplaySchema = z.object({
  id: z.string().uuid(), machineId: z.string().uuid(), ownerId: z.string().uuid().nullable(),
  commandType: z.string(), payload: z.string(), status: z.string(), targetVersion: z.number().int(),
  targetHash: z.string(), attempts: z.number().int().nonnegative(), expiresAt: z.string().nullable(),
  lastAttemptAt: z.string().nullable(), acknowledgedAt: z.string().nullable(), createdAt: z.string().nullable(),
}).passthrough();
export type GlobalRecipe = z.infer<typeof GlobalRecipeSchema>;
export type GlobalRecipeSummary = z.infer<typeof GlobalRecipeSummarySchema>;
export type RecipePublishRequest = z.infer<typeof RecipePublishRequestSchema>;
export type LocalRecipe = z.infer<typeof LocalRecipeSchema>;
export type LocalRecipeSummary = z.infer<typeof LocalRecipeSummarySchema>;
export type LocalRecipeUpsertRequest = z.infer<typeof LocalRecipeUpsertRequestSchema>;
export type RecipeSyncRequest = z.infer<typeof RecipeSyncRequestSchema>;
export type RecipeSyncStatus = z.infer<typeof RecipeSyncStatusSchema>;

export function isRecipeSyncApplied(status: RecipeSyncStatus): boolean {
  return status.state === "APPLIED" && status.appliedVersion === status.targetVersion
    && Boolean(status.targetHash) && status.appliedHash === status.targetHash;
}
