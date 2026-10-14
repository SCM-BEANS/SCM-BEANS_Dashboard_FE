import { z } from "zod";

export const demoRecordSchema = z.object({
  schemaVersion: z.literal(2),
  id: z.string(),
  status: z.string(),
  version: z.number().int().positive(),
  payload: z.record(z.string()),
});

export type DemoRecord = z.infer<typeof demoRecordSchema>;

export const demoAccountSchema = z.object({
  name: z.string().trim().min(1), email: z.string().trim().email(),
  role: z.enum(["Khách hàng", "Moderator", "Technician"]),
  scope: z.string(), status: z.string(),
});

export const demoFieldsSchema = z.array(z.tuple([z.string(), z.string()]));
