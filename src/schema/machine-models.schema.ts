import { z } from "zod";
import { MachineTypeSchema } from "./machines.schema";

export const MachineModelIdSchema = z.string().uuid();

const dateTimeSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().datetime({ local: true }),
]);

export const MachineModelSchema = z.object({
  id: MachineModelIdSchema,
  modelCode: z.string(),
  manufacturer: z.string(),
  displayName: z.string(),
  machineType: MachineTypeSchema,
  specifications: z.record(z.unknown()),
  active: z.boolean(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
}).passthrough();

export const MachineModelListSchema = z.array(MachineModelSchema);

export const CreateMachineModelRequestSchema = z.object({
  modelCode: z.string().trim().min(1),
  manufacturer: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  machineType: MachineTypeSchema,
  specifications: z.record(z.unknown()),
});

export const AssignMachineToModelRequestSchema = z.object({
  reason: z.string().trim().min(1),
});

export type MachineModel = z.infer<typeof MachineModelSchema>;
export type CreateMachineModelRequest = z.infer<typeof CreateMachineModelRequestSchema>;
export type AssignMachineToModelRequest = z.infer<typeof AssignMachineToModelRequestSchema>;
