import type { z } from 'zod';
import type {
  InventorySummarySchema,
  MachineDetailSchema,
  MachineHeartbeatSchema,
  MachineInventoryItemSchema,
  MaintenanceScheduleSchema,
  MaintenanceTicketSchema,
} from '@/schemas/dolores/machines';

export type MachineInventoryItem = z.infer<typeof MachineInventoryItemSchema>;
export type MachineDetail = z.infer<typeof MachineDetailSchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;
export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;
export type MachineHeartbeat = z.infer<typeof MachineHeartbeatSchema>;
