import type { z } from 'zod';
import type {
  InstallationWorkOrderAccessorySchema,
  InstallationWorkOrderChecklistItemSchema,
  InstallationWorkOrderDetailsSchema,
  InstallationWorkOrderEvidenceMetadataSchema,
  InstallationWorkOrderSummarySchema,
} from '@/schemas/dolores/installationWorkOrders';

export type InstallationWorkOrderSummary = z.infer<typeof InstallationWorkOrderSummarySchema>;
export type InstallationWorkOrderChecklistItem = z.infer<typeof InstallationWorkOrderChecklistItemSchema>;
export type InstallationWorkOrderAccessory = z.infer<typeof InstallationWorkOrderAccessorySchema>;
export type InstallationWorkOrderEvidenceMetadata = z.infer<typeof InstallationWorkOrderEvidenceMetadataSchema>;
export type InstallationWorkOrderDetails = z.infer<typeof InstallationWorkOrderDetailsSchema>;
