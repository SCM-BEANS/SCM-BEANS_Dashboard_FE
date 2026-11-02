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

const PeriodFinancialQualitySchema = z.object({
  status: z.enum(["COMPLETE", "PARTIAL", "UNAVAILABLE"]).optional(),
  eligibleCount: nonnegativeCount.optional(),
  evidencedCount: nonnegativeCount.optional(),
  missingCount: nonnegativeCount.optional(),
  ambiguousCount: nonnegativeCount.optional(),
  excludedClassificationCount: nonnegativeCount.optional(),
  exclusionReasons: z.record(nonnegativeCount).optional(),
}).strict();

const PeriodFinancialMetricSchema = z.object({
  currency: z.string().optional(),
  amountIssuedInPeriod: z.number().finite().optional(),
  amountCollectedInPeriod: z.number().finite().optional(),
  issuanceQuality: PeriodFinancialQualitySchema.optional(),
  collectionQuality: PeriodFinancialQualitySchema.optional(),
  issuanceBasis: z.string().optional(),
  collectionBasis: z.string().optional(),
}).strict();

export const DashboardOverviewSchema = z.object({
  scope: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
  asOfDate: isoDate.nullish(),
  usagePeriodStart: isoDate.nullish(),
  usagePeriodEnd: isoDate.nullish(),
  operationalMetrics: OperationalMetricsSchema.nullish(),
  financialMetrics: z.array(FinancialMetricSchema).nullish(),
  periodFinancialMetrics: z.array(PeriodFinancialMetricSchema).optional(),
}).passthrough();

export const DashboardDateRangeSchema = dateRangeInputSchema;

export const DashboardActionTypeSchema = z.enum([
  "CONTRACT_EXPIRING", "CONTRACT_EXPIRY_FOLLOW_UP", "CONTRACT_DATA_REVIEW",
  "PAYMENT_PROOF_REVIEW", "REPAIR_COST_REVIEW", "REPAIR_COST_DISPUTE", "REPAIR_COST_OWNER_RESPONSE",
  "MAINTENANCE_SCHEDULE", "MAINTENANCE_WORK_ORDER", "MAINTENANCE_OVERDUE_REVIEW", "MAINTENANCE_PROGRESS",
  "REPAIR_TRIAGE", "REPAIR_REPLACEMENT", "REPAIR_REPLACEMENT_DECISION", "REPAIR_PROGRESS",
  "TECHNICAL_WORK", "INSTALLATION_WORK", "OWNER_HANDOVER_ACK",
  "RECALL_ASSIGN", "RECALL_WORK", "RECALL_OWNER_ACK", "RECALL_RECEIPT_REVIEW", "LEGACY_RECALL_REVIEW",
  "BUYBACK_REVIEW", "BUYBACK_WORK", "BUYBACK_PAYMENT_PROOF_REVIEW",
  "REFUND_REVIEW", "REFUND_PAYOUT", "REFUND_OWNER_RECEIPT", "REFUND_DISPUTE", "REFUND_CONFIRM_REQUEST",
  "OWNER_INVOICE_PAYMENT",
]);

export const DashboardResourceTypeSchema = z.enum([
  "CONTRACT", "TERMINATION_CASE", "PAYMENT_PROOF", "REPAIR_COST_REVIEW", "MAINTENANCE_REQUEST",
  "MAINTENANCE_TICKET", "REPAIR_CASE", "MAINTENANCE_CUSTODY_EVENT", "INSTALLATION_WORK_ORDER",
  "RECALL_WORK_ORDER", "BUYBACK_CASE", "BUYBACK_PAYMENT_PROOF", "REFUND", "INVOICE",
]);

export const DashboardTimeBucketSchema = z.enum(["TODAY", "UPCOMING", "OVERDUE", "UNSCHEDULED"]);

export const DashboardActionItemSchema = z.object({
  actionKey: z.string().min(1),
  resourceType: DashboardResourceTypeSchema,
  resourceId: z.string().uuid(),
  actionType: DashboardActionTypeSchema,
  status: z.string(),
  title: z.string(),
  ownerId: z.string().uuid().nullish(),
  ownerName: z.string().nullish(),
  contractId: z.string().uuid().nullish(),
  machineId: z.string().uuid().nullish(),
  machineSerialNumber: z.string().nullish(),
  technicianId: z.string().uuid().nullish(),
  technicianName: z.string().nullish(),
  createdAt: z.string().datetime({ offset: true }).nullish(),
  scheduledAt: z.string().datetime({ offset: true }).nullish(),
  dueAt: z.string().datetime({ offset: true }).nullish(),
  overdue: z.boolean(),
  priority: z.string(),
  priorityReason: z.string().nullish(),
  detailPath: z.string().min(1),
  workType: z.string().nullish(),
  availableActions: z.array(z.object({ code: z.string(), method: z.string(), path: z.string() })),
  nextAction: z.object({ code: z.string(), method: z.string(), path: z.string() }).nullish(),
}).passthrough();

export const DashboardWorkflowAvailabilitySchema = z.object({
  workflow: z.string(),
  available: z.boolean(),
  reason: z.string().nullish(),
}).passthrough();

export const DashboardActionItemsPageSchema = z.object({
  items: z.array(DashboardActionItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  hasMore: z.boolean(),
  generatedAt: z.string().datetime({ offset: true }),
  businessTimezone: z.string(),
  workflowAvailability: z.array(DashboardWorkflowAvailabilitySchema),
}).passthrough();

export const DashboardActionItemsFilterSchema = z.object({
  actionType: DashboardActionTypeSchema.optional(),
  resourceType: DashboardResourceTypeSchema.optional(),
  timeBucket: DashboardTimeBucketSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(20),
});

export type TDashboardActionItem = z.infer<typeof DashboardActionItemSchema>;
export type TDashboardActionItemsPage = z.infer<typeof DashboardActionItemsPageSchema>;
export type TDashboardActionItemsFilter = z.input<typeof DashboardActionItemsFilterSchema>;

export type TDashboardOverview = z.infer<typeof DashboardOverviewSchema>;
export type TDailyMachineCupUsage = z.infer<typeof DailyMachineCupUsageSchema>;
