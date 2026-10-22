import { z } from 'zod';

const count = z.number().int().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();

const DailyCupUsageSchema = z.object({
  date: date.nullish(),
  cups: count.nullish(),
});

const OperationalMetricsSchema = z.object({
  totalTenants: count.nullish(),
  legacyUnmappedContracts: count.nullish(),
  contractsByStatus: z.record(count).nullish(),
  expiringContractsWithin30Days: count.nullish(),
  expiringContractIds: z.array(uuid).nullish(),
  noResponseFollowUps: count.nullish(),
  noResponseContractIds: z.array(uuid).nullish(),
  machinesByTypeAndStatus: z.record(z.record(count)).nullish(),
  cupsInSelectedPeriod: count.nullish(),
  dailyAcceptedCupUsage: z.array(DailyCupUsageSchema).nullish(),
  openMaintenanceTickets: count.nullish(),
  openInstallationWorkOrders: count.nullish(),
  overdueInstallationWorkOrders: count.nullish(),
  overdueInstallationWorkOrderIds: z.array(uuid).nullish(),
});

const FinancialMetricSchema = z.object({
  currency: z.string().nullish(),
  amountIssued: z.number().nullish(),
  amountCollected: z.number().nullish(),
  outstandingBalance: z.number().nullish(),
  overdueBalance: z.number().nullish(),
});

const ScheduledWorkOrderSchema = z.object({
  workOrderId: uuid.nullish(),
  machineId: uuid.nullish(),
  status: z.string().nullish(),
  scheduledFor: z.string().datetime({ offset: true }).nullish(),
});

const TechnicianWorkMetricsSchema = z.object({
  openInstallationWorkOrders: count.nullish(),
  overdueInstallationWorkOrders: count.nullish(),
  openMaintenanceTickets: count.nullish(),
  scheduledWorkOrders: z.array(ScheduledWorkOrderSchema).nullish(),
  overdueInstallationWorkOrderIds: z.array(uuid).nullish(),
  maintenanceTicketIds: z.array(uuid).nullish(),
});

export const DashboardOverviewSchema = z.object({
  scope: z.string(),
  tenantId: uuid.nullish(),
  asOfDate: date.nullish(),
  usagePeriodStart: date.nullish(),
  usagePeriodEnd: date.nullish(),
  operationalMetrics: OperationalMetricsSchema.nullish(),
  financialMetrics: z.array(FinancialMetricSchema).nullish(),
  technicianWork: TechnicianWorkMetricsSchema.nullish(),
});

