import type { z } from 'zod';
import type { DashboardOverviewSchema } from '@/schemas/dolores/dashboard';

export type DashboardOverview = z.infer<typeof DashboardOverviewSchema>;
