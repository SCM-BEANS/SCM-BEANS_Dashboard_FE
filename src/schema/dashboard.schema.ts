import { z } from "zod";

const nonnegativeCount = z.number().int().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
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
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const day = 24 * 60 * 60 * 1000;
  return to <= today.getTime() && (to - from) / day <= 90;
}, { message: "The date range must end today or earlier and span no more than 90 days." });

const DailyCupUsageSchema = z.object({
  date: isoDate.nullish(),
  cups: nonnegativeCount.nullish(),
});

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
