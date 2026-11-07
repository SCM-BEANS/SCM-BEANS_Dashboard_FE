import { z } from "zod";
import { MachineIdSchema } from "@/schema/machines.schema";

const timestamp = z.union([z.string().datetime({ offset: true }), z.string().datetime({ local: true })]);
export const MachineCertificateStatusSchema = z.enum(["ACTIVE", "REVOKED", "EXPIRED"]);
export const CertificateListParamsSchema = z.object({
  page: z.number().int().min(0).max(2_147_483_647).default(0),
  size: z.number().int().min(1).max(100).default(50),
  status: MachineCertificateStatusSchema.optional(),
}).strict();

export const MachineCertificateSchema = z.object({
  id: z.string().uuid(), machineId: MachineIdSchema, ownerId: z.string().uuid().nullable(),
  commonName: z.string().min(1), fingerprint: z.string().min(1),
  organization: z.string().nullish(), spiffeId: z.string().nullish(), certificateSerial: z.string().nullish(),
  issuedAt: timestamp, expiresAt: timestamp, status: MachineCertificateStatusSchema,
  revokedAt: timestamp.nullish(), revokeReason: z.string().nullish(),
  createdAt: timestamp.nullish(), updatedAt: timestamp.nullish(),
}).strict();

export const MachineCertificateDetailSchema = MachineCertificateSchema.extend({
  clientCrtPem: z.string().min(1), caCrtPem: z.string().min(1),
}).strict();

export const MachineCertificatePageSchema = z.object({
  content: z.array(MachineCertificateSchema), number: z.number().int().nonnegative(),
  size: z.number().int().min(1).max(100), totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(), first: z.boolean(), last: z.boolean(),
}).refine((page) => page.content.length <= page.size && page.totalPages === Math.ceil(page.totalElements / page.size)
  && page.first === (page.number === 0) && page.last === (page.number >= page.totalPages - 1), {
  message: "Invalid certificate page metadata.",
});

export type MachineCertificate = z.infer<typeof MachineCertificateSchema>;
export type MachineCertificateDetail = z.infer<typeof MachineCertificateDetailSchema>;
export type MachineCertificatePage = z.infer<typeof MachineCertificatePageSchema>;
export type MachineCertificateStatus = z.infer<typeof MachineCertificateStatusSchema>;

