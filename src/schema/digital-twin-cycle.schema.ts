import { z } from "zod";

export const DigitalTwinCyclePhaseSchema = z.enum([
  "idle",
  "grinding",
  "dosing",
  "closing",
  "tamping",
  "opening",
  "ejecting",
  "scraping",
  "extraction",
  "complete",
  "fault",
]);

export type DigitalTwinCyclePhase = z.infer<
  typeof DigitalTwinCyclePhaseSchema
>;

export const DigitalTwinCycleStatusSchema = z.enum([
  "idle",
  "running",
  "complete",
  "fault",
]);

export type DigitalTwinCycleStatus = z.infer<
  typeof DigitalTwinCycleStatusSchema
>;

export const DigitalTwinCycleEventSchema = z.object({
  machineId: z.string().min(1),
  cycleId: z.string().min(1),
  sequence: z.number().int().nonnegative(),
  phase: DigitalTwinCyclePhaseSchema,
  progress: z.number().finite().min(0).max(1),
  emittedAt: z.string().datetime(),
  source: z.enum(["test", "server"]),
});

export type DigitalTwinCycleEvent = z.infer<
  typeof DigitalTwinCycleEventSchema
>;
