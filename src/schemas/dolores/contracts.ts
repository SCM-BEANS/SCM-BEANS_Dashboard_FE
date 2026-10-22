import { z } from 'zod';

const uuid = z.string().uuid();
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Expected an ISO date/time.');
const money = z.union([z.number(), z.string()]).nullish();

export const ContractStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'TERMINATED']);
export const ContractIdSchema = uuid;

export const ContractSchema = z.object({
  id: uuid,
  tenantId: uuid,
  machineId: uuid.nullish(),
  endDate: localDate,
  terms: z.string().nullish(),
  startDate: localDate.nullish(),
  monthlyRentalFee: money,
  machineTypeSnapshot: z.enum(['CONVENTIONAL', 'SMART_IOT']).nullish(),
  depositAmount: money,
  installationFee: money,
  paygUnitPrice: money,
  offlineLimitMinutes: z.number().int().nullish(),
  termsSnapshot: z.string().nullish(),
  status: ContractStatusSchema,
  legacyUnmapped: z.boolean(),
  terminatedAt: dateTime.nullish(),
  terminationReason: z.string().nullish(),
  terminatedBy: z.string().nullish(),
  returnNotes: z.string().nullish(),
});

// The backend returns an unpaged List<Contract> for each tenant.
export const ContractListSchema = z.array(ContractSchema);

export const ContractExpiryStatusSchema = z.object({
  contractId: uuid,
  expiryDate: localDate,
  reminderDate: localDate.nullish(),
  reminderSentAt: dateTime.nullish(),
  decision: z.enum(['CONTINUE', 'DO_NOT_CONTINUE', 'NO_RESPONSE']).nullish(),
  decidedBy: z.string().nullish(),
  decidedAt: dateTime.nullish(),
  expiryProcessedAt: dateTime.nullish(),
  terminationCaseId: uuid.nullish(),
});

export const ContractDocumentSchema = z.object({
  id: uuid,
  contractId: uuid,
  documentType: z.enum(['MAIN_CONTRACT', 'ADDENDUM', 'HANDOVER', 'TERMINATION', 'OTHER']),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().nonnegative(),
  sha256: z.string(),
  version: z.number().int().positive(),
  uploadedBy: z.string().nullish(),
  uploadedByRole: z.string().nullish(),
  uploadedAt: dateTime.nullish(),
  archivedAt: dateTime.nullish(),
});

export const ContractDocumentListSchema = z.array(ContractDocumentSchema);

