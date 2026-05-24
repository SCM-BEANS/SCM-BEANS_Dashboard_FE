import { z } from 'zod';

export const MachineSchema = z.object({
  id: z.string(),
  location: z.string(),
  status: z.enum(['online', 'offline', 'error', 'maintenance']),
  totalShots: z.number().int().nonnegative(),
});

export type Machine = z.infer<typeof MachineSchema>;

export const TelemetrySchema = z.object({
  timestamp: z.string().datetime(),
  temperature: z.number(),
  pressure: z.number(),
  flowRate: z.number(),
});

export type Telemetry = z.infer<typeof TelemetrySchema>;
