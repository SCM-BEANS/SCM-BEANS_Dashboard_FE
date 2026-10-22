import type { z } from 'zod';
import type { TelemetryPointSchema } from '@/schemas/dolores/telemetry';

export type TelemetryPoint = z.infer<typeof TelemetryPointSchema>;
