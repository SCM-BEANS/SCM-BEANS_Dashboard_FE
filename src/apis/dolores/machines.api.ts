import { requestDolores } from './client';
import {
  InventorySummarySchema,
  MachineDetailSchema,
  MachineHeartbeatSchema,
  MachineIdSchema,
  MachineInventorySchema,
  MaintenanceScheduleSchema,
  MaintenanceTicketListSchema,
} from '@/schemas/dolores/machines';

function requireMachineId(machineId: string): string {
  return MachineIdSchema.parse(machineId);
}

export const machinesApi = {
  list: (signal?: AbortSignal) =>
    requestDolores({ method: 'GET', url: '/machines', signal }, MachineInventorySchema),

  getById: (machineId: string, signal?: AbortSignal) =>
    requestDolores(
      { method: 'GET', url: '/machines/' + encodeURIComponent(requireMachineId(machineId)), signal },
      MachineDetailSchema
    ),

  getInventorySummary: (signal?: AbortSignal) =>
    requestDolores({ method: 'GET', url: '/inventory/summary', signal }, InventorySummarySchema),

  listMaintenanceTickets: (signal?: AbortSignal) =>
    requestDolores({ method: 'GET', url: '/maintenance-tickets', signal }, MaintenanceTicketListSchema),

  getMaintenanceSchedule: (machineId: string, signal?: AbortSignal) =>
    requestDolores(
      {
        method: 'GET',
        url: '/machines/' + encodeURIComponent(requireMachineId(machineId)) + '/maintenance-schedule',
        signal,
      },
      MaintenanceScheduleSchema
    ),

  getLatestHeartbeat: (machineId: string, signal?: AbortSignal) =>
    requestDolores(
      {
        method: 'GET',
        url: '/telemetry-query/machines/' + encodeURIComponent(requireMachineId(machineId)) + '/heartbeats/latest',
        signal,
      },
      MachineHeartbeatSchema
    ),
};
