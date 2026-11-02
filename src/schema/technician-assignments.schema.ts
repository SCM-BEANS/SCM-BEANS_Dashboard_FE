import { z } from "zod";

export const TechnicianMachineAssignmentIdSchema = z.string().uuid();
export const TechnicianMachineAssignmentResponseSchema = z.object({
  id: TechnicianMachineAssignmentIdSchema,
  idaasUserId: z.string().uuid(),
  machineId: z.string().uuid(),
  ownerId: z.string().uuid(),
  active: z.boolean(),
  assignedAt: z.string().datetime({ offset: true }),
  revokedAt: z.string().datetime({ offset: true }).nullish(),
}).passthrough();

export type TechnicianMachineAssignmentResponse = z.infer<
  typeof TechnicianMachineAssignmentResponseSchema
>;
