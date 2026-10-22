import { z } from 'zod';

const uuid = z.string().uuid();
const dateTime = z.string().datetime({ offset: true });

export const TelemetryPointSchema = z.object({
  timestamp: dateTime,
  field: z.string(),
  value: z.unknown(),
  tenantId: uuid,
  machineId: uuid,
  subState: z.string().nullish(),
});

export const TelemetryPointListSchema = z.array(TelemetryPointSchema);

