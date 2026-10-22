import { doloresAxiosClient, parseDoloresResponse } from './client';
import {
  InventorySummarySchema,
  MachineDetailSchema,
  MachineHeartbeatSchema,
  MachineIdSchema,
  MachineInventorySchema,
  MaintenanceScheduleSchema,
  MaintenanceTicketListSchema,
} from '@/schemas/dolores/machines';
import type {
  InventorySummary,
  MachineDetail,
  MachineHeartbeat,
  MachineInventoryItem,
  MaintenanceSchedule,
  MaintenanceTicket,
} from '@/types/dolores/machines';

function requireMachineId(machineId: string): string {
  return MachineIdSchema.parse(machineId);
}

export const machinesApi = {
  list: async (signal?: AbortSignal): Promise<MachineInventoryItem[]> => {
    const response = await doloresAxiosClient.get<unknown>('/machines', { signal });
    return parseDoloresResponse(response.data, MachineInventorySchema);
  },

  getById: async (machineId: string, signal?: AbortSignal): Promise<MachineDetail> => {
    const response = await doloresAxiosClient.get<unknown>(
      '/machines/' + encodeURIComponent(requireMachineId(machineId)),
      { signal }
    );
    return parseDoloresResponse(response.data, MachineDetailSchema);
  },

  getInventorySummary: async (signal?: AbortSignal): Promise<InventorySummary> => {
    const response = await doloresAxiosClient.get<unknown>('/inventory/summary', { signal });
    return parseDoloresResponse(response.data, InventorySummarySchema);
  },

  listMaintenanceTickets: async (signal?: AbortSignal): Promise<MaintenanceTicket[]> => {
    const response = await doloresAxiosClient.get<unknown>('/maintenance-tickets', { signal });
    return parseDoloresResponse(response.data, MaintenanceTicketListSchema);
  },

  getMaintenanceSchedule: async (machineId: string, signal?: AbortSignal): Promise<MaintenanceSchedule> => {
    const response = await doloresAxiosClient.get<unknown>(
      '/machines/' + encodeURIComponent(requireMachineId(machineId)) + '/maintenance-schedule',
      { signal }
    );
    return parseDoloresResponse(response.data, MaintenanceScheduleSchema);
  },

  getLatestHeartbeat: async (machineId: string, signal?: AbortSignal): Promise<MachineHeartbeat> => {
    const response = await doloresAxiosClient.get<unknown>(
      '/telemetry-query/machines/' + encodeURIComponent(requireMachineId(machineId)) + '/heartbeats/latest',
      { signal }
    );
    return parseDoloresResponse(response.data, MachineHeartbeatSchema);
  },
};
