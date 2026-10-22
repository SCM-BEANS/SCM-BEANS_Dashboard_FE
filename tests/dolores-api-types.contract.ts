import type { z } from 'zod';

import type { InvoiceSchema, PaymentProofSchema } from '@/schemas/dolores/billing';
import type { BuybackCaseSchema } from '@/schemas/dolores/buybacks';
import type {
  ContractDocumentSchema,
  ContractExpiryStatusSchema,
  ContractSchema,
} from '@/schemas/dolores/contracts';
import type { DashboardOverviewSchema } from '@/schemas/dolores/dashboard';
import type {
  InstallationWorkOrderAccessorySchema,
  InstallationWorkOrderChecklistItemSchema,
  InstallationWorkOrderDetailsSchema,
  InstallationWorkOrderEvidenceMetadataSchema,
  InstallationWorkOrderSummarySchema,
} from '@/schemas/dolores/installationWorkOrders';
import type { StoreLocationSchema } from '@/schemas/dolores/locations';
import type {
  InventorySummarySchema,
  MachineDetailSchema,
  MachineHeartbeatSchema,
  MachineInventoryItemSchema,
  MaintenanceScheduleSchema,
  MaintenanceTicketSchema,
} from '@/schemas/dolores/machines';
import type {
  AlertSchema,
  NotificationSchema,
  NotificationUnreadCountSchema,
} from '@/schemas/dolores/notifications';
import type { GlobalRecipeSchema, RecipePublishRequestSchema } from '@/schemas/dolores/recipes';
import type { TelemetryPointSchema } from '@/schemas/dolores/telemetry';
import type { TenantSchema } from '@/schemas/dolores/tenants';

import type { Invoice, PaymentProof } from '@/types/dolores/billing';
import type { BuybackCase } from '@/types/dolores/buybacks';
import type { Contract, ContractDocument, ContractExpiryStatus } from '@/types/dolores/contracts';
import type { DashboardOverview } from '@/types/dolores/dashboard';
import type {
  InstallationWorkOrderAccessory,
  InstallationWorkOrderChecklistItem,
  InstallationWorkOrderDetails,
  InstallationWorkOrderEvidenceMetadata,
  InstallationWorkOrderSummary,
} from '@/types/dolores/installationWorkOrders';
import type { StoreLocation } from '@/types/dolores/locations';
import type {
  InventorySummary,
  MachineDetail,
  MachineHeartbeat,
  MachineInventoryItem,
  MaintenanceSchedule,
  MaintenanceTicket,
} from '@/types/dolores/machines';
import type { Alert, Notification, NotificationUnreadCount } from '@/types/dolores/notifications';
import type { GlobalRecipe, RecipePublishRequest } from '@/types/dolores/recipes';
import type { TelemetryPoint } from '@/types/dolores/telemetry';
import type { Tenant } from '@/types/dolores/tenants';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;

type Expect<T extends true> = T;

export type DoloresDtoContractChecks = [
  Expect<Equal<Invoice, z.infer<typeof InvoiceSchema>>>,
  Expect<Equal<PaymentProof, z.infer<typeof PaymentProofSchema>>>,
  Expect<Equal<BuybackCase, z.infer<typeof BuybackCaseSchema>>>,
  Expect<Equal<Contract, z.infer<typeof ContractSchema>>>,
  Expect<Equal<ContractExpiryStatus, z.infer<typeof ContractExpiryStatusSchema>>>,
  Expect<Equal<ContractDocument, z.infer<typeof ContractDocumentSchema>>>,
  Expect<Equal<DashboardOverview, z.infer<typeof DashboardOverviewSchema>>>,
  Expect<Equal<InstallationWorkOrderSummary, z.infer<typeof InstallationWorkOrderSummarySchema>>>,
  Expect<Equal<InstallationWorkOrderChecklistItem, z.infer<typeof InstallationWorkOrderChecklistItemSchema>>>,
  Expect<Equal<InstallationWorkOrderAccessory, z.infer<typeof InstallationWorkOrderAccessorySchema>>>,
  Expect<Equal<InstallationWorkOrderEvidenceMetadata, z.infer<typeof InstallationWorkOrderEvidenceMetadataSchema>>>,
  Expect<Equal<InstallationWorkOrderDetails, z.infer<typeof InstallationWorkOrderDetailsSchema>>>,
  Expect<Equal<StoreLocation, z.infer<typeof StoreLocationSchema>>>,
  Expect<Equal<MachineInventoryItem, z.infer<typeof MachineInventoryItemSchema>>>,
  Expect<Equal<MachineDetail, z.infer<typeof MachineDetailSchema>>>,
  Expect<Equal<InventorySummary, z.infer<typeof InventorySummarySchema>>>,
  Expect<Equal<MaintenanceTicket, z.infer<typeof MaintenanceTicketSchema>>>,
  Expect<Equal<MaintenanceSchedule, z.infer<typeof MaintenanceScheduleSchema>>>,
  Expect<Equal<MachineHeartbeat, z.infer<typeof MachineHeartbeatSchema>>>,
  Expect<Equal<Notification, z.infer<typeof NotificationSchema>>>,
  Expect<Equal<NotificationUnreadCount, z.infer<typeof NotificationUnreadCountSchema>>>,
  Expect<Equal<Alert, z.infer<typeof AlertSchema>>>,
  Expect<Equal<GlobalRecipe, z.infer<typeof GlobalRecipeSchema>>>,
  Expect<Equal<RecipePublishRequest, z.infer<typeof RecipePublishRequestSchema>>>,
  Expect<Equal<TelemetryPoint, z.infer<typeof TelemetryPointSchema>>>,
  Expect<Equal<Tenant, z.infer<typeof TenantSchema>>>,
];
