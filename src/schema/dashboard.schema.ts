import { z } from "zod";

const nonnegativeCount = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const DASHBOARD_BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
const isCalendarDate = (value: string) => {
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const dateRangeInputSchema = z.object({
  fromDate: isoDate,
  toDate: isoDate,
}).refine(({ fromDate, toDate }) => {
  const from = Date.parse(fromDate + "T00:00:00Z");
  const to = Date.parse(toDate + "T00:00:00Z");
  return isCalendarDate(fromDate) && isCalendarDate(toDate) &&
    Number.isFinite(from) && Number.isFinite(to) && from <= to;
}, { message: "The start date must be on or before the end date." })
.refine(({ fromDate, toDate }) => {
  const from = Date.parse(fromDate + "T00:00:00Z");
  const to = Date.parse(toDate + "T00:00:00Z");
  const todayParts = new Intl.DateTimeFormat("en", {
    timeZone: DASHBOARD_BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    todayParts.find((item) => item.type === type)?.value ?? "";
  const today = Date.parse(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
  const day = 24 * 60 * 60 * 1000;
  return to <= today && (to - from) / day < 90;
}, { message: "The date range must end today or earlier and span no more than 90 days." });

const DailyCupUsageSchema = z.object({
  date: isoDate.nullish(),
  cups: nonnegativeCount.nullish(),
});

export const DailyMachineCupUsageSchema = z.object({
  machineId: z.string().uuid(),
  serialNumber: z.string().nullish(),
  region: z.string().nullish(),
  cups: nonnegativeCount,
});
export const DailyMachineCupUsageListSchema = z.array(DailyMachineCupUsageSchema);

const DashboardAvailableActionSchema = z.object({
  code: z.string().nullish(),
  method: z.string().nullish(),
  path: z.string().nullish(),
}).passthrough();

export const DashboardActionItemSchema = z.object({
  actionKey: z.string().nullish(),
  resourceType: z.string().nullish(),
  resourceId: z.string().uuid(),
  actionType: z.string().nullish(),
  status: z.string().nullish(),
  title: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
  ownerName: z.string().nullish(),
  contractId: z.string().uuid().nullish(),
  machineId: z.string().uuid().nullish(),
  machineSerialNumber: z.string().nullish(),
  technicianId: z.string().uuid().nullish(),
  technicianName: z.string().nullish(),
  createdAt: z.string().nullish(),
  scheduledAt: z.string().nullish(),
  dueAt: z.string().nullish(),
  overdue: z.boolean().nullish(),
  priority: z.string().nullish(),
  priorityReason: z.string().nullish(),
  detailPath: z.string().nullish(),
  workType: z.string().nullish(),
  availableActions: z.array(DashboardAvailableActionSchema).nullish(),
  nextAction: DashboardAvailableActionSchema.nullish(),
}).passthrough();

export const DashboardActionItemsPageSchema = z.object({
  items: z.array(DashboardActionItemSchema),
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().positive().optional(),
  hasMore: z.boolean().optional(),
  generatedAt: z.string().nullish(),
  businessTimezone: z.string().nullish(),
  workflowAvailability: z.array(z.unknown()).optional(),
}).passthrough();

export const DashboardActionItemsQuerySchema = z.object({
  actionType: z.string().optional(),
  resourceType: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(20),
});
export type TDashboardActionItemsQuery = z.input<typeof DashboardActionItemsQuerySchema>;

const OperationalMetricsSchema = z.object({
  totalOwners: nonnegativeCount.nullish(),
  legacyUnmappedContracts: nonnegativeCount.nullish(),
  contractsByStatus: z.record(nonnegativeCount).nullish(),
  expiringContractsWithin30Days: nonnegativeCount.nullish(),
  expiringContractIds: z.array(z.string().uuid()).nullish(),
  noResponseFollowUps: nonnegativeCount.nullish(),
  noResponseContractIds: z.array(z.string().uuid()).nullish(),
  machinesByTypeAndStatus: z.record(z.record(nonnegativeCount)).nullish(),
  cupsInSelectedPeriod: nonnegativeCount.nullish(),
  dailyAcceptedCupUsage: z.array(DailyCupUsageSchema).nullish(),
  openMaintenanceTickets: nonnegativeCount.nullish(),
  openInstallationWorkOrders: nonnegativeCount.nullish(),
  overdueInstallationWorkOrders: nonnegativeCount.nullish(),
  overdueInstallationWorkOrderIds: z.array(z.string().uuid()).nullish(),
}).passthrough();

const FinancialMetricSchema = z.object({
  currency: z.string().nullish(),
  amountIssued: z.number().nullish(),
  amountCollected: z.number().nullish(),
  outstandingBalance: z.number().nullish(),
  overdueBalance: z.number().nullish(),
}).passthrough();

export const DashboardOverviewSchema = z.object({
  scope: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
  asOfDate: isoDate.nullish(),
  usagePeriodStart: isoDate.nullish(),
  usagePeriodEnd: isoDate.nullish(),
  operationalMetrics: OperationalMetricsSchema.nullish(),
  financialMetrics: z.array(FinancialMetricSchema).nullish(),
}).passthrough();

export const DashboardDateRangeSchema = dateRangeInputSchema;

export type TDashboardOverview = z.infer<typeof DashboardOverviewSchema>;
export type TDailyMachineCupUsage = z.infer<typeof DailyMachineCupUsageSchema>;
export type TDashboardActionItem = z.infer<typeof DashboardActionItemSchema>;
