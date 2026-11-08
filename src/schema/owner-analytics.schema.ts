import { z } from "zod";

const count = z.number().int().nonnegative().safe();
const instant = z.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)));
const calendarDate = z.string().date().refine((value) => value.slice(0, 4) < "9999");
const machineIdentifier = z.string().trim().min(1);
export const AnalyticsFromSchema = z.union([instant, calendarDate.transform((value) => `${value}T00:00:00Z`)]);
export const AnalyticsToSchema = z.union([instant, calendarDate.transform((value) => new Date(Date.parse(`${value}T00:00:00Z`) + 86_400_000).toISOString())]);
const rangeFields = { from: AnalyticsFromSchema, to: AnalyticsToSchema, machineId: machineIdentifier.optional() };
const increasing = (value: { from: string; to: string }) => Date.parse(value.from) < Date.parse(value.to);
const rangeError = { message: "Thời điểm bắt đầu phải trước thời điểm kết thúc.", path: ["to"] };

export const OWNER_ANALYTICS_DAILY_BUCKET_TIME_ZONE = "UTC";
export const OWNER_CLEANING_SNAPSHOT_PAGE_SIZE = 100;
export const OWNER_CLEANING_SNAPSHOT_MAX_PAGES = 5;

export const OwnerAnalyticsCalendarRangeSchema = z.object({
  fromDate: calendarDate,
  toDate: calendarDate,
}).strict().refine(({ fromDate, toDate }) => fromDate <= toDate, {
  message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.", path: ["toDate"],
}).transform(({ fromDate, toDate }) => ({
  // Business calendar is Vietnam (UTC+07), independent of the browser timezone.
  from: new Date(`${fromDate}T00:00:00+07:00`).toISOString().replace(".000Z", "Z"),
  to: new Date(Date.parse(`${toDate}T00:00:00+07:00`) + 86_400_000).toISOString().replace(".000Z", "Z"),
}));

export const OwnerAnalyticsRangeSchema = z.object(rangeFields).strict().refine(increasing, rangeError);
const pageFields = { page: count.max(2_147_483_647).default(0), size: z.number().int().min(1).max(100).default(20) };
export const OwnerBrewRecordsParamsSchema = z.object({
  ...rangeFields, ...pageFields, recipeName: z.string().trim().min(1).optional(),
}).strict().refine(increasing, rangeError);
export const OwnerCleaningTypeSchema = z.enum(["STARTUP", "CLOSING"]);
// Both the deployed OpenAPI and CleaningRecordStatus.java use ABORTED.
export const OwnerCleaningStatusSchema = z.enum(["COMPLETED", "FAILED", "ABORTED"]);
export const OwnerCleaningRecordsParamsSchema = z.object({
  ...rangeFields, ...pageFields,
  cleaningType: OwnerCleaningTypeSchema.optional(), status: OwnerCleaningStatusSchema.optional(),
}).strict().refine(increasing, rangeError);
export const OwnerAnalyticsContextSchema = z.object({
  ownerId: z.string().uuid().optional(), machineId: z.string().uuid().optional(),
  machineSerialNumber: machineIdentifier.optional(),
}).strict();

export const OwnerCupCountSchema = z.object({
  ownerId: z.string().uuid(), from: instant, to: instant,
  totalCups: count,
  // Backend returns the entire active fleet count, even with a machine filter.
  activeMachineCount: count,
  machineBreakdown: z.array(z.object({ machineSerialNumber: z.string(), cups: count })),
  dailyBreakdown: z.array(z.object({ date: z.string().date(), cups: count })),
  recipeBreakdown: z.array(z.object({ recipeName: z.string(), cups: count })),
}).refine(increasing, rangeError);
export const OwnerBrewRecordSchema = z.object({
  id: z.string().uuid(), eventId: z.string().uuid(), machineId: z.string().uuid(),
  machineSerialNumber: z.string(), recipeName: z.string(), brewedAt: instant, receivedAt: instant.nullable(),
});
export const OwnerCleaningRecordSchema = z.object({
  id: z.string().uuid(), eventId: z.string().uuid(), machineId: z.string().uuid(),
  machineSerialNumber: z.string(), cleaningType: OwnerCleaningTypeSchema,
  startedAt: instant, finishedAt: instant.nullable(),
  coffeeCleaned: z.boolean(), milkCleaned: z.boolean(),
  heatingCompleted: z.boolean(), groupheadPurged: z.boolean(),
  status: OwnerCleaningStatusSchema, notes: z.string().nullable(),
});
function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item), page: count, size: z.number().int().min(1).max(100),
    totalElements: count, totalPages: count, first: z.boolean(), last: z.boolean(),
  }).superRefine((page, ctx) => {
    if (page.content.length > page.size || page.totalPages !== Math.ceil(page.totalElements / page.size)
      || page.first !== (page.page === 0) || page.last !== (page.page >= page.totalPages - 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Metadata phân trang không hợp lệ." });
    }
  });
}
export const OwnerBrewRecordsPageSchema = pageOf(OwnerBrewRecordSchema);
export const OwnerCleaningRecordsPageSchema = pageOf(OwnerCleaningRecordSchema);
export type OwnerAnalyticsRange = z.input<typeof OwnerAnalyticsRangeSchema>;
export type OwnerBrewRecordsParams = z.input<typeof OwnerBrewRecordsParamsSchema>;
export type OwnerCleaningRecordsParams = z.input<typeof OwnerCleaningRecordsParamsSchema>;
export type OwnerAnalyticsContext = z.infer<typeof OwnerAnalyticsContextSchema>;
export type OwnerCupCount = z.infer<typeof OwnerCupCountSchema>;
export type OwnerBrewRecord = z.infer<typeof OwnerBrewRecordSchema>;
export type OwnerCleaningRecord = z.infer<typeof OwnerCleaningRecordSchema>;
export type OwnerBrewRecordsPage = z.infer<typeof OwnerBrewRecordsPageSchema>;
export type OwnerCleaningRecordsPage = z.infer<typeof OwnerCleaningRecordsPageSchema>;


export const MachineHistoryParamsSchema = z.object({
  from: AnalyticsFromSchema, to: AnalyticsToSchema,
  page: z.number().int().nonnegative().max(2_147_483_647).default(0),
  size: z.number().int().min(1).max(100).default(20),
}).strict().refine((value) => Date.parse(value.from) < Date.parse(value.to), { message: "Khoảng thời gian không hợp lệ.", path: ["to"] });
export type MachineHistoryParams = z.input<typeof MachineHistoryParamsSchema>;

function machineHistoryPage<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    content: z.array(item), number: z.number().int().nonnegative(),
    size: z.number().int().min(1).max(100), totalElements: z.number().int().nonnegative().safe(),
    totalPages: z.number().int().nonnegative(), first: z.boolean(), last: z.boolean(),
  }).superRefine((page, ctx) => {
    if (page.content.length > page.size || page.content.length > page.totalElements
      || page.totalPages !== Math.ceil(page.totalElements / page.size)
      || page.first !== (page.number === 0) || page.last !== (page.number >= page.totalPages - 1)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Metadata phân trang không hợp lệ." });
    }
  }).transform(({ number, ...page }) => ({ ...page, page: number }));
}
export const MachineBrewRecordsPageSchema = machineHistoryPage(OwnerBrewRecordSchema);
export const MachineCleaningRecordsPageSchema = machineHistoryPage(OwnerCleaningRecordSchema);
