'use client';

import { useQuery } from '@tanstack/react-query';
import { machinesApi } from '@/apis/dolores/machines.api';
import { MachineIdSchema } from '@/schemas/dolores/machines';
import { retryDoloresRead } from '@/hooks/dolores/queryPolicy';

export const machineQueryKeys = {
  all: ['dolores', 'machines'] as const,
  list: () => [...machineQueryKeys.all, 'list'] as const,
  inventorySummary: () => [...machineQueryKeys.all, 'inventory-summary'] as const,
  detail: (machineId: string) => [...machineQueryKeys.all, 'detail', machineId] as const,
  schedule: (machineId: string) => [...machineQueryKeys.all, machineId, 'maintenance-schedule'] as const,
  heartbeat: (machineId: string) => [...machineQueryKeys.all, machineId, 'heartbeat'] as const,
  maintenanceTickets: () => ['dolores', 'maintenance-tickets'] as const,
};

export function isMachineId(machineId: string): boolean {
  return MachineIdSchema.safeParse(machineId).success;
}

export function useMachineInventory() {
  return useQuery({
    queryKey: machineQueryKeys.list(),
    queryFn: ({ signal }) => machinesApi.list(signal),
    retry: retryDoloresRead,
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: machineQueryKeys.inventorySummary(),
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
    retry: retryDoloresRead,
  });
}

export function useMachineDetail(machineId: string) {
  const validId = isMachineId(machineId);
  return useQuery({
    queryKey: machineQueryKeys.detail(machineId),
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId,
    retry: retryDoloresRead,
  });
}

export function useMachineMaintenanceSchedule(machineId: string) {
  const validId = isMachineId(machineId);
  return useQuery({
    queryKey: machineQueryKeys.schedule(machineId),
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId, signal),
    enabled: validId,
    retry: retryDoloresRead,
  });
}

export function useMachineHeartbeat(machineId: string, enabled: boolean) {
  const validId = isMachineId(machineId);
  return useQuery({
    queryKey: machineQueryKeys.heartbeat(machineId),
    queryFn: ({ signal }) => machinesApi.getLatestHeartbeat(machineId, signal),
    enabled: validId && enabled,
    retry: retryDoloresRead,
  });
}

export function useMachineMaintenanceTickets(enabled: boolean) {
  return useQuery({
    queryKey: machineQueryKeys.maintenanceTickets(),
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets(signal),
    enabled,
    retry: retryDoloresRead,
  });
}
