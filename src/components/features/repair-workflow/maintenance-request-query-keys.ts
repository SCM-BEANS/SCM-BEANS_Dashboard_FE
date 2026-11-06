import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";

export const maintenanceRequestDetailQueryKey = (role: RepairWorkflowRole, requestId: string) =>
  ["dolores", "repair-workflow", querySubject(role), "request", requestId] as const;

export const maintenanceCustodyEventsQueryKey = (requestId: string) =>
  ["dolores", "maintenance-requests", "custody-events", requestId] as const;
